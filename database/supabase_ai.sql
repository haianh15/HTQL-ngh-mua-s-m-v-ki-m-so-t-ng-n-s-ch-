-- Chạy một lần trong Supabase SQL Editor; tạo dữ liệu phục vụ phân tích AI, KHÔNG phải sổ cái ngân sách chính thức.
create table if not exists public.procure_ai_profiles (
  auth_uid uuid primary key references auth.users(id) on delete cascade,
  user_code text unique not null,
  email text not null,
  display_name text not null,
  role text not null check(role in('requester','dept_head','finance','procurement','accountant','branch_director','bod','admin')),
  branch_id text not null check(branch_id in('HQ','BR_HN','BR_HCM','BR_DN','BR_CT','BR_HP')),
  department_id text not null,
  active boolean not null default true
);
create table if not exists public.procure_ai_requests (
  pr_id text primary key,
  owner_auth_uid uuid not null references auth.users(id),
  owner_code text not null,
  branch_id text not null,
  department_id text not null,
  title text not null,
  purpose text not null default '',
  need_by text,
  budget_id text,
  items jsonb not null default '[]'::jsonb,
  amount bigint not null default 0 check(amount >=0),
  status text not null,
  updated_at timestamptz not null default now()
);
create index if not exists idx_ai_requests_scope on public.procure_ai_requests(branch_id,department_id,status);
create table if not exists public.procure_ai_budgets (
  budget_id text primary key,
  name text not null,
  branch_id text not null,
  allocated bigint not null default 0,
  adjustments bigint not null default 0,
  held bigint not null default 0,
  committed bigint not null default 0,
  used bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint nonnegative_amounts check (allocated>=0 and held>=0 and committed>=0 and used>=0),
  constraint nonnegative_available check (allocated+adjustments-held-committed-used>=0)
);
create table if not exists public.procure_ai_rate (
  auth_uid uuid not null,
  minute timestamptz not null,
  used integer not null default 0,
  primary key(auth_uid,minute)
);
create or replace function public.procure_ai_take_slot(p_uid uuid,p_max integer default 10) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  insert into public.procure_ai_rate(auth_uid,minute,used)
  values (p_uid,date_trunc('minute',now()),1)
  on conflict(auth_uid,minute) do update
    set used = procure_ai_rate.used + 1
    where procure_ai_rate.used < greatest(1,least(p_max,30))
  returning used into v_count;
  return v_count is not null;
end;
$$;
-- Bảng chuyên dùng bởi backend với service_role. Chặn truy vấn từ trình duyệt (anon/authenticated).
revoke all on public.procure_ai_profiles, public.procure_ai_requests, public.procure_ai_budgets, public.procure_ai_rate from anon, authenticated;
revoke all on function public.procure_ai_take_slot(uuid,integer) from public, anon, authenticated;
grant all on public.procure_ai_profiles, public.procure_ai_requests, public.procure_ai_budgets, public.procure_ai_rate to service_role;
grant execute on function public.procure_ai_take_slot(uuid,integer) to service_role;
alter table public.procure_ai_profiles enable row level security;
alter table public.procure_ai_requests enable row level security;
alter table public.procure_ai_budgets enable row level security;
alter table public.procure_ai_rate enable row level security;
-- Tạo tài khoản tại Supabase Auth > Users trước; sau đó nhập hồ sơ quyền bằng auth_uid UUID thật.
-- MẪU (KHÔNG CHẠY VỚI UUID GIẢ):
-- insert into public.procure_ai_profiles(auth_uid,user_code,email,display_name,role,branch_id,department_id)
-- values ('<UUID_FROM_AUTH_USERS>', 'usr_requester','minhanh.nguyen@procure.vn','Nguyễn Minh Anh','requester','HQ','DEPT_IT');
