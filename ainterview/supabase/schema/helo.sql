-- 1. Users Table (Maps to Supabase's secure auth system)
CREATE TABLE users (
    -- Maps to auth.users in Supabase
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL
    -- Removed 'password' as Supabase Auth handles this securely under the hood
);

-- 2. Problems Table (From the previous setup)
CREATE TABLE problems (
    problem_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    memory_limit INTEGER,
    time_limit NUMERIC,
    difficulty_level TEXT CHECK (difficulty_level IN ('Easy', 'Medium', 'Hard')),
    languages TEXT[]
);

-- 3. Behavior Questions Table
CREATE TABLE behavior_questions (
    question_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    difficulty_level TEXT CHECK (difficulty_level IN ('Easy', 'Medium', 'Hard')),
    sample_answer TEXT,
    evaluation_criteria TEXT,
    common_mistakes TEXT,
    hints TEXT
);

-- 4. Sessions Table
CREATE TABLE sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    interview_type TEXT NOT NULL,
    user_role TEXT NOT NULL,
    difficulty_level TEXT CHECK (difficulty_level IN ('Easy', 'Medium', 'Hard')),
    time_created TIMESTAMPTZ DEFAULT now()
);

-- 5. Evaluations Table
CREATE TABLE evaluations (
    evaluation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(session_id) ON DELETE CASCADE,
    overall_score NUMERIC,
    communication_score NUMERIC, -- Fixed typo from 'communication_store'
    tech_score NUMERIC,
    feedback TEXT
);

-- 6. Testcases Table
CREATE TABLE testcases (
    testcase_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id UUID REFERENCES problems(problem_id) ON DELETE CASCADE,
    input TEXT NOT NULL,
    output TEXT NOT NULL,
    is_sample BOOLEAN DEFAULT false
);

-- 7. Code Submissions Table
CREATE TABLE code_submissions (
    submission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id UUID REFERENCES problems(problem_id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(session_id) ON DELETE CASCADE, -- Added to track which session/user made the submission
    source_code TEXT NOT NULL,
    language TEXT NOT NULL,
    score NUMERIC
);

-- Enable Row Level Security (RLS) across all tables for Supabase best practices
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE testcases ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_submissions ENABLE ROW LEVEL SECURITY;