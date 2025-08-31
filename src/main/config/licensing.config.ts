export interface LicensingConfig {
  mode: 'free' | 'trial' | 'subscription';
  trialDays: number;
  features: {
    free: string[];
    trial: string[];
    paid: string[];
  };
  pricing: {
    trialPrice: number;
    monthlyPrice: number;
    yearlyPrice: number;
  };
  restrictions: {
    maxExplanationsPerDay: number;
    maxCodeLength: number;
    advancedFeatures: boolean;
  };
}

// CURRENTLY IN FREE MODE - Change this when ready to charge
export const LICENSING_CONFIG: LicensingConfig = {
  mode: 'free', // 🚀 LAUNCH FREE - Change to 'trial' when ready
  
  trialDays: 7,
  
  features: {
    free: [
      'basic_explanation', 
      'code_analysis', 
      'notebook', 
      'advanced_features',
      'premium_support'
    ], // All features free for now
    
    trial: [
      'basic_explanation', 
      'code_analysis', 
      'notebook', 
      'advanced_features'
    ],
    
    paid: [
      'basic_explanation', 
      'code_analysis', 
      'notebook', 
      'advanced_features', 
      'premium_support',
      'unlimited_usage'
    ]
  },
  
  pricing: {
    trialPrice: 0,
    monthlyPrice: 9.99,
    yearlyPrice: 99.99
  },
  
  restrictions: {
    maxExplanationsPerDay: 999999, // No limit in free mode
    maxCodeLength: 999999, // No limit in free mode
    advancedFeatures: true // All features enabled
  }
};

// Helper functions for easy mode switching
export const isFreeMode = (): boolean => LICENSING_CONFIG.mode === 'free';
export const isTrialMode = (): boolean => LICENSING_CONFIG.mode === 'trial';
export const isSubscriptionMode = (): boolean => LICENSING_CONFIG.mode === 'subscription';

// Easy transition methods
export const enableTrialMode = (): void => {
  LICENSING_CONFIG.mode = 'trial';
  LICENSING_CONFIG.restrictions.maxExplanationsPerDay = 50;
  LICENSING_CONFIG.restrictions.maxCodeLength = 10000;
  LICENSING_CONFIG.restrictions.advancedFeatures = true;
};

export const enableSubscriptionMode = (): void => {
  LICENSING_CONFIG.mode = 'subscription';
  LICENSING_CONFIG.restrictions.maxExplanationsPerDay = 999999;
  LICENSING_CONFIG.restrictions.maxCodeLength = 999999;
  LICENSING_CONFIG.restrictions.advancedFeatures = true;
};

export const enableFreeMode = (): void => {
  LICENSING_CONFIG.mode = 'free';
  LICENSING_CONFIG.restrictions.maxExplanationsPerDay = 999999;
  LICENSING_CONFIG.restrictions.maxCodeLength = 999999;
  LICENSING_CONFIG.restrictions.advancedFeatures = true;
};

