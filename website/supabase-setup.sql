-- Supabase Database Setup for i cant code
-- Run this in your Supabase SQL editor

-- Note: auth.users table is managed by Supabase and RLS is already enabled

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    preferred_languages TEXT[] DEFAULT '{}',
    experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
    use_case TEXT CHECK (use_case IN ('personal', 'work', 'education')) DEFAULT 'personal',
    notifications BOOLEAN DEFAULT true,
    theme TEXT CHECK (theme IN ('auto', 'light', 'dark')) DEFAULT 'auto',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);

-- Enable Row Level Security on custom tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create RLS policies for user_preferences table
CREATE POLICY "Users can view own preferences" ON public.user_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON public.user_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON public.user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences" ON public.user_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', 'Developer')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call the function on user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create downloads table to track unique downloads per device
CREATE TABLE IF NOT EXISTS public.downloads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    device_fingerprint TEXT NOT NULL,
    platform TEXT CHECK (platform IN ('mac', 'windows')) NOT NULL,
    version TEXT NOT NULL,
    user_agent TEXT,
    ip_address INET,
    downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, device_fingerprint, platform)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_downloads_user_device ON public.downloads(user_id, device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_downloads_platform ON public.downloads(platform);

-- Enable Row Level Security on downloads table
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for downloads table
CREATE POLICY "Users can view own downloads" ON public.downloads
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own downloads" ON public.downloads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to get download counts
CREATE OR REPLACE FUNCTION public.get_download_counts()
RETURNS TABLE(platform TEXT, count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT d.platform, COUNT(*)::BIGINT
    FROM public.downloads d
    GROUP BY d.platform;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
