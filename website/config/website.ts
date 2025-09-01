// Website configuration
export const WEBSITE_CONFIG = {
  // Development
  DEV_URL: 'http://localhost:3000',
  
  // Production (update this when deploying)
  PROD_URL: 'https://i-cant-code.vercel.app',
  
  // Get the appropriate URL based on environment
  getBaseUrl: () => {
    // Use production URL for deployed website
    return WEBSITE_CONFIG.PROD_URL;
  },
  
  // Authentication endpoints
  getLoginUrl: () => `${WEBSITE_CONFIG.getBaseUrl()}/login`,
  getDashboardUrl: () => `${WEBSITE_CONFIG.getBaseUrl()}/dashboard`,
  getOnboardingUrl: () => `${WEBSITE_CONFIG.getBaseUrl()}/onboarding`,
  getDownloadUrl: () => `${WEBSITE_CONFIG.getBaseUrl()}/download`,
};
