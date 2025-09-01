# Supabase Setup Guide for i cant code Website

This guide will help you set up Supabase authentication and database for the i cant code website.

## 🚀 Quick Start

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up/Login with your GitHub account
3. Click "New Project"
4. Choose your organization
5. Enter project details:
   - **Name**: `i-cant-code-website`
   - **Database Password**: Generate a strong password
   - **Region**: Choose closest to your users
6. Click "Create new project"
7. Wait for project setup (2-3 minutes)

### 2. Get Project Credentials

1. In your project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://abcdefghijklmnop.supabase.co`)
   - **Anon/Public Key** (starts with `eyJ...`)

### 3. Configure Environment Variables

1. In your website directory, create `.env.local`:
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

2. Replace the placeholder values with your actual Supabase credentials

### 4. Set Up Database

1. In Supabase dashboard, go to **SQL Editor**
2. Copy the contents of `supabase-setup.sql`
3. Paste and run the SQL script
4. This will create:
   - `users` table
   - `user_preferences` table
   - Row Level Security policies
   - Automatic triggers

### 5. Configure Authentication

1. Go to **Authentication** → **Settings**
2. Configure email templates (optional but recommended)
3. Set up email confirmation (recommended for production)
4. Configure redirect URLs:
   - Add `http://localhost:3000` for development
   - Add your production domain when ready

### 6. Test the Setup

1. Start your development server:
```bash
npm run dev
```

2. Navigate to `/login`
3. Try creating a new account
4. Check Supabase dashboard to see the new user

## 🔧 Configuration Details

### Database Schema

#### Users Table
```sql
users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
```

#### User Preferences Table
```sql
user_preferences (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  preferred_languages TEXT[],
  experience_level TEXT CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  use_case TEXT CHECK (use_case IN ('personal', 'work', 'education')),
  notifications BOOLEAN,
  theme TEXT CHECK (theme IN ('auto', 'light', 'dark')),
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
```

### Row Level Security

The setup includes RLS policies that ensure:
- Users can only access their own data
- Users can only modify their own profiles
- Data is automatically secured by user ID

### Automatic Triggers

- **User Creation**: Automatically creates user profile on signup
- **Timestamp Updates**: Automatically updates `updated_at` on changes

## 🚨 Security Features

### Built-in Security
- **Row Level Security (RLS)**: Users can only access their own data
- **JWT Tokens**: Secure authentication with automatic token refresh
- **Password Hashing**: Automatic password security
- **Email Verification**: Optional email confirmation

### Best Practices
- Never expose your service role key in client code
- Use environment variables for sensitive data
- Enable email confirmation in production
- Regularly rotate API keys

## 🔄 Authentication Flow

### 1. User Registration
```
User fills form → Supabase creates auth user → Trigger creates profile → Redirect to onboarding
```

### 2. User Login
```
User enters credentials → Supabase validates → Returns JWT token → Redirect to dashboard
```

### 3. Session Management
```
App checks session → Supabase validates token → User stays logged in → Automatic refresh
```

## 🛠️ Troubleshooting

### Common Issues

#### "Invalid API key" Error
- Check your environment variables
- Ensure you're using the anon key, not the service role key
- Verify the project URL is correct

#### "Table doesn't exist" Error
- Run the SQL setup script in Supabase SQL Editor
- Check that all tables were created successfully
- Verify RLS policies are in place

#### Authentication Not Working
- Check browser console for errors
- Verify redirect URLs in Supabase settings
- Ensure environment variables are loaded

#### Database Connection Issues
- Check your project is active in Supabase
- Verify database password is correct
- Check if you've hit any usage limits

### Debug Mode

Enable debug logging by adding to your `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_DEBUG=true
```

## 📱 Production Deployment

### Environment Variables
```bash
# Production
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
```

### Redirect URLs
Add your production domain to Supabase authentication settings:
- `https://yourdomain.com`
- `https://yourdomain.com/auth/callback`

### Email Templates
Customize email templates in Supabase dashboard for:
- Email confirmation
- Password reset
- Magic link authentication

## 🔐 Advanced Features

### Social Authentication
Supabase supports OAuth providers:
- GitHub
- Google
- Facebook
- Discord
- And more...

### Real-time Features
Enable real-time subscriptions for:
- Live user status
- Collaborative features
- Notifications

### Edge Functions
Deploy serverless functions for:
- Custom business logic
- Webhook handling
- Data processing

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js with Supabase](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs)
- [Authentication Best Practices](https://supabase.com/docs/guides/auth/auth-best-practices)
- [Database Design](https://supabase.com/docs/guides/database)

## 🆘 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Supabase logs in the dashboard
3. Check browser console for client-side errors
4. Verify all environment variables are set correctly
5. Ensure database tables and policies are created

For Supabase-specific issues, check their [GitHub issues](https://github.com/supabase/supabase/issues) or [Discord community](https://discord.supabase.com/).
