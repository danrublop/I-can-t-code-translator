# 🚀 Website Extraction Guide - Private Repository Setup

This guide will help you extract the website directory into its own private repository while keeping the main app repository public.

## 📋 Overview

**Goal**: Separate the website code into a private repository while maintaining the public main app repository.

**Benefits**:
- ✅ Website code is private and secure
- ✅ Main app remains public for community contributions
- ✅ Independent versioning and releases
- ✅ Better separation of concerns
- ✅ Easier team management

## 🎯 Current Structure

```
transcode/ (Public Repository)
├── src/                    # Electron app source
├── website/               # Next.js website (to be extracted)
├── scripts/               # Build and deployment scripts
└── ...                    # Other app files
```

## 🎯 Target Structure

```
transcode/ (Public Repository)
├── src/                    # Electron app source
├── scripts/               # Build and deployment scripts
└── ...                    # Other app files

i-cant-code-website-private/ (Private Repository)
├── app/                   # Next.js app directory
├── public/               # Static assets
├── package.json          # Website dependencies
└── ...                   # Website files
```

## 🚀 Step-by-Step Process

### Step 1: Prepare Your Environment

1. **Ensure you have no uncommitted changes**:
   ```bash
   git status
   git add .
   git commit -m "Prepare for website extraction"
   ```

2. **Make the extraction script executable**:
   ```bash
   chmod +x scripts/extract-website.sh
   ```

### Step 2: Extract the Website

1. **Run the extraction script**:
   ```bash
   ./scripts/extract-website.sh
   ```

2. **The script will**:
   - Create a temporary directory with website files
   - Update package.json with new repository name
   - Create a new README.md for the private repository
   - Initialize a new git repository
   - Create an initial commit

### Step 3: Create Private Repository on GitHub

1. **Go to GitHub**: https://github.com/new

2. **Create new repository**:
   - **Repository name**: `i-cant-code-website-private`
   - **Description**: `Private repository for the i cant code website`
   - **Visibility**: **Private** ⚠️ Important!
   - **Don't initialize** with README, .gitignore, or license

3. **Click "Create repository"**

### Step 4: Push to Private Repository

1. **Navigate to the extracted directory**:
   ```bash
   cd temp-website-extract
   ```

2. **Add the remote origin**:
   ```bash
   git remote add origin https://github.com/danrublop/i-cant-code-website-private.git
   ```

3. **Push to the new repository**:
   ```bash
   git push -u origin main
   ```

### Step 5: Update Vercel Deployment

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard

2. **Find your website project** (i-cant-code)

3. **Update the repository connection**:
   - Go to Settings → Git
   - Disconnect from current repository
   - Connect to the new private repository: `i-cant-code-website-private`

4. **Verify environment variables** are still configured:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

5. **Redeploy** to ensure everything works

### Step 6: Test the Website

1. **Visit your website**: https://i-cant-code.vercel.app

2. **Verify all functionality works**:
   - Homepage loads correctly
   - Download page works
   - Authentication works
   - All links and navigation work

### Step 7: Clean Up Main Repository

1. **Make the cleanup script executable**:
   ```bash
   chmod +x scripts/cleanup-main-repo.sh
   ```

2. **Run the cleanup script**:
   ```bash
   ./scripts/cleanup-main-repo.sh
   ```

3. **Push the changes**:
   ```bash
   git push origin main
   ```

## 🔧 Configuration Updates

### Update Main App Configuration

The main app should continue to work without changes since it connects to the deployed website URL, not the local files.

### Update Documentation

1. **Update main README.md** to mention the website is in a separate repository
2. **Update any scripts** that reference the website directory
3. **Update deployment guides** to reflect the new structure

## 🧪 Testing Checklist

### Website Testing
- [ ] Homepage loads correctly
- [ ] Download page fetches GitHub releases
- [ ] Authentication system works
- [ ] All navigation links work
- [ ] Mobile responsiveness works
- [ ] Environment variables are properly set

### Main App Testing
- [ ] App builds successfully
- [ ] App connects to website correctly
- [ ] Authentication flow works
- [ ] All app features function properly

### Repository Testing
- [ ] Private repository is accessible
- [ ] Public repository no longer contains website code
- [ ] Git history is clean
- [ ] No sensitive data exposed

## 🚨 Important Notes

### Security Considerations
- **Environment Variables**: Ensure all sensitive data is in Vercel environment variables
- **API Keys**: Don't commit any API keys or secrets to either repository
- **Database Credentials**: Keep Supabase credentials secure

### Deployment Considerations
- **Vercel Integration**: The website will continue to deploy automatically
- **Domain**: The website URL remains the same
- **SSL**: HTTPS continues to work without changes

### Maintenance Considerations
- **Two Repositories**: You'll now maintain two separate repositories
- **Independent Releases**: Website and app can have different release cycles
- **Team Access**: Control who has access to the private website repository

## 🔄 Rollback Plan

If something goes wrong, you can rollback:

1. **Restore website directory** from git history:
   ```bash
   git checkout HEAD~1 -- website/
   ```

2. **Revert Vercel to original repository**

3. **Delete the private repository** if needed

## 📞 Support

If you encounter issues:

1. **Check the scripts** for error messages
2. **Verify git status** at each step
3. **Test website functionality** after each major step
4. **Check Vercel deployment logs** for any issues

## 🎉 Success Criteria

You've successfully completed the extraction when:

- ✅ Website code is in private repository
- ✅ Main app repository is clean and focused
- ✅ Website deploys correctly from new repository
- ✅ All functionality works as expected
- ✅ No sensitive data is exposed
- ✅ Both repositories are properly configured

---

**Next Steps**: After completing this guide, you'll have a clean separation between your public app repository and private website repository, with both maintaining full functionality.
