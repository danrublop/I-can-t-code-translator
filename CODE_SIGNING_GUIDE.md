# Code Signing Guide for macOS

This guide explains how to properly code sign the "i cant code" Electron app for macOS distribution.

## Current Issue

The app currently shows this error on macOS:
```
"i cant code" cannot be opened because the developer cannot be verified.
macOS cannot verify that this app is free from malware.
```

## Quick Fix for Users

**For users who want to run the app immediately:**

1. Download the .dmg file
2. Drag the app to Applications folder
3. **Right-click** the app and select "Open" (don't double-click)
4. Click "Open" when macOS shows the security warning
5. The app will run and be trusted for future launches

## Proper Solution: Code Signing

### Prerequisites

1. **Apple Developer Account** ($99/year)
   - Sign up at [developer.apple.com](https://developer.apple.com)
   - Enroll in the Apple Developer Program

2. **Developer ID Certificate**
   - Log into Apple Developer portal
   - Go to Certificates, Identifiers & Profiles
   - Create a "Developer ID Application" certificate
   - Download and install in Keychain Access

### Environment Setup

1. **Set environment variables** (add to your `.bashrc` or `.zshrc`):
```bash
export CSC_IDENTITY_AUTO_DISCOVERY=false
export CSC_IDENTITY="Developer ID Application: Your Name (TEAM_ID)"
export CSC_KEY_PASSWORD="your_certificate_password"  # if certificate is password protected
```

2. **Alternative: Use certificate file**:
```bash
export CSC_LINK="/path/to/certificate.p12"
export CSC_KEY_PASSWORD="certificate_password"
```

### Build Configuration

The `package.json` has been updated with proper code signing configuration:

```json
{
  "build": {
    "mac": {
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "build-resources/entitlements.mac.plist",
      "entitlementsInherit": "build-resources/entitlements.mac.plist"
    }
  }
}
```

### Building with Code Signing

1. **With certificate installed in Keychain**:
```bash
npm run build:mac
```

2. **With certificate file**:
```bash
CSC_LINK="/path/to/certificate.p12" CSC_KEY_PASSWORD="password" npm run build:mac
```

### Notarization (Recommended)

For the best user experience, also notarize the app:

1. **Set additional environment variables**:
```bash
export APPLE_ID="your@email.com"
export APPLE_ID_PASSWORD="app-specific-password"  # Generate in Apple ID settings
export APPLE_TEAM_ID="TEAM_ID"  # Found in developer portal
```

2. **Update package.json** to enable notarization:
```json
{
  "build": {
    "mac": {
      "notarize": {
        "teamId": "TEAM_ID"
      }
    }
  }
}
```

### Verification

After building, verify the signing:

```bash
# Check code signature
codesign --verify --verbose=2 "build/mac/i cant code.app"

# Check entitlements
codesign --display --entitlements - "build/mac/i cant code.app"

# Check notarization status (if notarized)
spctl --assess --verbose=2 "build/mac/i cant code.app"
```

## Troubleshooting

### Common Issues

1. **"No identity found"**
   - Ensure certificate is installed in Keychain
   - Check CSC_IDENTITY matches certificate name exactly

2. **"Certificate not found in keychain"**
   - Open Keychain Access
   - Ensure certificate is in "login" keychain
   - Try moving to "System" keychain

3. **"Hardened runtime violations"**
   - Check entitlements.mac.plist includes necessary permissions
   - Add specific entitlements for your app's needs

### Testing Unsigned Builds

For development, you can skip signing:

```bash
export CSC_IDENTITY_AUTO_DISCOVERY=false
npm run build:mac
```

## Security Notes

- Code signing ensures app integrity and identifies the developer
- Notarization provides additional malware scanning by Apple
- Users can still run unsigned apps using right-click → Open
- Consider using GitHub Actions for automated signed builds

## Next Steps

1. Get Apple Developer Account
2. Generate Developer ID certificate  
3. Set up environment variables
4. Test build process
5. Update website with signed builds
6. Consider setting up automated CI/CD signing
