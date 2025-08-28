# Authentication Flow Documentation

## Overview

The application now implements a secure authentication flow where users must log in through the website to access the main functionality. This ensures that only authenticated users can use the code translation features.

## How It Works

### 1. Application Launch
- When the application starts, it opens the toolbar window
- The toolbar shows an authentication status indicator
- If not authenticated, it displays "⚠️ Login Required" and a prominent "🔐 Login" button
- If authenticated, it shows the user's name and available features

### 2. Login Process
- Click the "🔐 Login" button in the toolbar
- This opens a new window with the website login page
- Users can log in with email/password or create a new account
- The website handles authentication through Supabase

### 3. Authentication Success
- After successful login, the website shows a success message
- A "Return to Application" button appears
- Clicking this button sends the authentication data to the Electron app
- The website window automatically closes
- The user is now fully authenticated in the application

### 4. Post-Authentication
- The toolbar updates to show the user's name and logout button
- All features become available:
  - Code translation (Cmd+Shift+T)
  - Codebook access
  - Settings
  - Global shortcuts work properly
- The explanation window opens automatically for onboarding

### 5. Logout
- Click the "logout" button in the toolbar
- This clears all authentication data
- The application returns to the unauthenticated state
- All features become locked again

## Security Features

- **Authentication Required**: All main functionality is locked behind authentication
- **Secure Communication**: Authentication data is passed securely between website and app
- **Session Management**: Users stay logged in until they explicitly logout
- **No Local Bypass**: The development bypass has been removed for security

## User Experience

- **Clear Status**: Users always know their authentication status
- **Seamless Flow**: Login process is smooth and intuitive
- **Visual Feedback**: Success messages and status indicators guide users
- **Automatic Return**: No need to manually close windows or navigate back

## Development Notes

### Building the Application
```bash
# Build the main Electron app
npm run build

# Build the website (in website/ directory)
cd website
npm run build

# Start the application
npm start
```

### Website Development
```bash
cd website
npm run dev
```

### Authentication Service
The authentication is handled by `src/main/services/auth.service.ts` which:
- Manages user authentication state
- Handles website authentication data
- Provides user profile information
- Manages points and achievements

## Troubleshooting

### Common Issues

1. **Login Button Not Working**
   - Ensure the website is running on localhost:3000
   - Check that the preload-website.ts file is properly built
   - Verify the website configuration in `src/main/config/website.ts`

2. **Authentication Not Persisting**
   - Check that the auth service is properly initialized
   - Verify IPC communication between main and renderer processes

3. **Website Not Opening**
   - Ensure the website URL is correct in the configuration
   - Check that the website is accessible from the Electron app

### Debug Mode
Enable debug logging by checking the console output in both:
- Main process (Electron console)
- Website (browser console)

## Future Enhancements

- **OAuth Integration**: Add GitHub, Google, etc. login options
- **Remember Me**: Implement persistent login across app restarts
- **Two-Factor Authentication**: Add additional security layers
- **Profile Management**: Allow users to edit their profiles
- **Password Reset**: Implement forgotten password functionality
