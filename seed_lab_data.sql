-- SQL Script to Seed Lab Assistant Content
-- Run this in your Supabase SQL Editor to populate the Lab Dashboard

-- 1. Ensure we have at least one Lab Assistant profile (if not already exists)
INSERT INTO public.profiles (id, full_name, role, department, username)
SELECT auth.uid(), 'Primary Lab Assistant', 'lab', 'Computer Science', 'lab_admin'
FROM auth.users 
WHERE auth.uid() = (SELECT id FROM auth.users LIMIT 1)
ON CONFLICT (id) DO UPDATE SET role = 'lab', department = 'Computer Science';

-- 2. Create some Mock Students
DO $$
DECLARE
    student_id uuid;
BEGIN
    FOR i IN 1..5 LOOP
        INSERT INTO auth.users (id, email, raw_user_meta_data)
        VALUES (uuid_generate_v4(), 'student' || i || '@nexus.edu', jsonb_build_object('full_name', 'Student ' || i, 'role', 'student'))
        RETURNING id INTO student_id;

        INSERT INTO public.profiles (id, full_name, role, department, username, student_uid)
        VALUES (student_id, 'Student ' || i, 'student', 'Computer Science', 'student' || i, '2024CS' || LPAD(i::text, 4, '0'));

        -- 3. Add Lab Dues for these students
        INSERT INTO public.dues (student_id, department, amount, status)
        VALUES (student_id, 'Computer Science', (100 * i), 'pending');

        -- 4. Create Lab Applications
        INSERT INTO public.applications (student_id, department, status, current_stage, is_submitted, purpose)
        VALUES (student_id, 'Computer Science', 'lab_pending', 'lab', true, '{"type": "Semester End Clearance", "reason": "Academic Completion"}');

        -- 5. Seed Initial Approvals
        INSERT INTO public.approvals (application_id, role, status)
        SELECT id, 'lab', 'pending' FROM public.applications WHERE student_id = student_id;
    END LOOP;
END $$;
