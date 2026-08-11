-- ============================================================
-- SMART CAMPUS ELECTION APP - SUPABASE POSTGRESQL DATABASE SCHEMA
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. STUDENTS TABLE
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  department TEXT,
  semester TEXT DEFAULT '1',
  class_name TEXT,
  division TEXT,
  passcode TEXT,
  passcode_hash TEXT,
  slip_token TEXT UNIQUE,
  photo_url TEXT,
  selfie_url TEXT,
  has_voted BOOLEAN DEFAULT FALSE,
  voted_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CANDIDATES TABLE
CREATE TABLE IF NOT EXISTS public.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  position_id TEXT NOT NULL DEFAULT 'pos-1',
  position_name TEXT NOT NULL DEFAULT 'Council Member',
  position TEXT NOT NULL DEFAULT 'Council Member',
  department TEXT DEFAULT 'General',
  manifesto TEXT,
  campaign_message TEXT,
  photo_url TEXT,
  achievements JSONB DEFAULT '[]'::jsonb,
  votes_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ELECTION SLIPS TABLE
CREATE TABLE IF NOT EXISTS public.election_slips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  student_code TEXT,
  secure_token TEXT UNIQUE NOT NULL,
  passcode TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ELECTIONS TABLE
CREATE TABLE IF NOT EXISTS public.elections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id TEXT UNIQUE NOT NULL DEFAULT 'election-2026',
  name TEXT DEFAULT 'Smart Campus Election 2026',
  title TEXT DEFAULT 'IAMS CAMPUS ELECTION 2026',
  academic_year TEXT DEFAULT '2025-2026',
  college_name TEXT DEFAULT 'IAMS CAMPUS',
  is_active BOOLEAN DEFAULT TRUE,
  allow_selfie BOOLEAN DEFAULT TRUE,
  show_live_results BOOLEAN DEFAULT TRUE,
  voting_open BOOLEAN DEFAULT TRUE,
  result_published BOOLEAN DEFAULT FALSE,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  settings_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. POSITIONS TABLE
CREATE TABLE IF NOT EXISTS public.positions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  display_order INT DEFAULT 1,
  seats INT DEFAULT 1,
  category TEXT DEFAULT 'General',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ANNOUNCEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id TEXT UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  date TEXT,
  priority TEXT DEFAULT 'normal',
  category TEXT DEFAULT 'Notice',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. VOTES TABLE
CREATE TABLE IF NOT EXISTS public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id TEXT NOT NULL DEFAULT 'election-2026',
  student_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  position_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_student_election_vote UNIQUE (election_id, student_id)
);

-- INDEXES FOR SPEED AND INTEGRITY
CREATE INDEX IF NOT EXISTS idx_students_student_id ON public.students(student_id);
CREATE INDEX IF NOT EXISTS idx_students_slip_token ON public.students(slip_token);
CREATE INDEX IF NOT EXISTS idx_candidates_candidate_id ON public.candidates(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidates_position ON public.candidates(position_id);
CREATE INDEX IF NOT EXISTS idx_election_slips_token ON public.election_slips(secure_token);
CREATE INDEX IF NOT EXISTS idx_votes_student_election ON public.votes(election_id, student_id);

-- ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.election_slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- PUBLIC READ ACCESS POLICIES FOR ANONYMOUS/CLIENT APP ACCESS
CREATE POLICY "Allow public read access on students" ON public.students FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update access on students" ON public.students FOR ALL USING (true);

CREATE POLICY "Allow public read access on candidates" ON public.candidates FOR SELECT USING (true);
CREATE POLICY "Allow public write access on candidates" ON public.candidates FOR ALL USING (true);

CREATE POLICY "Allow public read access on election_slips" ON public.election_slips FOR SELECT USING (true);
CREATE POLICY "Allow public write access on election_slips" ON public.election_slips FOR ALL USING (true);

CREATE POLICY "Allow public read access on elections" ON public.elections FOR SELECT USING (true);
CREATE POLICY "Allow public write access on elections" ON public.elections FOR ALL USING (true);

CREATE POLICY "Allow public read access on positions" ON public.positions FOR SELECT USING (true);
CREATE POLICY "Allow public write access on positions" ON public.positions FOR ALL USING (true);

CREATE POLICY "Allow public read access on announcements" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Allow public write access on announcements" ON public.announcements FOR ALL USING (true);

CREATE POLICY "Allow public read access on votes" ON public.votes FOR SELECT USING (true);
CREATE POLICY "Allow public write access on votes" ON public.votes FOR ALL USING (true);

-- STORAGE BUCKETS FOR PHOTOS & SELFIES
INSERT INTO storage.buckets (id, name, public) VALUES ('candidate-photos', 'candidate-photos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('student-selfies', 'student-selfies', true) ON CONFLICT (id) DO NOTHING;

-- STORAGE POLICIES
CREATE POLICY "Allow public photo access" ON storage.objects FOR SELECT USING (bucket_id IN ('candidate-photos', 'student-selfies'));
CREATE POLICY "Allow photo uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('candidate-photos', 'student-selfies'));
