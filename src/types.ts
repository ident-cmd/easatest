export type Language = 'fr' | 'en';

export interface UserProfile {
  uid?: string;
  email: string;
  language: Language;
  notificationsEnabled: boolean;
  createdAt: string;
  trialStartDate?: string;
  subscriptionStatus: 'trial' | 'active' | 'cancelled' | 'expired';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  firstName?: string;
  lastName?: string;
  address?: string;
  zipCode?: string;
  city?: string;
  country?: string;
  role?: 'admin' | 'user';
  disabled?: boolean;
  status?: string;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
}

export interface RegulatoryUpdate {
  id: string;
  part: 'Part-CAT' | 'Part-FCL';
  title: string;
  description: string;
  reference: string;
  date: string;
}
