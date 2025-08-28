// Website configuration
export const WEBSITE_CONFIG = {
  // Development
  DEV_URL: 'http://localhost:3000',
  
  // Production (update this when deploying)
  PROD_URL: 'https://your-domain.com',
  
  // Get the appropriate URL based on environment
  getBaseUrl: () => {
    // Always use localhost:3000 for now
    return WEBSITE_CONFIG.DEV_URL;
  },
  
  // Authentication endpoints
  getLoginUrl: () => `${WEBSITE_CONFIG.getBaseUrl()}/login`,
  getDashboardUrl: () => `${WEBSITE_CONFIG.getBaseUrl()}/dashboard`,
  getOnboardingUrl: () => `${WEBSITE_CONFIG.getBaseUrl()}/onboarding`,
  getDownloadUrl: () => `${WEBSITE_CONFIG.getBaseUrl()}/download`,
};
