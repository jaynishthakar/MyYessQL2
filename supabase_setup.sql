-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================================
-- 1. CLEANUP (Drop existing tables, triggers, and functions)
-- ============================================================================
drop policy if exists "Authorities can view all applications." on public.applications;
drop table if exists public.documents cascade;
drop table if exists public.approvals cascade;
drop table if exists public.applications cascade;
drop table if exists public.dues cascade;
drop table if exists public.profiles cascade;

drop function if exists public.handle_new_user cascade;
drop function if exists public.is_authority cascade;
drop function if exists public.seed_approvals cascade;
drop function if exists public.advance_application_stage cascade;
drop function if exists public.is_lab_for_department cascade;
drop function if exists public.is_hod_for_department cascade;

-- ============================================================================
-- 2. CORE TABLES CREATION
-- ============================================================================

-- Profiles Table (Unified User Table including student UID)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  updated_at timestamp with time zone default now(),
  username text unique,
  full_name text,
  avatar_url text,
  student_uid text,
  department text,
  role text default 'student' check (role in ('student', 'librarian', 'lab', 'hod', 'principal', 'admin')),

  constraint username_length check (char_length(username) >= 3),
  constraint student_uid_length check (student_uid is null or char_length(student_uid) = 10)
);

-- Applications Table
create table public.applications (
  id uuid not null default uuid_generate_v4() primary key,
  student_id uuid references public.profiles(id) on delete cascade,
  status text default 'lab_pending' check (status in ('lab_pending', 'hod_pending', 'principal_pending', 'approved', 'rejected')),
  current_stage text default 'lab',
  department text,
  purpose text,
  document_ids uuid[] default '{}',
  is_submitted boolean default false,
  created_at timestamp with time zone default now()
);

-- Approvals Table
create table public.approvals (
  id uuid not null default uuid_generate_v4() primary key,
  application_id uuid references public.applications(id) on delete cascade,
  role text check (role in ('librarian', 'lab', 'hod', 'principal')),
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  comment text,
  actor_id uuid references public.profiles(id) on delete set null,
  updated_at timestamp with time zone default now(),
  unique(application_id, role)
);

-- Documents Table (Application-Independent vault)
create table public.documents (
  id uuid not null default uuid_generate_v4() primary key,
  student_id uuid references public.profiles(id) on delete cascade not null,
  student_uid text, -- 10-digit text ID automatically populated via trigger
  application_id uuid references public.applications(id) on delete set null,
  file_url text not null,
  file_name text not null,
  file_type text,
  uploaded_at timestamp with time zone default now()
);

-- Dues Table
create table public.dues (
  id uuid not null default uuid_generate_v4() primary key,
  student_id uuid references public.profiles(id) on delete cascade,
  department text not null,
  amount integer default 0,
  status text default 'pending' check (status in ('pending', 'paid'))
);

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.applications enable row level security;
alter table public.approvals enable row level security;
alter table public.documents enable row level security;
alter table public.dues enable row level security;

-- ============================================================================
-- 4. DATABASE FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Helper: Authority Check
create or replace function public.is_authority()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles 
    where id = auth.uid() 
    and role in ('librarian', 'lab', 'hod', 'principal', 'admin')
  );
end;
$$ language plpgsql security definer;

-- Trigger: Auto create profile on auth signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role, student_uid, department)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    nullif(new.raw_user_meta_data->>'student_uid', ''),
    nullif(new.raw_user_meta_data->>'department', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer
set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger: Automatically stamp 10-digit student_uid onto new documents
create or replace function public.set_document_student_uid()
returns trigger as $$
begin
  NEW.student_uid := (select student_uid from public.profiles where id = NEW.student_id);
  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_document_created
  before insert on public.documents
  for each row execute procedure public.set_document_student_uid();

-- Trigger: Seed approvals when application is officially submitted
create or replace function public.seed_approvals()
returns trigger as $$
begin
  if NEW.is_submitted = true and OLD.is_submitted = false then
    insert into public.approvals (application_id, role, status)
    values
      (NEW.id, 'librarian', 'pending'),
      (NEW.id, 'lab', 'pending'),
      (NEW.id, 'hod', 'pending'),
      (NEW.id, 'principal', 'pending');
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_application_submitted
  after update on public.applications
  for each row execute procedure public.seed_approvals();

-- Trigger: Auto-advance workflow stage based on approval decisions
create or replace function public.advance_application_stage()
returns trigger as $$
begin
  if NEW.status = 'approved' and OLD.status = 'pending' then
    if NEW.role = 'librarian' then
      update public.applications
      set status = 'lab_pending', current_stage = 'lab'
      where id = NEW.application_id;
    elsif NEW.role = 'lab' then
      update public.applications
      set status = 'hod_pending', current_stage = 'hod'
      where id = NEW.application_id;
    elsif NEW.role = 'hod' then
      update public.applications
      set status = 'principal_pending', current_stage = 'principal'
      where id = NEW.application_id;
    elsif NEW.role = 'principal' then
      update public.applications
      set status = 'approved', current_stage = 'done'
      where id = NEW.application_id;
    end if;
  end if;

  if NEW.status = 'rejected' and OLD.status = 'pending' then
    update public.applications
    set status = 'rejected', current_stage = NEW.role
    where id = NEW.application_id;
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_approval_action
  after update on public.approvals
  for each row execute procedure public.advance_application_stage();

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- RLS: Profiles
create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can update own profiles." on profiles for update using (auth.uid() = id);
create policy "Users can create own profiles." on profiles for insert with check (auth.uid() = id);

-- RLS: Applications (Carefully Scoped)
create policy "Students can view their own applications." on applications for select using (auth.uid() = student_id);
create policy "Students can create applications." on applications for insert with check (auth.uid() = student_id);
create policy "Students can update own draft applications." on applications for update using (auth.uid() = student_id and is_submitted = false);

create policy "Authorities can view submitted applications" on applications for select
using (
  is_submitted = true and 
  exists (select 1 from public.profiles where id = auth.uid() and role in ('librarian', 'lab', 'hod', 'principal', 'admin'))
);

create policy "Authorities can update application stages" on applications for update
using (
  is_submitted = true and 
  exists (select 1 from public.profiles where id = auth.uid() and role in ('librarian', 'lab', 'hod', 'principal', 'admin'))
)
with check (
  is_submitted = true and 
  exists (select 1 from public.profiles where id = auth.uid() and role in ('librarian', 'lab', 'hod', 'principal', 'admin'))
);

-- RLS: Approvals (Full Authority Access)
create policy "Authorities can manage approvals" on approvals for all
using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('librarian', 'lab', 'hod', 'principal', 'admin'))
)
with check (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('librarian', 'lab', 'hod', 'principal', 'admin'))
);

create policy "Students read own approvals" on approvals for select
using (
  exists (
    select 1 from public.applications
    where applications.id = application_id
    and applications.student_id = auth.uid()
  )
);

-- ============================================================================
-- 6. DOCUMENT VAULT STORAGE SETUP
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

drop policy if exists "Owners and authorities read docs" on storage.objects;
create policy "Owners and authorities read docs" on storage.objects for select
using (
  bucket_id = 'documents' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_authority()
  )
);

drop policy if exists "Students upload own docs" on storage.objects;
create policy "Students upload own docs" on storage.objects for insert
with check (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Only students delete own docs" on storage.objects;
create policy "Only students delete own docs" on storage.objects for delete
using (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS: Documents
create policy "Students can view their own documents." on documents for select using (auth.uid() = student_id);
create policy "Students can upload their own documents." on documents for insert with check (auth.uid() = student_id);
create policy "Students can delete their own documents." on documents for delete using (auth.uid() = student_id);

create policy "Authorities can view all documents" on documents for select
using (exists (select 1 from public.profiles where id = auth.uid() and role in ('librarian', 'lab', 'hod', 'principal', 'admin')));

create policy "Authorities can manage documents" on documents for all
using (exists (select 1 from public.profiles where id = auth.uid() and role in ('librarian', 'lab', 'hod', 'principal', 'admin')))
with check (exists (select 1 from public.profiles where id = auth.uid() and role in ('librarian', 'lab', 'hod', 'principal', 'admin')));

-- RLS: Dues
create policy "Authorities can manage all dues" on dues for all
using (exists (select 1 from public.profiles where id = auth.uid() and role in ('librarian', 'lab', 'hod', 'principal', 'admin')))
with check (exists (select 1 from public.profiles where id = auth.uid() and role in ('librarian', 'lab', 'hod', 'principal', 'admin')));

create policy "Students can view their own dues." on dues for select using (auth.uid() = student_id);

create policy "Students can update their own dues status." on dues for update
using (auth.uid() = student_id)
with check (auth.uid() = student_id);


create policy "Librarians can manage dues." on dues for all
using (
  (select role from public.profiles where id = auth.uid()) in ('librarian', 'admin')
)
with check (
  (select role from public.profiles where id = auth.uid()) in ('librarian', 'admin')
);

-- ============================================================================
-- 7. REQUIRED SCHEMA GRANTS
-- ============================================================================
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all privileges on all tables in schema public to postgres, anon, authenticated, service_role;
grant all privileges on all functions in schema public to postgres, anon, authenticated, service_role;
grant all privileges on all sequences in schema public to postgres, anon, authenticated, service_role;
/*  */