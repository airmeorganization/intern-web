-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    role TEXT CHECK (role IN ('student', 'employer')) NOT NULL,
    profession_major TEXT,
    college_company TEXT,
    bio TEXT,
    resume_url TEXT,
    parsed_keywords TEXT[] DEFAULT '{}',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

-- 2. JOBS TABLE
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    keywords TEXT[] DEFAULT '{}',
    quick_apply BOOLEAN DEFAULT true,
    ai_interview BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

-- 3. APPLICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
    applicant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT CHECK (status IN ('under_review', 'interview', 'accepted', 'rejected')) DEFAULT 'under_review',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW()) NOT NULL,
    UNIQUE(job_id, applicant_id)
);

-- 4. POSTS TABLE
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    audience TEXT CHECK (audience IN ('All', 'Only Friends')) DEFAULT 'All',
    content TEXT NOT NULL,
    media_url TEXT,
    likes_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

-- 5. COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

-- 6. DIRECT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    attachment_url TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ BEGIN
    CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Jobs are viewable by everyone" ON public.jobs FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Posts are viewable by everyone" ON public.posts FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Comments are viewable by everyone" ON public.comments FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Employers can insert jobs" ON public.jobs FOR INSERT WITH CHECK (auth.uid() = employer_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Applicants can insert applications" ON public.applications FOR INSERT WITH CHECK (auth.uid() = applicant_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can view own applications" ON public.applications FOR SELECT USING (auth.uid() = applicant_id OR auth.uid() IN (SELECT employer_id FROM public.jobs WHERE id = job_id));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can insert posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = author_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can insert comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = author_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can view relevant messages" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update their messages as read" ON public.messages FOR UPDATE USING (auth.uid() = receiver_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;
