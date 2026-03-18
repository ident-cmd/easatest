import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  auth, 
  db, 
  googleProvider, 
  OperationType, 
  handleFirestoreError,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail
} from './firebase';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User,
  updateEmail,
  updatePassword
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  getDocs,
  deleteDoc,
  updateDoc,
  setDoc, 
  collection, 
  onSnapshot, 
  query, 
  where,
  orderBy, 
  limit 
} from 'firebase/firestore';
import { 
  Plane, 
  Shield, 
  BookOpen, 
  Bell, 
  BellOff, 
  Languages, 
  LogOut, 
  Send, 
  Menu, 
  X,
  ChevronRight,
  Info,
  AlertCircle,
  Mail,
  Lock,
  UserPlus,
  CheckCircle2,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { Language, UserProfile, Message, RegulatoryUpdate } from './types';

let ai: GoogleGenAI | null = null;

const TRANSLATIONS = {
  fr: {
    title: "EASA Assist",
    subtitle: "Expert Part-CAT & Part-FCL",
    loginGoogle: "Se connecter avec Google",
    loginEmail: "Se connecter avec Email",
    signupEmail: "Créer un compte",
    emailPlaceholder: "votre@email.com",
    passwordPlaceholder: "Mot de passe",
    backToOptions: "Retour aux options",
    logout: "Déconnexion",
    welcome: "Bienvenue sur EASA Assist",
    description: "Votre assistant réglementaire professionnel pour l'aviation civile européenne.",
    placeholder: "Posez votre question sur Part-CAT ou Part-FCL...",
    notificationsOn: "Notifications activées",
    notificationsOff: "Notifications désactivées",
    updates: "Dernières évolutions",
    noUpdates: "Aucune mise à jour récente.",
    systemInstruction: "Tu es un expert en réglementation EASA (Part-CAT et Part-FCL). Structure tes réponses ainsi : 1. Une synthèse simple et claire en quelques phrases. 2. Une réponse détaillée et aérée avec des paragraphes distincts. Cite toujours les références réglementaires précises (ex: CAT.OP.MPA.100). IMPORTANT : N'utilise JAMAIS de notation mathématique LaTeX (comme $V_{AT}$ ou \\( ... \\)). Utilise du texte standard lisible (ex: Vat au lieu de $V_{AT}$). Utilise le Markdown pour la mise en forme (gras, listes) afin de rendre la lecture agréable. Réponds dans la langue de l'utilisateur.",
    error: "Une erreur est survenue.",
    loading: "Analyse en cours...",
    subscribe: "S'abonner aux alertes réglementaires",
    unsubscribe: "Se désabonner des alertes",
    connectedAs: "Connecté en tant que",
    verificationSent: "Un e-mail de confirmation a été envoyé à votre adresse. Veuillez vérifier votre boîte de réception.",
    resendEmail: "Renvoyer l'e-mail",
    emailResent: "E-mail renvoyé avec succès !",
    checkSpam: "Pensez à vérifier vos courriers indésirables (spams).",
    trialTitle: "Essai gratuit de 3 jours",
    trialDesc: "Accédez à toute l'expertise EASA gratuitement pendant 72 heures.",
    startTrial: "Démarrer mon essai gratuit",
    subscriptionTitle: "Abonnement Premium",
    subscriptionDesc: "9,90€ / mois pour un accès illimité et des alertes en temps réel.",
    subscribeNow: "S'abonner maintenant",
    trialExpired: "Votre période d'essai est terminée",
    trialExpiredDesc: "Pour continuer à utiliser EASA Assist, veuillez souscrire à notre abonnement mensuel.",
    cancelSubscription: "Résilier mon abonnement",
    subscriptionCancelled: "Votre abonnement a été résilié et prendra fin à la date d'échéance.",
    heroTitle: "L'expertise EASA à portée de main",
    heroSubtitle: "La solution de référence pour les pilotes et opérateurs aériens.",
    feature1: "Conformité Part-CAT & Part-FCL",
    feature2: "Réponses instantanées et sourcées",
    feature3: "Alertes réglementaires personnalisées",
    firstName: "Prénom",
    lastName: "Nom",
    address: "Adresse",
    zipCode: "Code Postal",
    city: "Ville",
    country: "Pays",
    registrationForm: "Formulaire d'inscription",
    uniquePrice: "Tarif Unique",
    launchOffer: "Offre de Lancement",
    threeDaysTrial: "3 Jours d'Essai Gratuits",
    regulatoryExpertise: "Expertise Réglementaire",
    support247: "Support 24/7",
    premiumMember: "Membre Premium",
    trialPeriod: "Période d'Essai",
    systemReady: "Système Prêt",
    exampleCat: "Quelles sont les exigences pour le carburant de réserve ?",
    exampleFcl: "Quelles sont les conditions de prorogation d'une SEP(t) ?",
    accountCreated: "Compte créé !",
    professionalAssistant: "Assistant Réglementaire Professionnel",
    noCommitment: "Sans engagement",
    backToHome: "Retour à l'accueil",
    chooseLanguage: "Choisir la langue",
    legalNotice: "Mentions Légales",
    termsOfService: "CGU",
    legalNoticeTitle: "Mentions Légales",
    termsOfServiceTitle: "Conditions Générales d'Utilisation",
    adminPanel: "Panneau d'Administration",
    smtpSettings: "Paramètres SMTP",
    userList: "Liste des Utilisateurs",
    changeProfile: "Changer Email/Pass",
    save: "Enregistrer",
    host: "Hôte",
    port: "Port",
    userSmtp: "Utilisateur",
    passSmtp: "Mot de passe",
    fromSmtp: "Expéditeur",
    newEmail: "Nouvel Email",
    newPassword: "Nouveau Mot de passe",
    update: "Mettre à jour",
    freeUsers: "Inscrits Gratuits",
    paidUsers: "Abonnés Payants",
    name: "Nom",
    email: "Email",
    sendExampleEmail: "M'envoyer un mail exemple (Veille)",
    emailSent: "E-mail envoyé !",
    delete: "Supprimer",
    confirmDelete: "Confirmer la suppression ?",
    trialEndingSoon: "Votre essai se termine bientôt",
    trialEndingSoonDesc: "Il vous reste moins de 24 heures. Abonnez-vous maintenant pour ne pas perdre l'accès.",
    errorEmailInUse: "Cet e-mail est déjà utilisé (possiblement sur une autre application du même projet). Veuillez vous connecter à la place.",
    errorInvalidEmail: "Adresse e-mail invalide.",
    errorWeakPassword: "Le mot de passe est trop faible.",
    errorWrongPassword: "Mot de passe incorrect ou utilisateur non trouvé.",
    errorUserNotFound: "Utilisateur non trouvé.",
    errorGenericAuth: "Erreur d'authentification.",
    alreadyHaveAccount: "Déjà un compte ? Se connecter",
    noAccount: "Pas de compte ? S'inscrire",
    forgotPassword: "Mot de passe oublié ?",
    resetEmailSent: "E-mail de réinitialisation envoyé ! Vérifiez votre boîte de réception.",
    backToLogin: "Retour à la connexion",
    sendResetLink: "Envoyer le lien de réinitialisation"
  },
  en: {
    title: "EASA Assist",
    subtitle: "Part-CAT & Part-FCL Expert",
    loginGoogle: "Sign in with Google",
    loginEmail: "Sign in with Email",
    signupEmail: "Create account",
    emailPlaceholder: "your@email.com",
    passwordPlaceholder: "Password",
    backToOptions: "Back to options",
    logout: "Sign Out",
    welcome: "Welcome to EASA Assist",
    description: "Your professional regulatory assistant for European civil aviation.",
    placeholder: "Ask your question about Part-CAT or Part-FCL...",
    notificationsOn: "Notifications enabled",
    notificationsOff: "Notifications disabled",
    updates: "Latest Updates",
    noUpdates: "No recent updates.",
    systemInstruction: "You are an expert in EASA regulations (Part-CAT and Part-FCL). Structure your responses as follows: 1. A simple and clear synthesis in a few sentences. 2. A detailed and airy response with distinct paragraphs. Always cite precise regulatory references (e.g., CAT.OP.MPA.100). IMPORTANT: NEVER use LaTeX math notation (like $V_{AT}$ or \\( ... \\)). Use standard readable text (e.g., Vat instead of $V_{AT}$). Use Markdown for formatting (bold, lists) to make reading pleasant. Respond in the user's language.",
    error: "An error occurred.",
    loading: "Analyzing...",
    subscribe: "Subscribe to regulatory alerts",
    unsubscribe: "Unsubscribe from alerts",
    connectedAs: "Signed in as",
    verificationSent: "A confirmation email has been sent to your address. Please check your inbox.",
    resendEmail: "Resend email",
    emailResent: "Email resent successfully!",
    checkSpam: "Don't forget to check your spam folder.",
    trialTitle: "3-Day Free Trial",
    trialDesc: "Access all EASA expertise for free for 72 hours.",
    startTrial: "Start my free trial",
    subscriptionTitle: "Premium Subscription",
    subscriptionDesc: "9.90€ / month for unlimited access and real-time alerts.",
    subscribeNow: "Subscribe Now",
    trialExpired: "Your trial period has ended",
    trialExpiredDesc: "To continue using EASA Assist, please subscribe to our monthly plan.",
    cancelSubscription: "Cancel my subscription",
    subscriptionCancelled: "Your subscription has been cancelled and will end at the next billing date.",
    heroTitle: "EASA Expertise at Your Fingertips",
    heroSubtitle: "The reference solution for pilots and aircraft operators.",
    feature1: "Part-CAT & Part-FCL Compliance",
    feature2: "Instant and Sourced Answers",
    feature3: "Personalized Regulatory Alerts",
    firstName: "First Name",
    lastName: "Last Name",
    address: "Address",
    zipCode: "Zip Code",
    city: "City",
    country: "Country",
    registrationForm: "Registration Form",
    uniquePrice: "Unique Price",
    launchOffer: "Launch Offer",
    threeDaysTrial: "3-Day Free Trial",
    regulatoryExpertise: "Regulatory Expertise",
    support247: "24/7 Support",
    premiumMember: "Premium Member",
    trialPeriod: "Trial Period",
    systemReady: "System Ready",
    exampleCat: "What are the requirements for reserve fuel?",
    exampleFcl: "What are the conditions for revalidating a SEP(t)?",
    accountCreated: "Account created!",
    professionalAssistant: "Professional Regulatory Assistant",
    noCommitment: "No commitment",
    backToHome: "Back to Home",
    chooseLanguage: "Choose Language",
    legalNotice: "Legal Notice",
    termsOfService: "Terms of Service",
    legalNoticeTitle: "Legal Notice",
    termsOfServiceTitle: "Terms and Conditions",
    adminPanel: "Admin Panel",
    smtpSettings: "SMTP Settings",
    userList: "User List",
    changeProfile: "Change Email/Pass",
    save: "Save",
    host: "Host",
    port: "Port",
    userSmtp: "User",
    passSmtp: "Password",
    fromSmtp: "From",
    newEmail: "New Email",
    newPassword: "New Password",
    update: "Update",
    freeUsers: "Free Users",
    paidUsers: "Paid Subscribers",
    name: "Name",
    email: "Email",
    sendExampleEmail: "Send me an example email (Watch)",
    emailSent: "Email sent!",
    delete: "Delete",
    confirmDelete: "Confirm deletion?",
    trialEndingSoon: "Your trial is ending soon",
    trialEndingSoonDesc: "Less than 24 hours remaining. Subscribe now to keep your access.",
    errorEmailInUse: "This email is already in use (possibly on another app in the same project). Please log in instead.",
    errorInvalidEmail: "Invalid email address.",
    errorWeakPassword: "Password is too weak.",
    errorWrongPassword: "Incorrect password or user not found.",
    errorUserNotFound: "User not found.",
    errorGenericAuth: "Authentication error.",
    alreadyHaveAccount: "Already have an account? Log in",
    noAccount: "Don't have an account? Sign up",
    forgotPassword: "Forgot password?",
    resetEmailSent: "Reset email sent! Check your inbox.",
    backToLogin: "Back to login",
    sendResetLink: "Send reset link"
  }
};

const TrialCountdown = ({ startDate, lang, compact = false }: { startDate: string, lang: Language, compact?: boolean }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTime = () => {
      const start = new Date(startDate).getTime();
      const now = new Date().getTime();
      const diff = (start + (3 * 24 * 60 * 60 * 1000)) - now;

      if (diff <= 0) {
        setTimeLeft('00:00:00');
        setIsExpired(true);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [startDate]);

  if (isExpired) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
        <span className="text-[10px] font-mono font-bold text-white tracking-tight">
          {timeLeft}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-500 font-bold">
          {lang === 'fr' ? 'Temps restant (Essai)' : 'Time remaining (Trial)'}
        </span>
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <AlertCircle className="w-3 h-3 text-emerald-500" />
        </div>
      </div>
      <div className="text-3xl font-mono font-bold text-white tracking-tighter flex justify-between items-baseline">
        {timeLeft}
        <span className="text-[10px] text-emerald-500/50 uppercase font-mono">hrs:min:sec</span>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [lang, setLang] = useState<Language>('fr');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [updates, setUpdates] = useState<RegulatoryUpdate[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isDiagnosingSmtp, setIsDiagnosingSmtp] = useState(false);
  const [isTestingSend, setIsTestingSend] = useState(false);
  const [smtpDiagnosticResult, setSmtpDiagnosticResult] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'options' | 'email' | 'signup' | 'success' | 'forgot'>('options');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [authError, setAuthError] = useState('');
  const [adminTab, setAdminTab] = useState<'smtp' | 'users' | 'profile'>('smtp');
  const [smtpSettings, setSmtpSettings] = useState({ host: '', port: 587, user: '', pass: '', from: '' });
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [legalModal, setLegalModal] = useState<'none' | 'notice' | 'terms'>('none');
  const [selectedUpdate, setSelectedUpdate] = useState<RegulatoryUpdate | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/config")
      .then(res => res.json())
      .then(data => {
        if (data.geminiApiKey) {
          (window as any).process = (window as any).process || {};
          (window as any).process.env = (window as any).process.env || {};
          (window as any).process.env.GEMINI_API_KEY = data.geminiApiKey;
          ai = new GoogleGenAI({ apiKey: data.geminiApiKey });
        }
      })
      .catch(err => console.error("Failed to fetch config", err));
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const t = TRANSLATIONS[lang];

  const checkIsAdmin = (email?: string | null, role?: string) => {
    if (!email) return false;
    return email === "agenim@gmail.com" || 
           email === "ident@aviationonline.fr" || 
           email === "contact@aviationonline.fr" || 
           role === 'admin';
  };

  const isAdminUser = checkIsAdmin(user?.email, profile?.role);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin is from our app
      if (!event.origin.endsWith('.run.app') && !event.origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'STRIPE_SUCCESS') {
        console.log("✅ Stripe payment successful from popup");
        setIsSubscribing(false);
        const sessionId = event.data.sessionId;
        
        if (user && profile && profile.subscriptionStatus !== 'active') {
          const updatedProfile: UserProfile = { 
            ...profile, 
            subscriptionStatus: 'active'
          };
          
          updateDoc(doc(db, 'users', user.uid), { subscriptionStatus: 'active' })
            .then(() => {
              setProfile(updatedProfile);
              
              // Notify server about payment success
              if (sessionId) {
                fetch('/api/notify-payment', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    email: user.email,
                    firstName: profile.firstName || '',
                    lastName: profile.lastName || '',
                    sessionId: sessionId,
                    userId: user.uid
                  }),
                }).catch(console.error);
              }
              
              alert(lang === 'fr' ? "Paiement réussi ! Votre abonnement est maintenant actif." : "Payment successful! Your subscription is now active.");
            })
            .catch(err => {
              console.error("Error updating subscription status:", err);
            });
        }
      } else if (event.data?.type === 'STRIPE_CANCEL') {
        console.log("⚠️ Stripe payment cancelled from popup");
        setIsSubscribing(false);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [user, profile, lang]);

  useEffect(() => {
    auth.languageCode = lang;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const docRef = doc(db, 'users', firebaseUser.uid);
        try {
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            if (data.disabled || data.status === 'deleted') {
              await signOut(auth);
              alert(lang === 'fr' ? "Ce compte a été désactivé par un administrateur." : "This account has been disabled by an administrator.");
              return;
            }
            setProfile(data);
            setLang(data.language);
          } else {
            const newProfile: UserProfile = {
              email: firebaseUser.email || '',
              language: 'fr',
              notificationsEnabled: false,
              createdAt: new Date().toISOString(),
              trialStartDate: new Date().toISOString(),
              subscriptionStatus: 'trial'
            };
            await setDoc(docRef, newProfile);
            setProfile(newProfile);
            
            // Notify server about new signup
            fetch('/api/notify-signup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                email: firebaseUser.email,
                firstName: '',
                lastName: ''
              }),
            }).catch(console.error);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setProfile(null);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (sessionId && user && profile) {
      if (profile.subscriptionStatus !== 'active') {
        const updatedProfile: UserProfile = { 
          ...profile, 
          subscriptionStatus: 'active'
        };
        
        updateDoc(doc(db, 'users', user.uid), { subscriptionStatus: 'active' })
          .then(() => {
            setProfile(updatedProfile);
            
            // Notify server about payment success
            fetch('/api/notify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                email: user.email,
                firstName: profile.firstName || '',
                lastName: profile.lastName || '',
                sessionId: sessionId,
                userId: user.uid
              }),
            }).catch(console.error);

            alert(lang === 'fr' ? "Paiement réussi ! Votre abonnement est maintenant actif." : "Payment successful! Your subscription is now active.");
          })
          .catch(err => {
            console.error("Error updating subscription status:", err);
          });
      }
      // Clean up the URL only after we have processed it with user and profile
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [lang, user, profile]);

  useEffect(() => {
    if (user) {
      const qCat = query(
        collection(db, 'regulatory_updates'), 
        where('part', '==', 'Part-CAT'), 
        orderBy('date', 'desc'), 
        limit(1)
      );
      const qFcl = query(
        collection(db, 'regulatory_updates'), 
        where('part', '==', 'Part-FCL'), 
        orderBy('date', 'desc'), 
        limit(1)
      );

      let catUpdate: RegulatoryUpdate | null = null;
      let fclUpdate: RegulatoryUpdate | null = null;

      const updateState = () => {
        const combined: RegulatoryUpdate[] = [];
        if (catUpdate) combined.push(catUpdate);
        if (fclUpdate) combined.push(fclUpdate);
        // Sort by date desc to keep the most recent at top
        setUpdates([...combined].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      };

      const unsubscribeCat = onSnapshot(qCat, (snapshot) => {
        catUpdate = snapshot.docs.length > 0 ? { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as RegulatoryUpdate : null;
        updateState();
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'regulatory_updates (CAT)');
      });

      const unsubscribeFcl = onSnapshot(qFcl, (snapshot) => {
        fclUpdate = snapshot.docs.length > 0 ? { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as RegulatoryUpdate : null;
        updateState();
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'regulatory_updates (FCL)');
      });

      return () => {
        unsubscribeCat();
        unsubscribeFcl();
      };
    }
  }, [user]);

  useEffect(() => {
    if (isAdminUser) {
      // Fetch SMTP settings
      const smtpRef = doc(db, 'settings', 'smtp');
      getDoc(smtpRef).then(snap => {
        if (snap.exists()) setSmtpSettings(snap.data() as any);
      }).catch(console.error);

      // Fetch all users
      const q = query(collection(db, 'users'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const users = snapshot.docs
          .map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile))
          .filter(u => !u.disabled && u.status !== 'deleted');
        setAllUsers(users);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'users');
      });
      return unsubscribe;
    }
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login error", error);
      setAuthError(t.error);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthLoading) return;
    setIsAuthLoading(true);
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error("Email login error", error);
      let message = t.errorGenericAuth;
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        message = t.errorWrongPassword;
      } else if (error.code === 'auth/invalid-email') {
        message = t.errorInvalidEmail;
      }
      setAuthError(message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthLoading) return;
    setIsAuthLoading(true);
    setAuthError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        const docRef = doc(db, 'users', userCredential.user.uid);
        const newProfile: UserProfile = {
          email: email,
          language: lang,
          notificationsEnabled: false,
          createdAt: new Date().toISOString(),
          trialStartDate: new Date().toISOString(),
          subscriptionStatus: 'trial',
          firstName,
          lastName,
          address,
          zipCode,
          city,
          country
        };
        await setDoc(docRef, newProfile);
        setProfile(newProfile);

        // Notify server about new signup with full details
        fetch('/api/notify-signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: email,
            firstName: firstName,
            lastName: lastName
          }),
        }).catch(console.error);

        await sendEmailVerification(userCredential.user);
        setAuthMode('success');
      }
    } catch (error: any) {
      console.error("Email signup error", error);
      let message = t.errorGenericAuth;
      if (error.code === 'auth/email-already-in-use') {
        message = t.errorEmailInUse;
        // Automatically switch to login mode after a short delay
        setTimeout(() => {
          setAuthMode('email');
          setAuthError('');
        }, 4000);
      } else if (error.code === 'auth/invalid-email') {
        message = t.errorInvalidEmail;
      } else if (error.code === 'auth/weak-password') {
        message = t.errorWeakPassword;
      }
      setAuthError(message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      await sendPasswordResetEmail(auth, email);
      alert(t.resetEmailSent);
      setAuthMode('email');
    } catch (error: any) {
      console.error("Forgot password error", error);
      let message = t.errorGenericAuth;
      if (error.code === 'auth/user-not-found') {
        message = t.errorUserNotFound;
      } else if (error.code === 'auth/invalid-email') {
        message = t.errorInvalidEmail;
      }
      setAuthError(message);
    }
  };

  const handleSubscribe = async () => {
    if (!user || isSubscribing) return;
    setIsSubscribing(true);
    try {
      console.log("💳 Initiating subscription for:", user.email);
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: user.email, 
          userId: user.uid,
          returnUrl: window.location.origin
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.url) {
        console.log("✅ Checkout session created, redirecting to:", data.url);
        // Try window.open first
        const stripeWindow = window.open(data.url, '_blank');
        
        // If window.open failed or was blocked, use direct location change
        if (!stripeWindow || stripeWindow.closed || typeof stripeWindow.closed === 'undefined') {
          console.log("⚠️ Popup blocked, using direct redirect");
          window.location.assign(data.url);
          return;
        }

        // Poll for success to bypass AI Studio proxy 403 errors on redirect
        const pollInterval = setInterval(async () => {
          if (stripeWindow.closed) {
            clearInterval(pollInterval);
            setIsSubscribing(false);
            return;
          }
          try {
            if (data.sessionId) {
              const checkRes = await fetch(`/api/check-session?session_id=${data.sessionId}`);
              if (checkRes.ok) {
                const checkData = await checkRes.json();
                if (checkData.payment_status === 'paid') {
                  clearInterval(pollInterval);
                  stripeWindow.close();
                  
                  // Update profile in Firestore
                  const updatedProfile: UserProfile = { 
                    ...profile, 
                    subscriptionStatus: 'active'
                  };
                  await updateDoc(doc(db, 'users', user.uid), { subscriptionStatus: 'active' });
                  setProfile(updatedProfile);
                  setIsSubscribing(false);
                  
                  // Notify server
                  fetch('/api/notify-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                      email: user.email,
                      firstName: profile.firstName || '',
                      lastName: profile.lastName || '',
                      sessionId: data.sessionId
                    }),
                  }).catch(console.error);

                  alert(lang === 'fr' ? "Paiement réussi ! Votre abonnement est maintenant actif." : "Payment successful! Your subscription is now active.");
                }
              }
            }
          } catch (e) {
            console.error("Polling error", e);
          }
        }, 2000);

      } else {
        console.error("❌ Stripe error response:", data);
        alert(data.error || t.error);
      }
    } catch (error: any) {
      console.error("❌ Stripe error:", error);
      let errorMsg = error.message;
      if (errorMsg.includes("Invalid API Key")) {
        errorMsg = lang === 'fr' 
          ? "Clé API Stripe invalide. Veuillez vérifier votre STRIPE_SECRET_KEY dans les paramètres."
          : "Invalid Stripe API Key. Please check your STRIPE_SECRET_KEY in Settings.";
      }
      alert(`${t.error}: ${errorMsg}`);
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user || !profile) return;
    
    const confirmMsg = lang === 'fr' 
      ? "Êtes-vous sûr de vouloir résilier ? Vous n'aurez plus accès aux services expert." 
      : "Are you sure you want to cancel? You will lose access to expert services.";
      
    if (!window.confirm(confirmMsg)) return;

    try {
      await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          subscriptionId: profile.stripeSubscriptionId,
          email: user.email 
        }),
      });
      
      // Update Firestore to 'cancelled' status
      const updatedProfile = { ...profile, subscriptionStatus: 'cancelled' as const };
      await updateDoc(doc(db, 'users', user.uid), { subscriptionStatus: 'cancelled' });
      setProfile(updatedProfile);
      
      alert(t.subscriptionCancelled);
    } catch (error) {
      console.error("Cancel error", error);
      alert(t.error);
    }
  };

  const handleResendVerification = async () => {
    if (auth.currentUser) {
      try {
        await sendEmailVerification(auth.currentUser);
        alert(t.emailResent);
      } catch (error: any) {
        console.error("Resend error", error);
        alert(error.message);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setMessages([]);
      setAuthMode('options');
      setIsAdminPanelOpen(false);
      setLegalModal('none');
    } catch (error) {
      console.error("Logout error", error);
    }
  };

  const toggleLanguage = async () => {
    const newLang: Language = lang === 'fr' ? 'en' : 'fr';
    setLang(newLang);
    if (user && profile) {
      const updatedProfile = { ...profile, language: newLang };
      try {
        await setDoc(doc(db, 'users', user.uid), updatedProfile);
        setProfile(updatedProfile);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
  };

  const handleUpdateSmtp = async () => {
    try {
      await setDoc(doc(db, 'settings', 'smtp'), smtpSettings);
      alert(t.save);
    } catch (error) {
      console.error("SMTP update error", error);
      alert(t.error);
    }
  };

  const handleUpdateAdminProfile = async () => {
    if (!user) return;
    try {
      if (newEmail) await updateEmail(user, newEmail);
      if (newPassword) await updatePassword(user, newPassword);
      alert(t.update);
      setNewEmail('');
      setNewPassword('');
    } catch (error: any) {
      console.error("Admin profile update error", error);
      alert(error.message);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    try {
      // Perform a client-side "Soft Delete"
      // This is more reliable because the client-side user is an authenticated admin
      // and has direct permissions via Firestore rules.
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        disabled: true,
        deletedAt: new Date().toISOString(),
        status: 'deleted'
      });
      
      setUserToDelete(null);
      console.log(`✅ User ${uid} successfully disabled from client-side`);
    } catch (error: any) {
      console.error("Delete user error", error);
      alert(error.message);
    }
  };

  const toggleNotifications = async () => {
    if (user && profile) {
      const updatedProfile = { ...profile, notificationsEnabled: !profile.notificationsEnabled };
      try {
        await setDoc(doc(db, 'users', user.uid), updatedProfile);
        setProfile(updatedProfile);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    if (!ai) {
      setMessages(prev => [...prev, { role: 'model', text: `**Erreur technique:** L'IA n'est pas encore initialisée. Veuillez patienter un instant ou recharger la page.` }]);
      return;
    }
    
    // Check trial/subscription status
    const isSpecialUser = isAdminUser;
    const isTrialExpired = !isSpecialUser && profile?.subscriptionStatus === 'trial' && 
      profile?.trialStartDate && 
      (new Date().getTime() - new Date(profile.trialStartDate).getTime()) > 3 * 24 * 60 * 60 * 1000;
    
    const isInactive = !isSpecialUser && (
      profile?.subscriptionStatus === 'expired' || 
      profile?.subscriptionStatus === 'cancelled' ||
      isTrialExpired
    );

    if (isInactive) {
      alert(t.trialExpired);
      return;
    }

    const userMessage: Message = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const model = ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [...messages, userMessage].map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        })),
        config: {
          systemInstruction: t.systemInstruction,
        }
      });

      const response = await model;
      const modelMessage: Message = { role: 'model', text: response.text || "Error" };
      setMessages(prev => [...prev, modelMessage]);
    } catch (error: any) {
      console.error("AI error", error);
      const errorMessage = error?.message || String(error) || t.error;
      setMessages(prev => [...prev, { role: 'model', text: `**Erreur technique:** ${errorMessage}\n\nVeuillez réessayer.` }]);
    } finally {
      setLoading(false);
    }
  };

  const isTrialExpired = !isAdminUser && profile?.subscriptionStatus === 'trial' && 
    profile?.trialStartDate && 
    (new Date().getTime() - new Date(profile.trialStartDate).getTime()) > 3 * 24 * 60 * 60 * 1000;

  const trialTimeRemaining = profile?.trialStartDate 
    ? (3 * 24 * 60 * 60 * 1000) - (new Date().getTime() - new Date(profile.trialStartDate).getTime())
    : 0;
  
  const isTrialEndingSoon = !isAdminUser && profile?.subscriptionStatus === 'trial' && 
    trialTimeRemaining > 0 && 
    trialTimeRemaining < 24 * 60 * 60 * 1000;

  return (
    <div className="relative">
      {!user ? (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-emerald-500/30">
          {/* Language Switcher Header */}
        <div className="fixed top-0 left-0 right-0 z-50 p-6 flex justify-end">
          <motion.button 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={toggleLanguage}
            className="flex items-center gap-3 px-6 py-3 bg-emerald-500 text-black border border-emerald-400 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all group hover:scale-105 active:scale-95"
          >
            <Languages className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <span className="text-sm font-bold tracking-wide uppercase">
              {lang === 'fr' ? 'Switch to English' : 'Passer en Français'}
            </span>
          </motion.button>
        </div>

        {/* Hero Section */}
        <div className="relative min-h-screen flex flex-col items-center justify-center py-20">
          {/* Background Image with Overlay */}
          <div className="absolute inset-0 z-0">
            <img 
              src="https://images.unsplash.com/photo-1569154941061-e231b4725ef1?auto=format&fit=crop&q=80&w=2000" 
              alt="Aviation Background" 
              className="w-full h-full object-cover opacity-40"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black"></div>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 text-center px-6 max-w-4xl"
          >
            <div className="flex justify-center mb-8">
              <div className="p-4 bg-emerald-500/20 rounded-3xl backdrop-blur-xl border border-emerald-500/30">
                <Plane className="w-12 h-12 text-emerald-400" />
              </div>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-zinc-500">
              {t.heroTitle}
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-zinc-400 mb-8 sm:mb-12 font-light max-w-2xl mx-auto leading-relaxed">
              {t.heroSubtitle}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 text-left">
              {[t.feature1, t.feature2, t.feature3].map((feature, i) => (
                <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-sm font-medium text-zinc-200">{feature}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col md:flex-row gap-4 sm:gap-6 justify-center items-stretch mb-10">
              {/* Pricing Badge */}
              <div className="flex items-center gap-4 px-6 sm:px-8 py-4 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md">
                <span className="text-3xl sm:text-4xl font-bold text-white">9,90€</span>
                <div className="h-10 w-px bg-white/10"></div>
                <div className="text-left">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-emerald-500 font-bold mb-1">{t.uniquePrice}</p>
                  <p className="text-[10px] sm:text-xs font-medium text-zinc-400">9,90€ / mois • {t.noCommitment}</p>
                </div>
              </div>

              {/* Trial Badge */}
              <div className="flex items-center gap-4 px-6 sm:px-8 py-4 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl backdrop-blur-md relative overflow-hidden group">
                <div className="absolute inset-0 bg-emerald-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                <div className="relative z-10 flex items-center gap-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-500 rounded-full flex items-center justify-center text-black shrink-0">
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-emerald-500 font-bold mb-1">{t.launchOffer}</p>
                    <p className="text-base sm:text-lg font-bold text-white leading-none">{t.threeDaysTrial}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
              <button 
                onClick={() => setAuthMode('signup')}
                className="group relative px-8 py-4 bg-emerald-500 text-black font-bold rounded-2xl hover:bg-emerald-400 transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.3)] overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                {t.startTrial}
              </button>
              <button 
                onClick={() => setAuthMode('email')}
                className="px-8 py-4 bg-zinc-900 text-white font-bold rounded-2xl hover:bg-zinc-800 transition-all border border-white/10"
              >
                {t.loginEmail}
              </button>
            </div>
            
            <p className="mt-8 text-zinc-600 text-[10px] font-mono uppercase tracking-[0.2em]">
              {t.regulatoryExpertise} • {t.support247} • {t.trialTitle}
            </p>

            <div className="mt-12 flex justify-center gap-6">
              <button 
                onClick={() => setLegalModal('notice')}
                className="text-[10px] text-zinc-500 hover:text-emerald-500 transition-colors uppercase tracking-widest"
              >
                {t.legalNotice}
              </button>
              <button 
                onClick={() => setLegalModal('terms')}
                className="text-[10px] text-zinc-500 hover:text-emerald-500 transition-colors uppercase tracking-widest"
              >
                {t.termsOfService}
              </button>
            </div>
          </motion.div>
        </div>

        {/* Auth Modals */}
        <AnimatePresence>
          {authMode !== 'options' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xl overflow-y-auto"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="w-full max-w-md bg-zinc-900 border border-white/10 p-6 sm:p-8 rounded-3xl shadow-2xl relative my-auto"
              >
                <button 
                  onClick={() => setAuthMode('options')}
                  className="absolute top-6 right-6 text-zinc-500 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>

                {authMode === 'email' || authMode === 'signup' || authMode === 'forgot' ? (
                  <form onSubmit={authMode === 'email' ? handleEmailLogin : (authMode === 'signup' ? handleEmailSignup : handleForgotPassword)} className="space-y-6">
                    <div className="text-center mb-8">
                      <h2 className="text-2xl font-bold text-white">
                        {authMode === 'email' ? t.loginEmail : (authMode === 'signup' ? t.signupEmail : t.forgotPassword)}
                      </h2>
                    </div>
                    
                    <div className="space-y-4">
                      {authMode === 'signup' && (
                        <>
                          <div className="flex justify-center gap-4 mb-4">
                            <button 
                              type="button"
                              onClick={() => setLang('fr')}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${lang === 'fr' ? 'bg-emerald-500 text-black' : 'bg-white/5 text-zinc-400'}`}
                            >
                              FR
                            </button>
                            <button 
                              type="button"
                              onClick={() => setLang('en')}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${lang === 'en' ? 'bg-emerald-500 text-black' : 'bg-white/5 text-zinc-400'}`}
                            >
                              EN
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <input 
                              type="text" 
                              placeholder={t.firstName}
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 text-white focus:border-emerald-500 outline-none transition-colors"
                              required
                            />
                            <input 
                              type="text" 
                              placeholder={t.lastName}
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 text-white focus:border-emerald-500 outline-none transition-colors"
                              required
                            />
                          </div>
                          <input 
                            type="text" 
                            placeholder={t.address}
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 text-white focus:border-emerald-500 outline-none transition-colors"
                            required
                          />
                          <div className="grid grid-cols-2 gap-4">
                            <input 
                              type="text" 
                              placeholder={t.zipCode}
                              value={zipCode}
                              onChange={(e) => setZipCode(e.target.value)}
                              className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 text-white focus:border-emerald-500 outline-none transition-colors"
                              required
                            />
                            <input 
                              type="text" 
                              placeholder={t.city}
                              value={city}
                              onChange={(e) => setCity(e.target.value)}
                              className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 text-white focus:border-emerald-500 outline-none transition-colors"
                              required
                            />
                          </div>
                          <input 
                            type="text" 
                            placeholder={t.country}
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 text-white focus:border-emerald-500 outline-none transition-colors"
                            required
                          />
                        </>
                      )}
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                        <input 
                          type="email" 
                          placeholder={t.emailPlaceholder}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-black border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-emerald-500 outline-none transition-colors"
                          required
                        />
                      </div>
                      {authMode !== 'forgot' && (
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                          <input 
                            type="password" 
                            placeholder={t.passwordPlaceholder}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-black border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-emerald-500 outline-none transition-colors"
                            required
                          />
                        </div>
                      )}
                    </div>

                    {authError && (
                      <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20 text-center space-y-2">
                        <p className="text-red-500 text-sm">{authError}</p>
                        {authError === t.errorEmailInUse && (
                          <button 
                            type="button"
                            onClick={() => {
                              setAuthMode('email');
                              setAuthError('');
                            }}
                            className="text-emerald-500 text-xs font-bold hover:underline"
                          >
                            {lang === 'fr' ? 'Se connecter maintenant' : 'Log in now'}
                          </button>
                        )}
                      </div>
                    )}

                    <div className="flex justify-center flex-col items-center gap-2">
                      <button 
                        type="button"
                        onClick={() => {
                          if (authMode === 'forgot') {
                            setAuthMode('email');
                          } else {
                            setAuthMode(authMode === 'email' ? 'signup' : 'email');
                          }
                          setAuthError('');
                        }}
                        className="text-emerald-500 text-xs font-medium hover:text-emerald-400 transition-colors"
                      >
                        {authMode === 'forgot' ? t.backToLogin : (authMode === 'email' ? t.noAccount : t.alreadyHaveAccount)}
                      </button>
                      {authMode === 'email' && (
                        <button 
                          type="button"
                          onClick={() => {
                            setAuthMode('forgot');
                            setAuthError('');
                          }}
                          className="text-zinc-500 text-[10px] hover:text-white transition-colors"
                        >
                          {t.forgotPassword}
                        </button>
                      )}
                    </div>

                    <button 
                      type="submit"
                      disabled={isAuthLoading}
                      className={`w-full bg-emerald-500 text-black font-bold py-4 rounded-xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 ${isAuthLoading ? 'opacity-50 cursor-wait' : ''}`}
                    >
                      {isAuthLoading && <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />}
                      {authMode === 'email' ? t.loginEmail : (authMode === 'signup' ? t.signupEmail : t.sendResetLink)}
                    </button>

                    <div className="flex items-center gap-4 py-2">
                      <div className="flex-1 h-px bg-white/10"></div>
                      <span className="text-zinc-500 text-xs uppercase tracking-widest">OR</span>
                      <div className="flex-1 h-px bg-white/10"></div>
                    </div>

                    <button 
                      type="button"
                      onClick={handleGoogleLogin}
                      className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-3"
                    >
                      <Globe className="w-5 h-5" />
                      {t.loginGoogle}
                    </button>

                    <button 
                      type="button"
                      onClick={() => setAuthMode('options')}
                      className="w-full text-zinc-500 text-xs font-bold py-2 hover:text-white transition-colors"
                    >
                      {t.backToHome}
                    </button>

                    <div className="mt-6 flex justify-center gap-4 border-t border-white/5 pt-4">
                      <button 
                        type="button"
                        onClick={() => setLegalModal('notice')}
                        className="text-[9px] text-zinc-600 hover:text-zinc-400 transition-colors uppercase tracking-widest"
                      >
                        {t.legalNotice}
                      </button>
                      <button 
                        type="button"
                        onClick={() => setLegalModal('terms')}
                        className="text-[9px] text-zinc-600 hover:text-zinc-400 transition-colors uppercase tracking-widest"
                      >
                        {t.termsOfService}
                      </button>
                    </div>
                  </form>
                ) : authMode === 'success' && (
                  <div className="text-center py-8">
                    <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h3 className="text-2xl font-bold mb-4 text-white">{t.accountCreated}</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed mb-8">
                      {t.verificationSent}
                      <br />
                      <span className="text-xs text-zinc-500 mt-2 block italic">{t.checkSpam}</span>
                    </p>
                    <div className="space-y-3">
                      <button 
                        onClick={() => setAuthMode('email')}
                        className="w-full bg-emerald-500 text-black font-bold py-4 rounded-xl hover:bg-emerald-400 transition-all"
                      >
                        {t.loginEmail}
                      </button>
                      <button 
                        onClick={handleResendVerification}
                        className="w-full bg-zinc-800 text-white font-medium py-4 rounded-xl hover:bg-zinc-700 transition-all border border-white/10 text-sm"
                      >
                        {t.resendEmail}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    ) : (
      <div className="h-[100dvh] bg-[#0a0a0a] text-white flex overflow-hidden font-sans relative overscroll-none">
        {/* Sidebar Backdrop for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && window.innerWidth < 1024 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside 
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed lg:relative w-[280px] sm:w-80 h-full border-r border-white/10 bg-zinc-900 flex flex-col z-50 lg:z-20 shadow-2xl lg:shadow-none"
          >
            <div className="p-6 border-bottom border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Plane className="w-6 h-6 text-emerald-500" />
                <span className="font-bold tracking-tight text-xl">EASA ASSIST</span>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {!isAdminUser && profile?.subscriptionStatus === 'trial' && profile?.trialStartDate && (
                <TrialCountdown startDate={profile.trialStartDate} lang={lang} />
              )}

              <section>
                <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                  <Bell className="w-3 h-3" /> {t.updates}
                </h3>
                <div className="space-y-3">
                  {updates.length > 0 ? updates.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i).map(update => (
                    <button 
                      key={update.id} 
                      onClick={() => setSelectedUpdate(update)}
                      className="w-full text-left p-3 rounded-xl bg-white/5 border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all cursor-pointer group active:scale-[0.98]"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] font-mono text-emerald-500 px-1.5 py-0.5 bg-emerald-500/10 rounded uppercase">{update.part}</span>
                        <span className="text-[10px] text-zinc-500">{new Date(update.date).toLocaleDateString(lang)}</span>
                      </div>
                      <p className="text-sm font-medium line-clamp-1 group-hover:text-emerald-400 transition-colors">{update.title}</p>
                      <p className="text-[11px] text-zinc-500 mt-1">{update.reference}</p>
                    </button>
                  )) : (
                    <p className="text-xs text-zinc-600 italic">{t.noUpdates}</p>
                  )}
                </div>
              </section>

              <section className="pt-6 border-t border-white/5">
                <button 
                  onClick={toggleNotifications}
                  className={`w-full p-4 rounded-2xl flex items-center gap-3 transition-all ${profile?.notificationsEnabled ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-white/5 text-zinc-400 border border-white/5'}`}
                >
                  {profile?.notificationsEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                  <span className="text-sm font-medium">{profile?.notificationsEnabled ? t.notificationsOn : t.subscribe}</span>
                </button>

                {isAdminUser && (
                  <>
                    <button 
                      type="button"
                      disabled={isSendingEmail}
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (isSendingEmail) return;
                        
                        console.log("Send email button clicked", { userEmail: user?.email });
                        if (!user?.email) {
                          alert("Erreur : Aucun email trouvé pour votre compte. Veuillez vous reconnecter.");
                          return;
                        }

                        setIsSendingEmail(true);
                        try {
                          const res = await fetch('/api/send-regulatory-watch', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: user.email, lang })
                          });
                          
                          const data = await res.json();
                          
                          if (res.ok) {
                            alert(t.emailSent);
                          } else {
                            console.error("Failed to send email", data);
                            alert(`${t.error}: ${data.details || data.error || 'Unknown error'}`);
                          }
                        } catch (e: any) { 
                          console.error("Error sending email:", e);
                          alert(`${t.error}: ${e.message}`);
                        } finally {
                          setIsSendingEmail(false);
                        }
                      }}
                      className={`w-full mt-4 p-4 rounded-2xl bg-white/5 text-zinc-400 border border-white/5 flex items-center gap-3 hover:bg-white/10 active:scale-[0.98] transition-all cursor-pointer relative z-30 ${isSendingEmail ? 'opacity-50 cursor-wait' : ''}`}
                    >
                      {isSendingEmail ? (
                        <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Mail className="w-5 h-5" />
                      )}
                      <span className="text-sm font-medium">
                        {isSendingEmail ? (lang === 'fr' ? 'Envoi en cours...' : 'Sending...') : t.sendExampleEmail}
                      </span>
                    </button>

                    <button 
                      onClick={() => setIsAdminPanelOpen(true)}
                      className="w-full mt-4 p-4 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-3 hover:bg-emerald-500/20 transition-all"
                    >
                      <Shield className="w-5 h-5" />
                      <span className="text-sm font-bold">{t.adminPanel}</span>
                    </button>
                    <div className="text-[10px] text-zinc-500 mb-1">Diagnostic SMTP</div>
                    <button 
                      type="button"
                      disabled={isDiagnosingSmtp}
                      onClick={async () => {
                        setIsDiagnosingSmtp(true);
                        setSmtpDiagnosticResult(null);
                        try {
                          const res = await fetch('/api/smtp-status');
                          const data = await res.json();
                          const msg = `Status: ${data.status}\nHost: ${data.config.host}\nUser: ${data.config.user}\nFrom: ${data.config.from}`;
                          setSmtpDiagnosticResult(msg);
                        } catch (e: any) {
                          setSmtpDiagnosticResult(`Error: ${e.message}`);
                        } finally {
                          setIsDiagnosingSmtp(false);
                        }
                      }}
                      className="w-full mt-2 p-2 rounded-xl bg-zinc-800 text-[10px] text-zinc-500 border border-white/5 hover:bg-zinc-700 transition-all flex items-center justify-center gap-2"
                    >
                      {isDiagnosingSmtp ? "Diagnostic..." : "Diagnostiquer Connexion"}
                    </button>
                    {smtpDiagnosticResult && (
                      <pre className="mt-2 p-2 bg-black/40 rounded-lg text-[9px] text-zinc-400 overflow-x-auto whitespace-pre-wrap border border-white/5">
                        {smtpDiagnosticResult}
                      </pre>
                    )}

                    <button 
                      type="button"
                      disabled={isTestingSend}
                      onClick={async () => {
                        if (!user?.email) return;
                        setIsTestingSend(true);
                        setSmtpDiagnosticResult(null);
                        try {
                          const res = await fetch('/api/send-regulatory-watch', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: user.email, lang })
                          });
                          const data = await res.json();
                          if (res.ok) {
                            setSmtpDiagnosticResult("✅ Email de test envoyé avec succès !");
                          } else {
                            setSmtpDiagnosticResult(`❌ Échec : ${data.details || data.error}`);
                          }
                        } catch (e: any) {
                          setSmtpDiagnosticResult(`❌ Erreur : ${e.message}`);
                        } finally {
                          setIsTestingSend(false);
                        }
                      }}
                      className={`w-full mt-1 p-2 rounded-xl bg-zinc-800 text-[10px] text-zinc-500 border border-white/5 hover:bg-zinc-700 transition-all flex items-center justify-center gap-2 ${isTestingSend ? 'opacity-50 cursor-wait' : ''}`}
                    >
                      {isTestingSend && <div className="w-3 h-3 border border-zinc-500 border-t-transparent rounded-full animate-spin" />}
                      {isTestingSend ? "Envoi en cours..." : "Tester Envoi Réel (Admin)"}
                    </button>
                    {smtpDiagnosticResult && (
                      <div className="mt-2 p-2 rounded-lg bg-black/40 border border-white/5">
                        <p className="text-[9px] font-mono text-zinc-400 whitespace-pre-wrap leading-tight">
                          {smtpDiagnosticResult}
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <button 
                        onClick={async () => {
                          const mocks = [
                            {
                              part: 'Part-CAT',
                              title: 'Nouveau règlement carburant 2026',
                              description: 'Mise à jour des réserves finales pour les vols court-courriers.',
                              reference: 'CAT.OP.MPA.185',
                              date: new Date().toISOString()
                            },
                            {
                              part: 'Part-FCL',
                              title: 'Prorogation SEP(t) - Simplification',
                              description: 'Nouvelles modalités pour l\'expérience récente des pilotes privés.',
                              reference: 'FCL.740.A',
                              date: new Date(Date.now() - 86400000).toISOString()
                            },
                            {
                              part: 'Part-CAT',
                              title: 'Équipements de survie en mer',
                              description: 'Révision des exigences pour les gilets de sauvetage et canots.',
                              reference: 'CAT.IDE.A.285',
                              date: new Date(Date.now() - 172800000).toISOString()
                            },
                            {
                              part: 'Part-FCL',
                              title: 'Validité des examens théoriques',
                              description: 'Extension de la durée de validité pour les licences professionnelles.',
                              reference: 'FCL.025',
                              date: new Date(Date.now() - 259200000).toISOString()
                            }
                          ];
                          
                          const mockUpdate = mocks[Math.floor(Math.random() * mocks.length)];
                          
                          try {
                            await setDoc(doc(collection(db, 'regulatory_updates')), mockUpdate);
                            await fetch('/api/admin/trigger-update', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(mockUpdate)
                            });
                          } catch (e) { console.error(e); }
                        }}
                        className="p-3 rounded-xl border border-dashed border-zinc-700 text-zinc-500 text-[9px] uppercase tracking-widest hover:border-emerald-500 hover:text-emerald-500 transition-all"
                      >
                        Trigger Random
                      </button>
                      <button 
                        onClick={async () => {
                          if (!confirm("Effacer toutes les évolutions ?")) return;
                          try {
                            const q = query(collection(db, 'regulatory_updates'));
                            const snap = await getDocs(q);
                            for (const d of snap.docs) {
                              await deleteDoc(doc(db, 'regulatory_updates', d.id));
                            }
                          } catch (e) { console.error(e); }
                        }}
                        className="p-3 rounded-xl border border-dashed border-red-900/30 text-red-900/50 text-[9px] uppercase tracking-widest hover:border-red-500 hover:text-red-500 transition-all"
                      >
                        Clear All
                      </button>
                    </div>
                  </>
                )}
              </section>
            </div>

            <div className="p-4 border-t border-white/10 bg-black/20 shrink-0">
              <div className="flex justify-center gap-4 mb-4">
                <button 
                  onClick={() => setLegalModal('notice')}
                  className="text-[9px] text-zinc-600 hover:text-zinc-400 transition-colors uppercase tracking-widest"
                >
                  {t.legalNotice}
                </button>
                <button 
                  onClick={() => setLegalModal('terms')}
                  className="text-[9px] text-zinc-600 hover:text-zinc-400 transition-colors uppercase tracking-widest"
                >
                  {t.termsOfService}
                </button>
              </div>
              {!isAdminUser && (
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                      <Shield className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white uppercase tracking-wider">
                        {profile?.subscriptionStatus === 'active' ? t.subscriptionTitle : t.trialTitle}
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        {profile?.subscriptionStatus === 'active' ? t.premiumMember : t.trialPeriod}
                      </p>
                    </div>
                  </div>
                  
                  {isTrialEndingSoon && (
                    <p className="text-[10px] text-emerald-500 font-bold mb-3 animate-pulse">
                      ⚠️ {t.trialEndingSoon}
                    </p>
                  )}
                  
                  {profile?.subscriptionStatus !== 'active' && (
                    <button 
                      onClick={handleSubscribe}
                      disabled={isSubscribing}
                      className={`w-full bg-emerald-500 text-black text-xs font-bold py-2 rounded-lg hover:bg-emerald-400 transition-colors mb-2 flex items-center justify-center gap-2 ${isSubscribing ? 'opacity-50 cursor-wait' : ''}`}
                    >
                      {isSubscribing && <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />}
                      {isSubscribing ? (lang === 'fr' ? 'Chargement...' : 'Loading...') : t.subscribeNow}
                    </button>
                  )}

                  {(profile?.subscriptionStatus === 'active' || profile?.subscriptionStatus === 'trial') && (
                    <button 
                      onClick={handleCancelSubscription}
                      className="w-full bg-zinc-800 text-zinc-400 text-[10px] py-2 rounded-lg hover:bg-zinc-700 transition-colors"
                    >
                      {t.cancelSubscription}
                    </button>
                  )}
                </div>
              )}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-black font-bold">
                  {user.displayName?.charAt(0) || user.email?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{user.displayName}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={toggleLanguage}
                  className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 p-2.5 rounded-xl flex items-center justify-center gap-2 transition-all text-xs font-bold text-emerald-500"
                >
                  <Languages className="w-4 h-4" />
                  {lang === 'fr' ? 'ENGLISH' : 'FRANÇAIS'}
                </button>
                <button 
                  onClick={handleLogout}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-500 p-2.5 rounded-xl transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative w-full min-w-0">
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-4 sm:px-6 bg-zinc-900/50 backdrop-blur-md z-40 sticky top-0">
          <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/5 rounded-lg lg:hidden shrink-0">
              <Menu className="w-5 h-5" />
            </button>
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-white/5 rounded-lg hidden lg:block shrink-0">
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-2 truncate">
              <BookOpen className="w-5 h-5 text-emerald-500 shrink-0 hidden xs:block" />
              <h2 className="font-bold tracking-tight truncate text-xs sm:text-base">{t.subtitle}</h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all group"
              title={lang === 'fr' ? 'Switch to English' : 'Passer en Français'}
            >
              <Languages className="w-4 h-4 text-emerald-500 group-hover:rotate-12 transition-transform" />
              <span className="text-[10px] font-bold text-zinc-300">
                {lang.toUpperCase()}
              </span>
            </button>

            {!isAdminUser && profile?.subscriptionStatus === 'trial' && profile?.trialStartDate && (
              <div className="lg:hidden">
                <TrialCountdown startDate={profile.trialStartDate} lang={lang} compact={true} />
              </div>
            )}
            {!isAdminUser && profile?.subscriptionStatus !== 'active' && (
              <motion.button 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSubscribe}
                disabled={isSubscribing}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 bg-emerald-500 text-black text-[10px] sm:text-xs font-bold rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)] flex items-center gap-2 whitespace-nowrap ${isSubscribing ? 'opacity-50 cursor-wait' : 'animate-pulse hover:animate-none'}`}
              >
                {isSubscribing ? (
                  <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
                )}
                {isSubscribing ? (lang === 'fr' ? 'Chargement...' : 'Loading...') : t.subscribeNow}
              </motion.button>
            )}
            <div className="hidden md:flex items-center gap-4 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
              <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> {t.systemReady}</span>
            </div>
          </div>
        </header>

        {isTrialEndingSoon && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-3 flex items-center justify-between gap-4 shrink-0"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-emerald-500 shrink-0" />
              <div>
                <p className="text-sm font-bold text-white">{t.trialEndingSoon}</p>
                <p className="text-xs text-zinc-400">{t.trialEndingSoonDesc}</p>
              </div>
            </div>
            <button 
              onClick={handleSubscribe}
              disabled={isSubscribing}
              className={`px-4 py-1.5 bg-emerald-500 text-black text-xs font-bold rounded-lg hover:bg-emerald-400 transition-colors shrink-0 flex items-center gap-2 ${isSubscribing ? 'opacity-50 cursor-wait' : ''}`}
            >
              {isSubscribing && <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />}
              {isSubscribing ? (lang === 'fr' ? 'Chargement...' : 'Loading...') : t.subscribeNow}
            </button>
          </motion.div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <AnimatePresence mode="popLayout">
            {messages.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto"
              >
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
                  <Info className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-2xl font-bold mb-3">{t.welcome}</h3>
                <p className="text-zinc-500 leading-relaxed">
                  {t.description}
                </p>
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                  <button 
                    onClick={() => setInput(t.exampleCat)}
                    className="p-4 rounded-2xl bg-white/5 border border-white/5 text-left hover:bg-white/10 hover:border-emerald-500/30 transition-all group"
                  >
                    <p className="text-[10px] font-mono text-emerald-500 mb-2 group-hover:translate-x-1 transition-transform">PART-CAT</p>
                    <p className="text-sm text-zinc-400 leading-snug">"{t.exampleCat}"</p>
                  </button>
                  <button 
                    onClick={() => setInput(t.exampleFcl)}
                    className="p-4 rounded-2xl bg-white/5 border border-white/5 text-left hover:bg-white/10 hover:border-emerald-500/30 transition-all group"
                  >
                    <p className="text-[10px] font-mono text-emerald-500 mb-2 group-hover:translate-x-1 transition-transform">PART-FCL</p>
                    <p className="text-sm text-zinc-400 leading-snug">"{t.exampleFcl}"</p>
                  </button>
                </div>
              </motion.div>
            ) : (
              messages.map((m, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[92%] sm:max-w-[85%] p-3.5 sm:p-4 rounded-2xl ${
                    m.role === 'user' 
                      ? 'bg-emerald-500 text-black font-semibold shadow-lg shadow-emerald-500/10' 
                      : 'bg-zinc-900 border border-white/10 text-zinc-200 shadow-xl'
                  }`}>
                    <div className="prose prose-invert prose-sm sm:prose-base max-w-none leading-relaxed">
                      <Markdown>{m.text}</Markdown>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
            {loading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-zinc-900 border border-white/10 p-4 rounded-2xl flex items-center gap-3">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                  <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">{t.loading}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={chatEndRef} />
        </div>

        <div className="p-3 sm:p-6 bg-gradient-to-t from-black to-transparent shrink-0">
          <div className="max-w-4xl mx-auto relative">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={t.placeholder}
              className="w-full bg-zinc-900 border border-white/10 rounded-2xl py-4 pl-4 sm:pl-6 pr-14 sm:pr-16 focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600 text-sm sm:text-base shadow-2xl"
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="absolute right-1.5 sm:right-2 top-1.5 sm:top-2 bottom-1.5 sm:bottom-2 w-10 sm:w-12 bg-emerald-500 text-black rounded-xl flex items-center justify-center hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              <Send className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
          <div className="flex flex-col items-center justify-center mt-3 sm:mt-4 gap-2">
            <p className="text-[9px] sm:text-[10px] text-center text-zinc-600 uppercase tracking-[0.2em]">
              {t.professionalAssistant} • EASA Compliance
            </p>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setLegalModal('notice')}
                className="text-[9px] text-zinc-600 hover:text-zinc-400 transition-colors uppercase tracking-widest"
              >
                {t.legalNotice}
              </button>
              <button 
                onClick={() => setLegalModal('terms')}
                className="text-[9px] text-zinc-600 hover:text-zinc-400 transition-colors uppercase tracking-widest"
              >
                {t.termsOfService}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )}

      {/* Legal Modal */}
      <AnimatePresence>
        {legalModal !== 'none' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-zinc-900 border border-white/10 w-full max-w-2xl rounded-3xl overflow-hidden flex flex-col shadow-2xl my-auto"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/20 shrink-0">
                <h2 className="text-xl font-bold text-white">
                  {legalModal === 'notice' ? t.legalNoticeTitle : t.termsOfServiceTitle}
                </h2>
                <button 
                  onClick={() => setLegalModal('none')}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-zinc-500" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 prose prose-invert prose-sm max-w-none">
                {legalModal === 'notice' ? (
                  <div className="space-y-6">
                    <section>
                      <h3 className="text-emerald-500">1. Éditeur du site</h3>
                      <p>Le site EASA Assist est édité par <strong>Jean-Claude CHENARD EI</strong> (AviationOnline).</p>
                      <ul className="list-disc pl-5 space-y-1 text-zinc-400">
                        <li>Forme juridique : Entreprise Individuelle (EI)</li>
                        <li>Siège social : 1bis Avenue Justin Maurice, 47520 LE PASSAGE</li>
                        <li>SIRET : 791546419 (RCS Agen)</li>
                        <li>Directeur de la publication : Jean-Claude CHENARD</li>
                        <li>Contact : contact@aviationonline.fr</li>
                      </ul>
                    </section>
                    <section>
                      <h3 className="text-emerald-500">2. Hébergement</h3>
                      <p>Le site est hébergé par <strong>Google Cloud Platform (GCP)</strong>.</p>
                      <p className="text-zinc-400">Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irlande.</p>
                    </section>
                    <section>
                      <h3 className="text-emerald-500">3. Propriété intellectuelle</h3>
                      <p>L'ensemble des contenus (textes, images, architecture) de l'application EASA Assist est la propriété exclusive de Jean-Claude CHENARD EI. Toute reproduction, représentation, modification, publication, adaptation de tout ou partie des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite, sauf autorisation écrite préalable.</p>
                    </section>
                    <section>
                      <h3 className="text-emerald-500">4. Règlement des différends</h3>
                      <p>Conformément à l'article L. 612-1 du Code de la consommation, vous pouvez recourir gratuitement au service de médiation CM2C (https://cm2c.net/ ou 49 rue de Ponthieu 75008 PARIS) en cas de litige non résolu à l'amiable.</p>
                    </section>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <section>
                      <h3 className="text-emerald-500">Préambule</h3>
                      <p>Les présentes Conditions Générales d'Utilisation et de Vente (CGU/CGV) encadrent l'utilisation du service EASA Assist, un outil SaaS (Software as a Service) proposant un assistant conversationnel spécialisé dans la réglementation aérienne européenne, édité par Jean-Claude CHENARD EI.</p>
                    </section>
                    <section>
                      <h3 className="text-emerald-500">Article 1 : Accès au service et Tarification</h3>
                      <p>L'accès à la plateforme nécessite une connexion internet et la création d'un compte personnel, confidentiel et intransmissible. Le service propose :</p>
                      <ul className="list-disc pl-5 space-y-1 text-zinc-400">
                        <li>Une période d'essai gratuite de 3 jours.</li>
                        <li>Un abonnement mensuel de 9,90€ HT (TVA non applicable, art. 293 B du CGI), sans engagement, résiliable à tout moment.</li>
                      </ul>
                      <p className="mt-2 text-zinc-400">Le paiement sécurisé est assuré par Stripe. En cas d'usage frauduleux ou de partage d'identifiants, l'éditeur se réserve le droit de suspendre l'accès sans préavis.</p>
                    </section>
                    <section>
                      <h3 className="text-emerald-500">Article 2 : Avertissement IA et Responsabilité</h3>
                      <p className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-emerald-400 italic">
                        EASA Assist utilise une intelligence artificielle pour générer des réponses. Bien que l'outil cite ses sources (Easy Access Rules), les informations fournies le sont à titre purement indicatif et pédagogique. Elles ne constituent en aucun cas un conseil juridique ou opérationnel officiel.
                      </p>
                      <p className="mt-4">L'utilisateur (pilote, instructeur, exploitant) demeure seul responsable de la vérification des informations auprès des publications officielles de l'EASA avant toute prise de décision opérationnelle. La responsabilité de Jean-Claude CHENARD EI ne saurait être engagée en cas d'erreur, d'omission ou de mauvaise interprétation de la réglementation par l'IA ou l'utilisateur.</p>
                    </section>
                    <section>
                      <h3 className="text-emerald-500">Article 3 : Données personnelles et Confidentialité</h3>
                      <p>Conformément au RGPD, Jean-Claude CHENARD EI s'engage à protéger la vie privée de ses utilisateurs. Les données collectées (email, nom, historique de conversation) sont utilisées uniquement pour le fonctionnement du service et l'amélioration de l'IA. Vous disposez d'un droit d'accès, de rectification, de limitation et de suppression de vos données en contactant : contact@aviationonline.fr.</p>
                    </section>
                    <section>
                      <h3 className="text-emerald-500">Article 4 : Droit applicable et Litiges</h3>
                      <p>Les présentes conditions sont régies par le droit français. En cas de litige, et à défaut de résolution amiable ou par médiation (CM2C), les tribunaux d'Agen seront seuls compétents.</p>
                    </section>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedUpdate && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-emerald-500 px-2 py-1 bg-emerald-500/10 rounded uppercase tracking-wider">
                    {selectedUpdate.part}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {new Date(selectedUpdate.date).toLocaleDateString(lang)}
                  </span>
                </div>
                <button onClick={() => setSelectedUpdate(null)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>
              <div className="p-8">
                <h3 className="text-2xl font-bold mb-2 text-white">{selectedUpdate.title}</h3>
                <p className="text-emerald-500 font-mono text-xs mb-6 tracking-wide">{selectedUpdate.reference}</p>
                <div className="prose prose-invert prose-sm max-w-none mb-8">
                  <p className="text-zinc-400 leading-relaxed italic">
                    {selectedUpdate.description}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    const question = lang === 'fr' 
                      ? `Peux-tu m'en dire plus sur la mise à jour "${selectedUpdate.title}" (${selectedUpdate.reference}) ?`
                      : `Can you tell me more about the update "${selectedUpdate.title}" (${selectedUpdate.reference})?`;
                    setInput(question);
                    setSelectedUpdate(null);
                  }}
                  className="w-full bg-emerald-500 text-black font-bold py-4 rounded-2xl hover:bg-emerald-400 transition-all flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/20"
                >
                  <Send className="w-5 h-5" />
                  {lang === 'fr' ? "Analyser avec l'Expert IA" : "Analyze with AI Expert"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAdminPanelOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-zinc-900 border-t sm:border border-white/10 w-full max-w-4xl h-full sm:max-h-[90vh] sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between bg-black/20 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-xl">
                    <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-white">{t.adminPanel}</h2>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">System Administration</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAdminPanelOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-500" />
                </button>
              </div>

              <div className="flex border-b border-white/10 bg-black/10 overflow-x-auto shrink-0 no-scrollbar">
                <button 
                  onClick={() => setAdminTab('smtp')}
                  className={`px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold transition-all border-b-2 whitespace-nowrap ${adminTab === 'smtp' ? 'border-emerald-500 text-emerald-500 bg-emerald-500/5' : 'border-transparent text-zinc-500 hover:text-white'}`}
                >
                  {t.smtpSettings}
                </button>
                <button 
                  onClick={() => setAdminTab('users')}
                  className={`px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold transition-all border-b-2 whitespace-nowrap ${adminTab === 'users' ? 'border-emerald-500 text-emerald-500 bg-emerald-500/5' : 'border-transparent text-zinc-500 hover:text-white'}`}
                >
                  {t.userList}
                </button>
                <button 
                  onClick={() => setAdminTab('profile')}
                  className={`px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold transition-all border-b-2 whitespace-nowrap ${adminTab === 'profile' ? 'border-emerald-500 text-emerald-500 bg-emerald-500/5' : 'border-transparent text-zinc-500 hover:text-white'}`}
                >
                  {t.changeProfile}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-8">
                {adminTab === 'smtp' && (
                  <div className="max-w-2xl space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{t.host}</label>
                        <input 
                          type="text"
                          value={smtpSettings.host}
                          onChange={(e) => setSmtpSettings({...smtpSettings, host: e.target.value})}
                          className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 text-white focus:border-emerald-500 outline-none transition-colors"
                          placeholder="smtp.example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{t.port}</label>
                        <input 
                          type="number"
                          value={smtpSettings.port}
                          onChange={(e) => setSmtpSettings({...smtpSettings, port: parseInt(e.target.value) || 0})}
                          className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 text-white focus:border-emerald-500 outline-none transition-colors"
                          placeholder="587"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{t.userSmtp}</label>
                        <input 
                          type="text"
                          value={smtpSettings.user}
                          onChange={(e) => setSmtpSettings({...smtpSettings, user: e.target.value})}
                          className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 text-white focus:border-emerald-500 outline-none transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{t.passSmtp}</label>
                        <input 
                          type="password"
                          value={smtpSettings.pass}
                          onChange={(e) => setSmtpSettings({...smtpSettings, pass: e.target.value})}
                          className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 text-white focus:border-emerald-500 outline-none transition-colors"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{t.fromSmtp}</label>
                      <input 
                        type="email"
                        value={smtpSettings.from}
                        onChange={(e) => setSmtpSettings({...smtpSettings, from: e.target.value})}
                        className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 text-white focus:border-emerald-500 outline-none transition-colors"
                        placeholder="noreply@easa-assist.com"
                      />
                    </div>
                    <div className="flex gap-4">
                      <button 
                        onClick={handleUpdateSmtp}
                        className="bg-emerald-500 text-black font-bold px-8 py-3 rounded-xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
                      >
                        {t.save}
                      </button>
                      <button 
                        onClick={async () => {
                          if (!user?.email) return;
                          try {
                            const response = await fetch('/api/test-smtp', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ email: user.email }),
                            });
                            const data = await response.json();
                            if (data.success) {
                              alert(lang === 'fr' ? "E-mail de test envoyé !" : "Test email sent!");
                            } else {
                              alert(`Error: ${data.error}`);
                            }
                          } catch (e: any) {
                            alert(`Error: ${e.message}`);
                          }
                        }}
                        className="bg-white/5 text-white font-bold px-8 py-3 rounded-xl hover:bg-white/10 transition-all border border-white/10"
                      >
                        {lang === 'fr' ? "Tester l'envoi" : "Test Sending"}
                      </button>
                    </div>
                  </div>
                )}

                {adminTab === 'users' && (
                  <div className="space-y-8">
                    <section>
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        {t.paidUsers}
                      </h3>
                      <div className="bg-black/40 rounded-2xl border border-white/5 overflow-hidden hidden md:block">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-white/5 text-zinc-500 uppercase text-[10px] tracking-widest">
                            <tr>
                              <th className="px-6 py-4 font-bold">{t.name}</th>
                              <th className="px-6 py-4 font-bold">{t.email}</th>
                              <th className="px-6 py-4 font-bold">Status</th>
                              <th className="px-6 py-4 font-bold text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {allUsers.filter(u => u.subscriptionStatus === 'active').map((u, i) => (
                              <tr key={i} className="hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4 text-white font-medium">{u.firstName} {u.lastName}</td>
                                <td className="px-6 py-4 text-zinc-400 font-mono text-xs">{u.email}</td>
                                <td className="px-6 py-4">
                                  <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded text-[10px] font-bold uppercase">Active</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <button 
                                    onClick={() => setUserToDelete(u)}
                                    className="p-2 hover:bg-white/5 rounded-lg text-red-500 hover:text-red-400 transition-all"
                                    title={t.delete}
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {allUsers.filter(u => u.subscriptionStatus === 'active').length === 0 && (
                              <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-zinc-500 italic">No paid subscribers yet</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile View for Paid Users */}
                      <div className="md:hidden space-y-4">
                        {allUsers.filter(u => u.subscriptionStatus === 'active').map((u, i) => (
                          <div key={i} className="bg-black/40 p-5 rounded-2xl border border-white/5 space-y-4">
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <p className="text-white font-bold">{u.firstName} {u.lastName}</p>
                                <p className="text-zinc-500 text-xs font-mono break-all">{u.email}</p>
                              </div>
                              <button 
                                onClick={() => setUserToDelete(u)}
                                className="p-2 bg-red-500/10 text-red-500 rounded-lg"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="flex items-center justify-between pt-3 border-t border-white/5">
                              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Status</span>
                              <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded text-[10px] font-bold uppercase">Active</span>
                            </div>
                          </div>
                        ))}
                        {allUsers.filter(u => u.subscriptionStatus === 'active').length === 0 && (
                          <div className="p-8 text-center text-zinc-500 italic bg-black/40 rounded-2xl border border-white/5">
                            No paid subscribers yet
                          </div>
                        )}
                      </div>
                    </section>

                    <section>
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-zinc-500"></div>
                        {t.freeUsers}
                      </h3>
                      <div className="bg-black/40 rounded-2xl border border-white/5 overflow-hidden hidden md:block">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-white/5 text-zinc-500 uppercase text-[10px] tracking-widest">
                            <tr>
                              <th className="px-6 py-4 font-bold">{t.name}</th>
                              <th className="px-6 py-4 font-bold">{t.email}</th>
                              <th className="px-6 py-4 font-bold">Status</th>
                              <th className="px-6 py-4 font-bold text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {allUsers.filter(u => u.subscriptionStatus !== 'active').map((u, i) => (
                              <tr key={i} className="hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4 text-white font-medium">{u.firstName} {u.lastName}</td>
                                <td className="px-6 py-4 text-zinc-400 font-mono text-xs">{u.email}</td>
                                <td className="px-6 py-4">
                                  {checkIsAdmin(u.email, u.role) ? (
                                    <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded text-[10px] font-bold uppercase border border-emerald-500/20">Admin</span>
                                  ) : (
                                    <span className="px-2 py-1 bg-zinc-500/10 text-zinc-500 rounded text-[10px] font-bold uppercase">Free / Trial</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <button 
                                    onClick={() => setUserToDelete(u)}
                                    className="p-2 hover:bg-white/5 rounded-lg text-red-500 hover:text-red-400 transition-all"
                                    title={t.delete}
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {allUsers.filter(u => u.subscriptionStatus !== 'active').length === 0 && (
                              <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-zinc-500 italic">No free users yet</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile View for Free Users */}
                      <div className="md:hidden space-y-4">
                        {allUsers.filter(u => u.subscriptionStatus !== 'active').map((u, i) => (
                          <div key={i} className="bg-black/40 p-5 rounded-2xl border border-white/5 space-y-4">
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <p className="text-white font-bold">{u.firstName} {u.lastName}</p>
                                <p className="text-zinc-500 text-xs font-mono break-all">{u.email}</p>
                              </div>
                              <button 
                                onClick={() => setUserToDelete(u)}
                                className="p-2 bg-red-500/10 text-red-500 rounded-lg"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="flex items-center justify-between pt-3 border-t border-white/5">
                              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Status</span>
                              {checkIsAdmin(u.email, u.role) ? (
                                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded text-[10px] font-bold uppercase border border-emerald-500/20">Admin</span>
                              ) : (
                                <span className="px-2 py-1 bg-zinc-500/10 text-zinc-500 rounded text-[10px] font-bold uppercase">Free / Trial</span>
                              )}
                            </div>
                          </div>
                        ))}
                        {allUsers.filter(u => u.subscriptionStatus !== 'active').length === 0 && (
                          <div className="p-8 text-center text-zinc-500 italic bg-black/40 rounded-2xl border border-white/5">
                            No free users yet
                          </div>
                        )}
                      </div>
                    </section>
                  </div>
                )}

                {adminTab === 'profile' && (
                  <div className="max-w-md space-y-6">
                    <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-xl">
                      <p className="text-sm text-zinc-400">
                        {lang === 'fr' ? 'Modification des identifiants pour :' : 'Changing credentials for:'} <span className="text-white font-bold">{user?.email}</span>
                      </p>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{t.newEmail}</label>
                        <input 
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 text-white focus:border-emerald-500 outline-none transition-colors"
                          placeholder="new-email@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{t.newPassword}</label>
                        <input 
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 text-white focus:border-emerald-500 outline-none transition-colors"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                    <button 
                      onClick={handleUpdateAdminProfile}
                      className="bg-emerald-500 text-black font-bold px-8 py-3 rounded-xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
                    >
                      {t.update}
                    </button>
                    <p className="text-[10px] text-zinc-500 italic">
                      Note: Changing your email or password will require you to log in again with the new credentials.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {userToDelete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 p-8 rounded-3xl max-w-md w-full shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white text-center mb-2">{t.confirmDelete}</h3>
              <p className="text-zinc-400 text-center mb-8">
                {lang === 'fr' 
                  ? `Voulez-vous vraiment supprimer l'utilisateur ${userToDelete.firstName} ${userToDelete.lastName} (${userToDelete.email}) ? Cette action est irréversible.`
                  : `Are you sure you want to delete user ${userToDelete.firstName} ${userToDelete.lastName} (${userToDelete.email})? This action cannot be undone.`}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setUserToDelete(null)}
                  className="py-3 px-6 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10 transition-all border border-white/10"
                >
                  {lang === 'fr' ? "Annuler" : "Cancel"}
                </button>
                <button 
                  onClick={() => userToDelete.uid && handleDeleteUser(userToDelete.uid)}
                  className="py-3 px-6 bg-red-500 text-white font-bold rounded-xl hover:bg-red-400 transition-all shadow-lg shadow-red-500/20"
                >
                  {t.delete}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
