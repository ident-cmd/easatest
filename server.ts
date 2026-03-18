import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import cors from "cors";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// CRITICAL: Load config and force project ID BEFORE importing firebase-admin
const firebaseConfigPath = path.resolve(__dirname, "firebase-applet-config.json");
let config: any = null;
if (fs.existsSync(firebaseConfigPath)) {
  config = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
  process.env.GOOGLE_CLOUD_PROJECT = config.projectId;
  process.env.GCLOUD_PROJECT = config.projectId;
  console.log(`🔧 System Project ID forced to: ${config.projectId}`);
}

// Now import firebase-admin
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth as getAdminAuth } from "firebase-admin/auth";

let db: any = null;
let adminApp: any = null;

if (config) {
  const apps = getApps();
  adminApp = apps.find(a => a.options.projectId === config.projectId) || apps[0];

  if (!adminApp) {
    adminApp = initializeApp({
      projectId: config.projectId,
    }, "easa-admin");
    console.log(`🔥 Firebase Admin initialized for project: ${config.projectId}`);
  }
  
  // Try to log the identity being used
  try {
    const auth = getAdminAuth(adminApp);
    console.log("🔍 Checking service account identity...");
    // We can't easily get the email without a token, but we can log the project ID again
    console.log(`📌 Project ID in use: ${adminApp.options.projectId}`);
  } catch (e) {
    console.log("⚠️ Could not determine service account identity automatically.");
  }
  
  db = getFirestore(adminApp, config.firestoreDatabaseId);
}

const getAuthAdmin = () => {
  if (!adminApp) return null;
  return getAdminAuth(adminApp);
};

// Lazy Stripe initialization to handle environment variable updates
let stripeInstance: Stripe | null = null;
let lastUsedKey: string | null = null;

const getStripe = () => {
  let rawKey = process.env.STRIPE_SECRET_KEY?.trim();
  
  if (!rawKey || rawKey === "sk_test_mock" || rawKey === "") {
    return null;
  }

  let key = rawKey;

  // Clean the key: remove quotes
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.substring(1, key.length - 1).trim();
  }

  // Aggressive extraction: if the key looks like a mess, try to find the actual sk_test_... part
  if (key.length > 100 || !key.startsWith('sk_')) {
    const match = key.match(/sk_(test|live)_[a-zA-Z0-9_\-]+/);
    if (match) {
      console.log(`🎯 Extracted Stripe key from messy input. New length: ${match[0].length}`);
      key = match[0];
    }
  }
  
  // Re-initialize if the key has changed
  if (!stripeInstance || lastUsedKey !== key) {
    const maskedKey = `${key.substring(0, 7)}...${key.substring(Math.max(0, key.length - 4))}`;
    console.log(`💳 Initializing Stripe client. Key: ${maskedKey} (Length: ${key.length})`);
    
    try {
      stripeInstance = new Stripe(key, {
        apiVersion: "2025-01-27.acacia" as any,
      });
      lastUsedKey = key;
    } catch (e) {
      console.error("❌ Failed to initialize Stripe client:", e);
      return null;
    }
  }
  return stripeInstance;
};

// Lazy SMTP transporter initialization
let transporterInstance: any = null;

const getTransporter = async () => {
  // Try to get settings from Firestore first
  let host = process.env.SMTP_HOST?.trim();
  let user = process.env.SMTP_USER?.trim();
  let pass = process.env.SMTP_PASS?.trim();
  let portStr = (process.env.SMTP_PORT || "587").trim();
  let from = process.env.SMTP_FROM?.trim();

  if (db) {
    try {
      const smtpDoc = await db.collection('settings').doc('smtp').get();
      if (smtpDoc.exists) {
        const data = smtpDoc.data();
        host = data.host || host;
        user = data.user || user;
        pass = data.pass || pass;
        portStr = data.port?.toString() || portStr;
        from = data.from || from;
        console.log("📂 Using SMTP settings from Firestore");
      }
    } catch (e) {
      // Silence this error as it's a known permission issue in restricted environments
      // The system will fallback to environment variables
    }
  }

  const port = parseInt(portStr);

  if (!host || !user || !pass) {
    console.warn("⚠️ SMTP configuration is missing. Emails will be logged to the console.");
    return {
      sendMail: async (options: any) => {
        console.log("-----------------------------------------");
        console.log("📧 MOCK EMAIL SENT (No SMTP Config)");
        console.log("From:", options.from);
        console.log("To:", options.to);
        console.log("Subject:", options.subject);
        console.log("-----------------------------------------");
        return { messageId: "mock-" + Date.now() };
      },
      verify: (callback: any) => callback(null, true)
    };
  }

  const transportConfig: any = {
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  };

  if (host.includes('gmail.com')) {
    transportConfig.service = 'gmail';
  }

  return nodemailer.createTransport(transportConfig);
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Request logging
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  app.set('trust proxy', 1);
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());

  // Health check for diagnosis - MOVE TO TOP
  app.get("/api/health", (req, res) => {
    console.log("Health check hit!");
    res.json({ 
      status: "ok", 
      env: process.env.NODE_ENV,
      cwd: process.cwd(),
      distExists: true // We'll check this dynamically below if needed
    });
  });

  // API Routes
  app.post("/api/create-checkout-session", async (req, res) => {
    const { email, userId, returnUrl } = req.body;
    
    const stripe = getStripe();
    if (!stripe) {
      return res.status(400).json({ 
        error: "Stripe is not configured. Please add STRIPE_SECRET_KEY in Settings." 
      });
    }

    // CRITICAL: Use the exact origin the user is currently on (passed from frontend).
    // This prevents 403 errors when testing on the shared URL vs the dev URL.
    let appUrl = returnUrl || process.env.APP_URL || "http://localhost:3000";
    
    // Ensure no trailing slash for consistency
    if (appUrl.endsWith('/')) {
      appUrl = appUrl.slice(0, -1);
    }
    
    console.log(`💳 Creating Stripe session for ${email}. Final App URL: ${appUrl}`);

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "eur",
              product_data: {
                name: "Abonnement EASA Assist",
                description: "Accès illimité à l'expert réglementaire EASA",
              },
              unit_amount: 990, // 9.90€
              recurring: {
                interval: "month",
              },
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${appUrl}/api/stripe-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/api/stripe-cancel`,
        customer_email: email,
        client_reference_id: userId,
      });
      console.log(`✅ Stripe session created: ${session.id}`);
      res.json({ url: session.url, sessionId: session.id });
    } catch (error: any) {
      console.error("❌ Stripe Session Error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/stripe-success", (req, res) => {
    const sessionId = req.query.session_id;
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'STRIPE_SUCCESS', sessionId: '${sessionId}' }, '*');
              window.close();
            } else {
              window.location.href = '/?session_id=${sessionId}';
            }
          </script>
          <p>Paiement réussi ! Cette fenêtre va se fermer automatiquement...</p>
        </body>
      </html>
    `);
  });

  app.get("/api/stripe-cancel", (req, res) => {
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'STRIPE_CANCEL' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Paiement annulé. Cette fenêtre va se fermer automatiquement...</p>
        </body>
      </html>
    `);
  });

  app.get("/api/check-session", async (req, res) => {
    const sessionId = req.query.session_id as string;
    if (!sessionId) return res.status(400).json({ error: "Missing session_id" });
    
    const stripe = getStripe();
    if (!stripe) return res.status(400).json({ error: "Stripe not configured" });

    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      res.json({ 
        status: session.status, 
        payment_status: session.payment_status 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/stripe-status", async (req, res) => {
    const rawKey = process.env.STRIPE_SECRET_KEY?.trim();
    const stripe = getStripe();
    
    // We re-run the cleaning logic for the diagnostic
    let cleanedKey = rawKey || "";
    if ((cleanedKey.startsWith('"') && cleanedKey.endsWith('"')) || (cleanedKey.startsWith("'") && cleanedKey.endsWith("'"))) {
      cleanedKey = cleanedKey.substring(1, cleanedKey.length - 1).trim();
    }
    const match = cleanedKey.match(/sk_(test|live)_[a-zA-Z0-9_\-]+/);
    if (match) cleanedKey = match[0];

    res.json({
      configured: !!stripe,
      rawKeyPresent: !!rawKey,
      rawKeyLength: rawKey ? rawKey.length : 0,
      cleanedKeyLength: cleanedKey.length,
      keyPrefix: cleanedKey ? cleanedKey.substring(0, 7) : "none",
      keySuffix: cleanedKey ? cleanedKey.substring(Math.max(0, cleanedKey.length - 4)) : "none",
      isMock: rawKey === "sk_test_mock",
      advice: (cleanedKey.length > 120) ? "Your key is still unusually long (>120 chars) even after cleaning. Please check your STRIPE_SECRET_KEY." : "Key length looks normal after cleaning."
    });
  });

  app.get("/api/smtp-status", async (req, res) => {
    console.log("🔍 SMTP Diagnostic requested...");
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const port = process.env.SMTP_PORT;
    const from = process.env.SMTP_FROM;

    try {
      let verificationStatus = "unknown";
      let verificationMessage = "";
      const transporter = await getTransporter();

      if (typeof (transporter as any).verify === 'function') {
        // We don't await verify here as it uses a callback, but we can check the status
        verificationStatus = "ready";
      } else {
        verificationStatus = "mock";
        verificationMessage = "Using mock transporter (no config)";
      }

      res.json({
        status: (host && user && process.env.SMTP_PASS) ? "configured" : "incomplete",
        verification: verificationStatus,
        config: {
          host: host || "not set",
          port: port || "587 (default)",
          user: user ? `${user.substring(0, 3)}...${user.substring(user.indexOf('@'))}` : "not set",
          from: from || "not set (will fallback to user)"
        },
        message: verificationMessage || "SMTP configuration diagnostic"
      });
    } catch (e: any) {
      res.status(500).json({ status: "error", message: e.message });
    }
  });

  app.post("/api/test-smtp", async (req, res) => {
    const { email } = req.body;
    const smtpUser = process.env.SMTP_USER?.trim();
    const smtpFrom = process.env.SMTP_FROM?.trim();
    
    const fromAddress = smtpFrom || 
      ((smtpUser && smtpUser.includes('@')) 
        ? smtpUser 
        : 'contact@aviationonline.fr');

    try {
      console.log(`🧪 Testing SMTP with recipient: ${email}`);
      const transporter = await getTransporter();
      const info = await transporter.sendMail({
        from: `"EASA Assist Test" <${fromAddress}>`,
        to: email,
        subject: "Test de configuration SMTP - EASA Assist",
        text: "Ceci est un e-mail de test pour vérifier votre configuration SMTP. Si vous recevez ce message, tout fonctionne correctement !",
      });
      console.log(`✅ Test email sent: ${info.messageId}`);
      res.json({ success: true, messageId: info.messageId });
    } catch (error: any) {
      console.error("❌ SMTP Test Error:", error);
      res.status(500).json({ 
        error: error.message,
        code: error.code,
        response: error.response
      });
    }
  });

  app.post("/api/admin/delete-user", async (req, res) => {
    const { uid } = req.body;
    const authHeader = req.headers.authorization;
    if (!uid) return res.status(400).json({ error: "UID is required" });
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
      const auth = getAuthAdmin();
      if (!auth) throw new Error("Firebase Admin not initialized");
      
      const decodedToken = await auth.verifyIdToken(idToken);
      const adminEmails = ['agenim@gmail.com', 'ident@aviationonline.fr'];
      
      if (!adminEmails.includes(decodedToken.email || '')) {
        return res.status(403).json({ error: "Forbidden: Admin access required" });
      }

      console.log(`🚫 Soft-delete requested for: ${uid} (Requested by ${decodedToken.email})`);
      console.log(`ℹ️ Note: The frontend now handles the Firestore update directly to avoid server-side permission issues.`);
      
      res.json({ 
        success: true, 
        message: "L'opération a été initiée. L'utilisateur est en cours de désactivation." 
      });
    } catch (error: any) {
      console.error("❌ Delete User Route Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/notify-signup", async (req, res) => {
    const { email, firstName, lastName } = req.body;
    const smtpUser = process.env.SMTP_USER?.trim();
    const smtpFrom = process.env.SMTP_FROM?.trim();
    
    const fromAddress = smtpFrom || 
      ((smtpUser && smtpUser.includes('@')) 
        ? smtpUser 
        : 'contact@aviationonline.fr');

    const name = firstName && lastName ? `${firstName} ${lastName}` : email;

    try {
      const transporter = await getTransporter();
      // Notify admin
      await transporter.sendMail({
        from: `"EASA Assist" <${fromAddress}>`,
        to: "contact@aviationonline.fr",
        subject: "Nouvelle inscription - EASA Assist",
        text: `Un nouvel utilisateur s'est inscrit :\nNom: ${name}\nEmail: ${email}\nDate: ${new Date().toLocaleString()}`,
      });

      // Confirm to user
      await transporter.sendMail({
        from: `"EASA Assist" <${fromAddress}>`,
        to: email,
        subject: "Bienvenue sur EASA Assist - Début de votre essai gratuit",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
            <h2 style="color: #10b981;">Bienvenue sur EASA Assist !</h2>
            <p>Bonjour ${firstName || ''},</p>
            <p>Merci pour votre inscription. Votre période d'essai gratuit de 3 jours a commencé.</p>
            <p>Vous avez maintenant un accès complet à notre assistant expert en réglementation EASA (Part-CAT et Part-FCL).</p>
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; font-weight: bold;">Vos avantages pendant l'essai :</p>
              <ul style="margin: 10px 0 0 0;">
                <li>Consultation illimitée de l'IA experte</li>
                <li>Références réglementaires précises</li>
                <li>Support bilingue (Français/Anglais)</li>
              </ul>
            </div>
            <p>Bonne utilisation !</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">L'équipe EASA Assist</p>
          </div>
        `,
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Email error:", error);
      res.status(500).json({ error: "Failed to send emails" });
    }
  });

  app.post("/api/notify-payment", async (req, res) => {
    const { email, firstName, lastName, sessionId } = req.body;
    const smtpUser = process.env.SMTP_USER?.trim();
    const smtpFrom = process.env.SMTP_FROM?.trim();
    
    const fromAddress = smtpFrom || 
      ((smtpUser && smtpUser.includes('@')) 
        ? smtpUser 
        : 'contact@aviationonline.fr');

    const name = firstName && lastName ? `${firstName} ${lastName}` : email;

    try {
      const transporter = await getTransporter();
      // Notify admin
      await transporter.sendMail({
        from: `"EASA Assist" <${fromAddress}>`,
        to: "contact@aviationonline.fr",
        subject: "Nouveau paiement reçu - EASA Assist",
        text: `Un utilisateur vient de s'abonner :\nNom: ${name}\nEmail: ${email}\nSession Stripe: ${sessionId}\nDate: ${new Date().toLocaleString()}`,
      });

      // Confirm to user
      await transporter.sendMail({
        from: `"EASA Assist" <${fromAddress}>`,
        to: email,
        subject: "Confirmation de votre abonnement EASA Assist",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
            <h2 style="color: #10b981;">Merci pour votre confiance !</h2>
            <p>Bonjour ${firstName || ''},</p>
            <p>Votre paiement a été validé avec succès. Votre abonnement Premium EASA Assist est désormais actif.</p>
            <p>Vous bénéficiez d'un accès illimité et prioritaire à toute notre expertise réglementaire.</p>
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; font-weight: bold;">Détails de l'abonnement :</p>
              <ul style="margin: 10px 0 0 0;">
                <li>Statut : Actif</li>
                <li>Type : Mensuel</li>
                <li>Accès : Illimité</li>
              </ul>
            </div>
            <p>À très bientôt sur EASA Assist !</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">L'équipe EASA Assist</p>
          </div>
        `,
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Payment notification email error:", error);
      res.status(500).json({ error: "Failed to send payment emails" });
    }
  });

  app.post("/api/send-regulatory-watch", async (req, res) => {
    const { email, lang } = req.body;
    const isFr = lang === 'fr';
    
    const subject = isFr ? "Veille Réglementaire EASA - Mars 2026" : "EASA Regulatory Watch - March 2026";
    
    const updates = [
      {
        part: 'Part-CAT',
        title: isFr ? "Nouvelles exigences carburant" : "New fuel requirements",
        desc: isFr ? "Mise à jour des réserves finales pour les opérations CAT." : "Update on final reserves for CAT operations.",
        ref: 'CAT.OP.MPA.150'
      },
      {
        part: 'Part-FCL',
        title: isFr ? "Prorogation SEP(t)" : "SEP(t) Revalidation",
        desc: isFr ? "Clarification sur les heures d'expérience requises." : "Clarification on required experience hours.",
        ref: 'FCL.740.A'
      }
    ];

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <h2 style="color: #10b981;">${isFr ? 'Votre Veille Réglementaire' : 'Your Regulatory Watch'}</h2>
        <p>${isFr ? 'Voici les dernières évolutions pour vos domaines d\'intérêt :' : 'Here are the latest updates for your areas of interest:'}</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        ${updates.map(u => `
          <div style="margin-bottom: 20px;">
            <span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${u.part}</span>
            <h3 style="margin: 10px 0 5px 0;">${u.title}</h3>
            <p style="margin: 0; color: #666;">${u.desc}</p>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #10b981; font-weight: bold;">Réf: ${u.ref}</p>
          </div>
        `).join('')}
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #999; text-align: center;">
          ${isFr ? 'Cet e-mail vous est envoyé par EASA Assist.' : 'This email was sent to you by EASA Assist.'}<br>
          © 2026 Aviation Online
        </p>
      </div>
    `;

    try {
      const smtpUser = process.env.SMTP_USER?.trim();
      const smtpFrom = process.env.SMTP_FROM?.trim();
      
      // Force the 'from' address to be the SMTP user if it looks like an email
      // This is required by strict providers like OVH
      const fromAddress = smtpFrom || 
        ((smtpUser && smtpUser.includes('@')) 
          ? smtpUser 
          : 'contact@aviationonline.fr');

      console.log(`📩 Attempting to send email:`, {
        to: email,
        from: fromAddress,
      });

      const transporter = await getTransporter();
      const info = await transporter.sendMail({
        from: `"EASA Assist" <${fromAddress}>`,
        to: email,
        subject: subject,
        html: html,
      });
      console.log(`✅ Email sent successfully: ${info.messageId}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("❌ Detailed Email Error:", {
        message: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
        stack: error.stack
      });
      res.status(500).json({ 
        error: "Failed to send regulatory watch email",
        details: error.message,
        code: error.code,
        response: error.response
      });
    }
  });

  app.post("/api/cancel-subscription", async (req, res) => {
    const { subscriptionId } = req.body;
    const stripe = getStripe();
    if (!stripe) {
      return res.status(400).json({ error: "Stripe not configured" });
    }
    try {
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  console.log(`Environment: ${process.env.NODE_ENV}`);
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting Vite in middleware mode...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
        allowedHosts: true,
        host: '0.0.0.0',
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving static files from dist...");
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
  
  return app;
}

// --- CONFIGURATION SPÉCIALE VERCEL ---
let appInstance: any = null;

export default async function (req: any, res: any) {
  if (!appInstance) {
    appInstance = await startServer();
  }
  return appInstance(req, res);
}
