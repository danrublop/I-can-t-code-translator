// Utility functions for Electron integration

// Check if we're running in an Electron context
export const isElectron = () => {
  return typeof window !== 'undefined' && 
         window.navigator && 
         window.navigator.userAgent && 
         window.navigator.userAgent.toLowerCase().indexOf('electron') > -1;
};

// Send message to Electron process and close window
export const sendToElectronAndClose = (data: any) => {
  if (isElectron()) {
    try {
      // Try to use Electron's ipcRenderer if available
      if (window.electronAPI) {
        window.electronAPI.send('auth-success', data);
        // Close the window after a short delay to ensure message is sent
        setTimeout(() => {
          window.close();
        }, 100);
      } else {
        // Fallback: try to close window directly
        window.close();
      }
    } catch (error) {
      console.error('Error sending message to Electron:', error);
      // Fallback: close window
      window.close();
    }
  }
};

// Handle successful authentication
export const handleAuthSuccess = (userData: any) => {
  if (isElectron()) {
    sendToElectronAndClose(userData);
  } else {
    // If not in Electron, redirect to dashboard as usual
    window.location.href = '/dashboard';
  }
};

// Send authentication success to Electron app
export const sendAuthSuccessToElectron = async (userData: any) => {
  if (isElectron() && window.electronAPI?.sendAuthSuccess) {
    try {
      const result = await window.electronAPI.sendAuthSuccess(userData);
      if (result.success) {
        // Don't close the window immediately - let user click continue button
        // The window will be closed when user clicks "Return to Application"
        console.log('Authentication successful, waiting for user to click continue...');
      }
      return result;
    } catch (error) {
      console.error('Error sending auth success to Electron:', error);
      // Fallback: close window
      window.close();
    }
  } else if (isElectron()) {
    // Fallback for older Electron API
    sendToElectronAndClose(userData);
  }
};

// Continue to application (called when user clicks "Return to Application" button)
export const continueToApplication = async () => {
  if (isElectron() && window.electronAPI?.continueToApplication) {
    try {
      const result = await window.electronAPI.continueToApplication();
      if (result.success) {
        // Now close the window and return to app
        window.close();
      }
      return result;
    } catch (error) {
      console.error('Error continuing to application:', error);
      // Fallback: close window
      window.close();
    }
  } else if (isElectron()) {
    // Fallback: close window
    window.close();
  }
};
