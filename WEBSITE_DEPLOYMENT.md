# 🌐 Website Deployment Guide

This guide explains how to deploy the website separately from the desktop app.

## 📋 Overview

- **Desktop App**: Distributed via GitHub releases (this repo)
- **Website**: Hosted separately (Vercel, Netlify, etc.)
- **Separation**: Users download the app, not the website

## 🏗️ Project Structure

```
transcode/                    # Desktop App Repository
├── src/                     # Electron app source
├── website/                 # Website source (separate deployment)
│   ├── app/                # Next.js app
│   ├── components/         # React components
│   └── package.json        # Website dependencies
└── package.json            # Desktop app dependencies
```

## 🚀 Website Deployment Options

### Option 1: Vercel (Recommended)

1. **Push website to separate repo:**
```bash
# Create new repository for website
git clone https://github.com/yourusername/icantcode-website.git
cd icantcode-website

# Copy website files
cp -r ../transcode/website/* .

# Commit and push
git add .
git commit -m "Initial website commit"
git push origin main
```

2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Import your website repository
   - Deploy automatically

### Option 2: Netlify

1. **Same setup as Vercel**
2. **Connect to Netlify**
3. **Deploy from Git**

### Option 3: GitHub Pages

1. **Enable GitHub Pages** in repository settings
2. **Set source** to main branch
3. **Build and deploy** automatically

## 🔧 Website Build Configuration

### Next.js Configuration
```javascript
// website/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',  // Static export
  trailingSlash: true,
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig
```

### Package.json Scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "export": "next build && next export"
  }
}
```

## 📱 Desktop App Integration

### Update App to Point to Live Website

```typescript
// src/main/config/website.ts
export const WEBSITE_CONFIG = {
  baseUrl: 'https://icantcode.app',  // Your live website
  loginUrl: 'https://icantcode.app/login',
  // ... other config
};
```

### Remove Website from Desktop Build

The desktop app already excludes website files:
- **Build process**: Only builds Electron components
- **Distribution**: Only includes app files
- **Size**: Much smaller downloads

## 🔄 Development Workflow

### Desktop App Development
```bash
# In transcode/ directory
npm run dev          # Run desktop app
npm run build:prod   # Build for production
./scripts/release.sh # Create release
```

### Website Development
```bash
# In website/ directory (separate repo)
npm run dev          # Run website locally
npm run build        # Build for production
git push origin main # Deploy to hosting
```

## 📊 Benefits of Separation

✅ **Smaller Downloads**: Users only get the app, not website  
✅ **Faster Updates**: Website can update independently  
✅ **Better Hosting**: Website gets CDN, SSL, etc.  
✅ **Cleaner Repos**: Desktop app focused on app logic  
✅ **Scalability**: Website can handle more traffic  

## 🚨 Important Notes

### Don't Include in Desktop App
- ❌ Website source code
- ❌ Website dependencies
- ❌ Website build files
- ❌ Website configuration

### Do Include in Desktop App
- ✅ App source code
- ✅ App dependencies
- ✅ App build files
- ✅ App configuration

## 🔗 Example Repository Structure

```
icantcode/                    # Desktop App
├── src/
├── package.json
└── README.md

icantcode-website/           # Website (Separate Repo)
├── app/
├── components/
├── package.json
└── README.md
```

## 📝 Deployment Checklist

### Website Repository
- [ ] Create separate repository
- [ ] Copy website files
- [ ] Configure build settings
- [ ] Set up hosting (Vercel/Netlify)
- [ ] Test deployment
- [ ] Update desktop app config

### Desktop App Repository
- [ ] Remove website from build process
- [ ] Update website URLs to live site
- [ ] Test app functionality
- [ ] Create release

## 🌍 Custom Domain Setup

1. **Buy domain** (e.g., `icantcode.app`)
2. **Configure DNS** to point to hosting
3. **Update app config** with new domain
4. **Set up SSL** (automatic with Vercel/Netlify)

## 📞 Support

- **Desktop App Issues**: GitHub issues in this repo
- **Website Issues**: GitHub issues in website repo
- **Deployment Issues**: Hosting platform support

---

**Result**: Users download only the desktop app, website is hosted separately with better performance and scalability! 🚀
