-- Procure UI V13: server-authoritative transaction store. Run in Supabase SQL Editor
-- after taking a backup. No sample business records, no migration of localStorage demo data.
-- Application tables are PRIVATE; all operations are through authenticated Vercel APIs.
create sequence if not exists public.procure_v13_pr_seq;
create table if not exists public.procure_v13_budgets (
 id text primary key, name text not null, fiscal_year int not null,
 branch_id text not null, department_id text not null, department_name text not null default '',
 category text not null default 'OPERATIONS', category_name text not null default '',
 allocated bigint not null default 0, adjustments bigint not null default 0,
 held bigint not null default 0, committed bigint not null default 0, used bigint not null default 0,
 check (allocated>=0 and held>=0 and committed>=0 and used>=0),
 check (allocated+adjustments-held-committed-used>=0)
);
create table if not exists public.procure_v13_requests (
 id text primary key, owner_uid uuid not null references auth.users(id),
 branch_id text not null, department_id text not null,
 budget_id text not null references public.procure_v13_budgets(id),
 assignee_uid uuid references auth.users(id), amount bigint not null check (amount>=0),
 status text not null, step_index int not null default 0,
 data jsonb not null, row_version bigint not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists v13_req_assignee on public.procure_v13_requests(assignee_uid,status);
create index if not exists v13_req_owner on public.procure_v13_requests(owner_uid,updated_at desc);
create index if not exists v13_req_branch on public.procure_v13_requests(branch_id,status);
create table if not exists public.procure_v13_transfers (
 id text primary key, branch_id text not null, created_by_uid uuid not null references auth.users(id),
 status text not null default 'PENDING_APPROVAL', data jsonb not null, created_at timestamptz not null default now()
);
create table if not exists public.procure_v13_batches (
 id text primary key, created_by_uid uuid not null references auth.users(id),branch_id text not null,
 status text not null default 'PREVIEW', data jsonb not null, created_at timestamptz not null default now()
);
create table if not exists public.procure_v13_invoices (
 invoice_no text primary key, pr_id text not null references public.procure_v13_requests(id),
 budget_id text not null references public.procure_v13_budgets(id), amount bigint not null check(amount>0),
 batch_id text not null references public.procure_v13_batches(id),created_at timestamptz not null default now()
);
create table if not exists public.procure_v13_ledger (
 id uuid primary key default gen_random_uuid(), budget_id text not null references public.procure_v13_budgets(id),
 transaction_type text not null, amount bigint not null check(amount>0),pr_id text,
 actor_uid uuid not null references auth.users(id), details text not null default '',
 balance_before bigint not null, balance_after bigint not null, created_at timestamptz not null default now()
);
create table if not exists public.procure_v13_audit (
 id uuid primary key default gen_random_uuid(),actor_uid uuid not null references auth.users(id),
 branch_id text not null,action text not null, entity_type text not null, entity_id text not null,
 details text not null default '',created_at timestamptz not null default now()
);
create table if not exists public.procure_v13_notifications (
 id uuid primary key default gen_random_uuid(),recipient_uid uuid not null references auth.users(id),
 title text not null, body text not null default '',pr_id text,read boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists public.procure_v13_delegations (
 id uuid primary key default gen_random_uuid(),from_uid uuid not null references auth.users(id),
 to_uid uuid not null references auth.users(id),role text not null,branch_id text not null,
 department_id text,starts_on date not null,ends_on date not null,max_amount bigint,
 active boolean not null default true,check(starts_on<=ends_on),check(from_uid<>to_uid)
);
-- Defend against accidental direct browser access. Server service_role is the only API principal.
do $$ declare t text; begin
 foreach t in array array['procure_v13_budgets','procure_v13_requests','procure_v13_transfers','procure_v13_batches','procure_v13_invoices','procure_v13_ledger','procure_v13_audit','procure_v13_notifications','procure_v13_delegations'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on table public.%I from anon,authenticated',t);
  execute format('grant all on table public.%I to service_role',t);
 end loop;
end $$;
revoke all on sequence public.procure_v13_pr_seq from public,anon,authenticated;
grant usage,select on sequence public.procure_v13_pr_seq to service_role;
-- IMPORTANT: this function returns only a role-filtered projection.
create or replace function public.procure_v13_state(p_uid uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare a public.procure_ai_profiles%rowtype; out jsonb;
begin
 select * into a from public.procure_ai_profiles where auth_uid=p_uid and active;
 if not found then raise exception 'Tài khoản chưa được cấp quyền' using errcode='42501';end if;
 select jsonb_build_object(
  'users',coalesce((select jsonb_agg(jsonb_build_object('id',p.user_code,'name',p.display_name,'email',p.email,'roles',jsonb_build_array(p.role),'branchId',p.branch_id,'departmentId',p.department_id,'departmentName',p.department_id,'title',p.role,'isActive',p.active)) from public.procure_ai_profiles p where (a.role='admin' and p.branch_id=a.branch_id) or (p.active and ((p.branch_id=a.branch_id) or a.role='bod')) or p.auth_uid=p_uid),'[]'::jsonb),
  'purchaseRequests',coalesce((select jsonb_agg(r.data order by r.updated_at desc) from public.procure_v13_requests r where
    r.owner_uid=p_uid or
    (r.assignee_uid=p_uid and r.status in('PENDING_DEPT','PENDING_FINANCE','PENDING_FINAL')) or
    (a.role in('procurement','accountant') and r.branch_id=a.branch_id and r.status in('APPROVED','IN_PROGRESS','COMPLETED')) or
    (a.role='finance' and r.branch_id=a.branch_id and (r.status='WAITING_FUNDS' or (r.status='IN_PROGRESS' and r.amount>coalesce((r.data->'execution'->>'actualOrderedAmount')::bigint,0)+coalesce((r.data->'execution'->>'releasedAmount')::bigint,0)))) or
    (a.role in('dept_head','finance','branch_director','bod') and r.status in('PENDING_DEPT','PENDING_FINANCE','PENDING_FINAL') and exists(select 1 from public.procure_v13_delegations d where d.active and d.to_uid=p_uid and d.from_uid=r.assignee_uid and d.role=a.role and current_date between d.starts_on and d.ends_on and d.branch_id=r.branch_id and (d.department_id is null or d.department_id=r.department_id) and (d.max_amount is null or r.amount<=d.max_amount))
  )),'[]'::jsonb),
  'budgetPools',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'fiscalYear',b.fiscal_year,'branchId',b.branch_id,'departmentId',b.department_id,'departmentName',b.department_name,'category',b.category,'categoryName',b.category_name,'allocated',case when a.role in('bod','finance','branch_director','accountant') then b.allocated else 0 end,'adjustments',case when a.role in('bod','finance','branch_director','accountant') then b.adjustments else 0 end,'held',case when a.role in('bod','finance','branch_director','accountant') then b.held else 0 end,'committed',case when a.role in('bod','finance','branch_director','accountant') then b.committed else 0 end,'used',case when a.role in('bod','finance','branch_director','accountant') then b.used else 0 end)) from public.procure_v13_budgets b where a.role='bod' or b.branch_id=a.branch_id and (a.role in('finance','branch_director','accountant','procurement') or b.department_id=a.department_id)),'[]'::jsonb),
  'transfers',coalesce((select jsonb_agg(t.data order by t.created_at desc) from public.procure_v13_transfers t where a.role='bod' or (a.role='finance' and t.branch_id=a.branch_id)),'[]'::jsonb),
  'accountingBatches',coalesce((select jsonb_agg(b.data order by b.created_at desc) from public.procure_v13_batches b where a.role='accountant' and b.branch_id=a.branch_id),'[]'::jsonb),
  'ledgerEntries',coalesce((select jsonb_agg(jsonb_build_object('id',l.id::text,'timestamp',to_char(l.created_at,'DD/MM/YYYY HH24:MI:SS'),'budgetId',l.budget_id,'budgetName',b.name,'transactionType',l.transaction_type,'amount',l.amount,'referencePrId',l.pr_id,'performedBy',p.display_name,'notes',l.details,'balanceBefore',l.balance_before,'balanceAfter',l.balance_after) order by l.created_at desc) from public.procure_v13_ledger l join public.procure_v13_budgets b on b.id=l.budget_id join public.procure_ai_profiles p on p.auth_uid=l.actor_uid where a.role in('bod','finance','accountant','branch_director') and (a.role='bod' or b.branch_id=a.branch_id)),'[]'::jsonb),
  'notifications',coalesce((select jsonb_agg(jsonb_build_object('id',n.id::text,'userId',a.user_code,'title',n.title,'message',n.body,'type','TASK_TURN','referenceId',n.pr_id,'targetPrId',n.pr_id,'priority','HIGH','isRead',n.read,'createdAt',to_char(n.created_at,'DD/MM/YYYY HH24:MI:SS')) order by n.created_at desc) from public.procure_v13_notifications n where n.recipient_uid=p_uid),'[]'::jsonb),
  'delegations',coalesce((select jsonb_agg(jsonb_build_object('id',d.id::text,'fromUserId',p.user_code,'fromUserName',p.display_name,'toUserId',q.user_code,'toUserName',q.display_name,'role',d.role,'scopeBranchId',d.branch_id,'scopeDeptId',d.department_id,'startDate',to_char(d.starts_on,'DD/MM/YYYY'),'endDate',to_char(d.ends_on,'DD/MM/YYYY'),'maxAmountLimit',d.max_amount,'isActive',d.active)) from public.procure_v13_delegations d join public.procure_ai_profiles p on p.auth_uid=d.from_uid join public.procure_ai_profiles q on q.auth_uid=d.to_uid where d.to_uid=p_uid or d.from_uid=p_uid or (a.role='admin' and d.branch_id=a.branch_id)),'[]'::jsonb),
  'auditLogs',coalesce((select jsonb_agg(jsonb_build_object('id',au.id::text,'timestamp',to_char(au.created_at,'DD/MM/YYYY HH24:MI:SS'),'userId',p.user_code,'userName',p.display_name,'userRole',p.role,'ipAddress','not-collected','action',au.action,'targetEntity',au.entity_type,'targetId',au.entity_id,'details',au.details) order by au.created_at desc) from public.procure_v13_audit au join public.procure_ai_profiles p on p.auth_uid=au.actor_uid where a.role='admin' and au.branch_id=a.branch_id),'[]'::jsonb)
 ) into out;
 return out;
end $$;
revoke all on function public.procure_v13_state(uuid) from public,anon,authenticated;
grant execute on function public.procure_v13_state(uuid) to service_role;
-- Resolve approver from verified staff profiles, never from browser input.
create or replace function public.procure_v13_reviewer(p_role text,p_branch text,p_dept text,p_exclude uuid)
returns public.procure_ai_profiles language sql stable security definer set search_path=public as $$
 select p from public.procure_ai_profiles p
 where p.active and p.role=p_role and p.auth_uid<>p_exclude
 and (p_role='bod' or p.branch_id=p_branch)
 and (p_role<>'dept_head' or p.department_id=p_dept)
 order by p.user_code limit 1;
$$;
create or replace function public.procure_v13_route(p_role text,p_branch text,p_dept text,p_creator uuid,p_amount bigint)
returns jsonb language plpgsql security definer set search_path=public as $$
declare steps jsonb:='[]'::jsonb; a public.procure_ai_profiles%rowtype; final_role text;
begin
 if p_role='requester' then
  select * into a from public.procure_v13_reviewer('dept_head',p_branch,p_dept,p_creator);
  if a.auth_uid is null then raise exception 'Chưa có trưởng phòng được phân công' using errcode='23514';end if;
  steps:=steps||jsonb_build_array(jsonb_build_object('step','DEPT_CONFIRMATION','stepName','Trưởng phòng xác nhận nhu cầu','assignedRole','dept_head','assignedToUserId',a.user_code,'assignedToEmail',a.email,'assignedToName',a.display_name,'status','PENDING'));
 end if;
 select * into a from public.procure_v13_reviewer('finance',p_branch,p_dept,p_creator);
 if a.auth_uid is null then raise exception 'Chưa có tài chính được phân công' using errcode='23514';end if;
 steps:=steps||jsonb_build_array(jsonb_build_object('step','FINANCE_CHECK','stepName','Tài chính kiểm tra ngân sách','assignedRole','finance','assignedToUserId',a.user_code,'assignedToEmail',a.email,'assignedToName',a.display_name,'status','PENDING'));
 final_role:=case when p_amount>=50000000 then 'bod' when p_amount>=10000000 then 'branch_director' when p_role='requester' then 'dept_head' else null end;
 if final_role='branch_director' and (select (public.procure_v13_reviewer('branch_director',p_branch,p_dept,p_creator)).auth_uid) is null then final_role:='bod';end if;
 if final_role is not null then
  select * into a from public.procure_v13_reviewer(final_role,p_branch,p_dept,p_creator);
  if a.auth_uid is null then raise exception 'Chưa có cấp duyệt cuối được phân công' using errcode='23514';end if;
  steps:=steps||jsonb_build_array(jsonb_build_object('step','FINAL_APPROVAL','stepName',case when final_role='bod' then 'Ban Giám đốc phê duyệt' when final_role='branch_director' then 'Giám đốc chi nhánh phê duyệt' else 'Trưởng đơn vị phê duyệt' end,'assignedRole',final_role,'assignedToUserId',a.user_code,'assignedToEmail',a.email,'assignedToName',a.display_name,'status','PENDING'));
 end if;
 return steps;
end $$;
create or replace function public.procure_v13_assignee(p_step jsonb) returns uuid
language sql stable security definer set search_path=public as $$
 select auth_uid from public.procure_ai_profiles where active and user_code=p_step->>'assignedToUserId' and role=p_step->>'assignedRole' limit 1;
$$;
-- All mutations are atomic, permission-checked and versioned on the server.
create or replace function public.procure_v13_mutate(p_uid uuid,p_action text,p_data jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare a public.procure_ai_profiles%rowtype; r public.procure_v13_requests%rowtype;
 b public.procure_v13_budgets%rowtype; b2 public.procure_v13_budgets%rowtype;
 t public.procure_v13_transfers%rowtype; batch public.procure_v13_batches%rowtype;
 steps jsonb; step jsonb; doc jsonb; e jsonb; items jsonb; versions jsonb;
 pr_id text; budget_id text; transfer_id text; n bigint; total bigint; delta bigint; avail bigint; before_balance bigint;
 idx int; role text; comment text; approver uuid; next_uid uuid;
 candidate public.procure_ai_profiles%rowtype; current_year int:=extract(year from now())::int;
 invoice text; seen text[]:='{}'; rows jsonb:='[]'::jsonb; checked jsonb; valstat text;
 remaining bigint; v text; decision text; from_id text; to_id text;
begin
 if p_data is null or jsonb_typeof(p_data)<>'object' then raise exception 'Dữ liệu yêu cầu không hợp lệ' using errcode='22023';end if;
 select * into a from public.procure_ai_profiles where auth_uid=p_uid and active;
 if a.auth_uid is null then raise exception 'Tài khoản chưa được cấp quyền' using errcode='42501';end if;
 pr_id:=left(p_data->>'prId',120); comment:=left(coalesce(p_data->>'comments',''),2000);
 if p_action in('PR_CREATE','PR_UPDATE','PR_SUBMIT','PR_REVISE') then
  if p_action='PR_CREATE' and a.role not in('requester','finance','branch_director','bod') then raise exception 'Không có quyền tạo đề nghị' using errcode='42501';end if;
  if p_action<>'PR_CREATE' then
   select * into r from public.procure_v13_requests where id=pr_id for update;
   if r.id is null or r.owner_uid<>p_uid then raise exception 'Không có quyền cập nhật đề nghị' using errcode='42501';end if;
   if p_action='PR_REVISE' and r.status<>'REVISION_REQUESTED' then raise exception 'Chỉ được bổ sung hồ sơ khi được yêu cầu' using errcode='23514';end if;
   if p_action in('PR_UPDATE','PR_SUBMIT') and r.status<>'DRAFT' then raise exception 'Hồ sơ không còn là bản nháp' using errcode='23514';end if;
  end if;
  doc:=coalesce(p_data->'request','{}'::jsonb);
  if p_action='PR_SUBMIT' and doc='{}'::jsonb then doc:=r.data;end if;
  if p_action='PR_REVISE' then
   doc:=r.data||jsonb_build_object('items',p_data->'items','purpose',coalesce(p_data->>'purpose',r.data->>'purpose'));
  end if;
  if length(trim(coalesce(doc->>'title','')))>200 or length(coalesce(doc->>'purpose',''))>4000 or length(coalesce(doc->>'needByDate',''))>30 then raise exception 'Nội dung đề nghị quá dài' using errcode='23514';end if;
  budget_id:=coalesce(doc->>'budgetId','');
  if p_action='PR_SUBMIT' then budget_id:=r.budget_id;end if;
  select * into b from public.procure_v13_budgets where id=budget_id and branch_id=a.branch_id and department_id=a.department_id;
  if b.id is null then raise exception 'Nguồn ngân sách không thuộc phòng ban' using errcode='42501';end if;
  items:=coalesce(doc->'items','[]'::jsonb);
  if jsonb_typeof(items)<>'array' or jsonb_array_length(items)>100 then raise exception 'Hạng mục đề nghị không hợp lệ' using errcode='23514';end if;
  total:=0;
  for e in select value from jsonb_array_elements(items) loop
   if coalesce(e->>'name','')='' or length(e->>'name')>300 or
    (e->>'quantity') is null or (e->>'unitPrice') is null or (e->>'taxRate') is null or
    (e->>'quantity')!~'^[0-9]+$' or (e->>'unitPrice')!~'^[0-9]+$' or (e->>'taxRate')!~'^[0-9]+$' then
    raise exception 'Thông tin hạng mục không hợp lệ' using errcode='23514';end if;
   if (e->>'quantity')::numeric<1 or (e->>'quantity')::numeric>1000000 or (e->>'unitPrice')::numeric>100000000000 or (e->>'taxRate')::numeric>100 then
    raise exception 'Số lượng, đơn giá hoặc thuế không hợp lệ' using errcode='23514';end if;
   n:=round((e->>'quantity')::numeric*(e->>'unitPrice')::numeric*(1+(e->>'taxRate')::numeric/100))::bigint;
   if (e->>'totalPrice') is null or (e->>'totalPrice')::numeric<>n then raise exception 'Thành tiền hạng mục phải được tính trên máy chủ' using errcode='23514';end if;
   total:=total+n;
   if total>1000000000000 then raise exception 'Tổng tiền vượt giới hạn' using errcode='23514';end if;
  end loop;
  if p_action='PR_CREATE' then
   pr_id:=format('PR-%s-%s',current_year,lpad(nextval('public.procure_v13_pr_seq')::text,6,'0'));
   doc:=doc||jsonb_build_object('id',pr_id,'createdById',a.user_code,'createdByName',a.display_name,'createdByEmail',a.email,'createdAt',to_char(now(),'DD/MM/YYYY HH24:MI:SS'),'branchId',a.branch_id,'departmentId',a.department_id,'departmentName',a.department_id);
  end if;
  if p_action in('PR_CREATE','PR_UPDATE','PR_REVISE') then
   if trim(coalesce(doc->>'title',''))='' then raise exception 'Thiếu tên đề nghị' using errcode='23514';end if;
  end if;
  if p_action<>'PR_UPDATE' and coalesce(p_data->>'isDraft','false')<>'true' then
   if total<=0 or trim(coalesce(doc->>'purpose',''))='' then raise exception 'Hồ sơ gửi duyệt thiếu nội dung' using errcode='23514';end if;
   steps:=public.procure_v13_route(a.role,a.branch_id,a.department_id,p_uid,total);
   step:=steps->0;next_uid:=public.procure_v13_assignee(step);
   if next_uid is null then raise exception 'Không tìm thấy người duyệt phù hợp' using errcode='23514';end if;
   v:=case step->>'step' when 'DEPT_CONFIRMATION' then 'PENDING_DEPT' when 'FINANCE_CHECK' then 'PENDING_FINANCE' else 'PENDING_FINAL' end;
  else
   steps:='[]'::jsonb;next_uid:=null;v:='DRAFT';
  end if;
  if p_action='PR_CREATE' then
   doc:=doc||jsonb_build_object('status',v,'items',items,'totalAmount',total,'budgetId',b.id,'budgetName',b.name,'attachments','[]'::jsonb,'approvalTimeline',steps,'currentStepIndex',0,'currentAssigneeRole',coalesce(step->>'assignedRole','finance'),'currentAssigneeName',step->>'assignedToName','currentVersion',1,'effectiveVersion',1,'updatedAt',to_char(now(),'DD/MM/YYYY HH24:MI:SS'),'execution',jsonb_build_object('status','NOT_RECEIVED','actualOrderedAmount',0,'actualRecordedAmount',0,'releasedAmount',0));
   doc:=doc||jsonb_build_object('versions',jsonb_build_array(jsonb_build_object('versionNumber',1,'createdAt',to_char(now(),'DD/MM/YYYY HH24:MI:SS'),'createdBy',a.user_code,'createdByName',a.display_name,'changeSummary','Khởi tạo đề nghị','items',items,'subtotal',total,'totalTax',0,'totalAmount',total,'isEffective',false)));
   insert into public.procure_v13_requests(id,owner_uid,branch_id,department_id,budget_id,assignee_uid,amount,status,step_index,data)
   values(pr_id,p_uid,a.branch_id,a.department_id,b.id,next_uid,total,v,0,doc);
  else
   if p_action='PR_UPDATE' then
    v:='DRAFT'; steps:='[]'::jsonb;next_uid:=null;
   end if;
   if p_action='PR_REVISE' then
    versions:=coalesce(r.data->'versions','[]'::jsonb)||jsonb_build_array(jsonb_build_object('versionNumber',coalesce((r.data->>'currentVersion')::int,1)+1,'createdAt',to_char(now(),'DD/MM/YYYY HH24:MI:SS'),'createdBy',a.user_code,'createdByName',a.display_name,'changeSummary',left(coalesce(p_data->>'changeSummary','Bổ sung hồ sơ'),1000),'items',items,'totalAmount',total,'subtotal',total,'totalTax',0,'isEffective',false));
    doc:=doc||jsonb_build_object('versions',versions,'currentVersion',coalesce((r.data->>'currentVersion')::int,1)+1);
   else
    doc:=doc||jsonb_build_object('versions',r.data->'versions','currentVersion',r.data->'currentVersion');
   end if;
   if p_action='PR_UPDATE' then
    doc:=doc||jsonb_build_object('approvalTimeline',r.data->'approvalTimeline','currentStepIndex',0,'currentAssigneeRole',r.data->'currentAssigneeRole','currentAssigneeName',r.data->'currentAssigneeName');
   else
    doc:=doc||jsonb_build_object('approvalTimeline',steps,'currentStepIndex',0,'currentAssigneeRole',step->>'assignedRole','currentAssigneeName',step->>'assignedToName');
   end if;
   doc:=r.data||jsonb_build_object('title',doc->>'title','purpose',doc->>'purpose','needByDate',doc->>'needByDate','budgetId',b.id,'budgetName',b.name,'attachments','[]'::jsonb,'items',items,'totalAmount',total,'approvalTimeline',doc->'approvalTimeline','currentStepIndex',0,'currentAssigneeRole',doc->>'currentAssigneeRole','currentAssigneeName',doc->>'currentAssigneeName','versions',doc->'versions','currentVersion',doc->'currentVersion','status',v,'updatedAt',to_char(now(),'DD/MM/YYYY HH24:MI:SS'));
   update public.procure_v13_requests set data=doc,budget_id=b.id,amount=total,status=v,step_index=0,assignee_uid=next_uid,updated_at=now(),row_version=row_version+1 where id=pr_id;
  end if;
  if next_uid is not null then
   insert into public.procure_v13_notifications(recipient_uid,title,body,pr_id)values(next_uid,'Có đề nghị chờ xử lý',format('Đề nghị %s cần phê duyệt.',pr_id),pr_id);
  end if;
 elsif p_action='APPROVAL' then
  select * into r from public.procure_v13_requests where id=pr_id for update;
  if r.id is null or r.owner_uid=p_uid or r.status not in('PENDING_DEPT','PENDING_FINANCE','PENDING_FINAL') then raise exception 'Hồ sơ không ở bước được duyệt' using errcode='42501';end if;
  if r.assignee_uid is distinct from p_uid and not exists(select 1 from public.procure_v13_delegations d where d.active and d.to_uid=p_uid and d.from_uid=r.assignee_uid and d.role=a.role and current_date between d.starts_on and d.ends_on and d.branch_id=r.branch_id and (d.department_id is null or d.department_id=r.department_id) and (d.max_amount is null or r.amount<=d.max_amount)) then raise exception 'Bạn không phải người được giao duyệt' using errcode='42501';end if;
  steps:=r.data->'approvalTimeline';idx:=r.step_index;step:=steps->idx;
  if step is null or step->>'status'<>'PENDING' or step->>'assignedRole'<>a.role then raise exception 'Bước duyệt không còn hợp lệ' using errcode='23514';end if;
  decision:=p_data->>'decision';
  if decision not in('APPROVED','REJECTED','REVISION_REQUESTED') then raise exception 'Quyết định không hợp lệ' using errcode='23514';end if;
  if decision<>'APPROVED' and trim(comment)='' then raise exception 'Phải nhập lý do' using errcode='23514';end if;
  step:=step||jsonb_build_object('status',decision,'decidedAt',to_char(now(),'DD/MM/YYYY HH24:MI:SS'),'decidedBy',a.user_code,'decidedByName',a.display_name,'comments',comment,'reasonCode',left(coalesce(p_data->>'reasonCode',''),60));
  steps:=jsonb_set(steps,array[idx::text],step);
  if decision='REJECTED' then v:='REJECTED';next_uid:=null;
  elsif decision='REVISION_REQUESTED' then v:='REVISION_REQUESTED';next_uid:=null;
  elsif idx+1<jsonb_array_length(steps) then
   idx:=idx+1;step:=steps->idx;next_uid:=public.procure_v13_assignee(step);
   if next_uid is null then raise exception 'Cấp duyệt tiếp theo không còn hoạt động' using errcode='23514';end if;
   v:=case step->>'step' when 'DEPT_CONFIRMATION' then 'PENDING_DEPT' when 'FINANCE_CHECK' then 'PENDING_FINANCE' else 'PENDING_FINAL' end;
  else
   -- Single transaction: row-level budget lock prevents double-reservation across users.
   select * into b from public.procure_v13_budgets where id=r.budget_id for update;
   if b.id is null then raise exception 'Nguồn ngân sách không tồn tại' using errcode='23503';end if;
   avail:=b.allocated+b.adjustments-b.held-b.committed-b.used;
   if avail<r.amount then
    update public.procure_v13_requests set status='WAITING_FUNDS',assignee_uid=null,data=r.data||jsonb_build_object('status','WAITING_FUNDS','updatedAt',to_char(now(),'DD/MM/YYYY HH24:MI:SS')),row_version=row_version+1,updated_at=now() where id=r.id;
    insert into public.procure_v13_notifications(recipient_uid,title,body,pr_id)values(r.owner_uid,'Đề nghị đang chờ nguồn',format('Ngân sách không đủ cho %s',r.id),r.id);
    insert into public.procure_v13_audit(actor_uid,branch_id,action,entity_type,entity_id,details)values(p_uid,r.branch_id,'WAITING_FUNDS','PURCHASE_REQUEST',r.id,'Không đủ nguồn ngân sách');
    return jsonb_build_object('ok',false,'message','Không đủ ngân sách; hồ sơ chuyển sang CHỜ NGUỒN.');
   end if;
   update public.procure_v13_budgets set held=held+r.amount where id=b.id;
   insert into public.procure_v13_ledger(budget_id,transaction_type,amount,pr_id,actor_uid,details,balance_before,balance_after)
   values(b.id,'HOLD_PR',r.amount,r.id,p_uid,'Giữ ngân sách khi duyệt cuối',avail,avail-r.amount);
   v:='APPROVED';next_uid:=null;idx:=idx+1;
  end if;
  doc:=r.data||jsonb_build_object('approvalTimeline',steps,'status',v,'currentStepIndex',idx,'currentAssigneeRole',case when v='APPROVED' then 'procurement' when v='REVISION_REQUESTED' then 'requester' when next_uid is not null then (steps->idx)->>'assignedRole' else null end,'currentAssigneeName',case when next_uid is not null then (steps->idx)->>'assignedToName' when v='REVISION_REQUESTED' then r.data->>'createdByName' else null end,'updatedAt',to_char(now(),'DD/MM/YYYY HH24:MI:SS'));
  if v='APPROVED' then
   doc:=doc||jsonb_build_object('effectiveVersion',doc->'currentVersion','versions',(select jsonb_agg(case when (q.value->>'versionNumber')::int=(doc->>'currentVersion')::int then q.value||jsonb_build_object('isEffective',true) else q.value||jsonb_build_object('isEffective',false) end) from jsonb_array_elements(doc->'versions') as q(value)));
  end if;
  update public.procure_v13_requests set data=doc,status=v,step_index=idx,assignee_uid=next_uid,row_version=row_version+1,updated_at=now() where id=r.id;
  insert into public.procure_v13_notifications(recipient_uid,title,body,pr_id) values(coalesce(next_uid,r.owner_uid),case when next_uid is null then 'Kết quả phê duyệt' else 'Đến lượt phê duyệt' end,format('Hồ sơ %s: %s',r.id,v),r.id);
 elsif p_action='BUDGET_RECHECK' then
  if a.role<>'finance' then raise exception 'Chỉ Tài chính có quyền rà soát hồ sơ chờ nguồn' using errcode='42501';end if;
  select * into r from public.procure_v13_requests where id=pr_id for update;
  if r.id is null or r.branch_id<>a.branch_id or r.status<>'WAITING_FUNDS' then raise exception 'Hồ sơ không còn chờ nguồn' using errcode='23514';end if;
  select * into b from public.procure_v13_budgets where id=r.budget_id for update;
  if b.id is null or b.allocated+b.adjustments-b.held-b.committed-b.used<r.amount then raise exception 'Ngân sách vẫn chưa đủ để trình duyệt lại' using errcode='23514';end if;
  step:=r.data->'approvalTimeline'->r.step_index;
  next_uid:=public.procure_v13_assignee(step);
  if next_uid is null then raise exception 'Người duyệt cuối hiện không khả dụng' using errcode='23514';end if;
  v:=case step->>'step' when 'DEPT_CONFIRMATION' then 'PENDING_DEPT' when 'FINANCE_CHECK' then 'PENDING_FINANCE' else 'PENDING_FINAL' end;
  update public.procure_v13_requests set status=v,assignee_uid=next_uid,data=data||jsonb_build_object('status',v,'updatedAt',to_char(now(),'DD/MM/YYYY HH24:MI:SS')),row_version=row_version+1,updated_at=now() where id=r.id;
  insert into public.procure_v13_notifications(recipient_uid,title,body,pr_id)values(next_uid,'Nguồn đã đủ: cần duyệt lại','Hồ sơ '||r.id||' đã được bổ sung ngân sách; cần phê duyệt lại.',r.id);
 elsif p_action='PR_CANCEL' then
  select * into r from public.procure_v13_requests where id=pr_id for update;
  if r.id is null or r.owner_uid<>p_uid or r.status not in('DRAFT','REJECTED','REVISION_REQUESTED','WAITING_FUNDS') then raise exception 'Không thể hủy hồ sơ đã phê duyệt' using errcode='42501';end if;
  update public.procure_v13_requests set status='CANCELLED',assignee_uid=null,data=data||jsonb_build_object('status','CANCELLED','updatedAt',to_char(now(),'DD/MM/YYYY HH24:MI:SS')),row_version=row_version+1,updated_at=now() where id=pr_id;
 elsif p_action in('PROC_RECEIVE','PROC_ORDER','BUDGET_RELEASE') then
  select * into r from public.procure_v13_requests where id=pr_id for update;
  if r.id is null or r.branch_id<>a.branch_id or r.status not in('APPROVED','IN_PROGRESS') then raise exception 'Hồ sơ chưa đủ điều kiện mua hàng' using errcode='42501';end if;
  select * into b from public.procure_v13_budgets where id=r.budget_id for update;
  doc:=r.data; e:=coalesce(doc->'execution','{}'::jsonb);
  if p_action='PROC_RECEIVE' then
   if a.role<>'procurement' then raise exception 'Chỉ Mua hàng được tiếp nhận' using errcode='42501';end if;
   e:=e||jsonb_build_object('receivedAt',to_char(now(),'DD/MM/YYYY HH24:MI:SS'),'receivedBy',a.display_name,'status','NOT_RECEIVED');
  elsif p_action='PROC_ORDER' then
   if a.role<>'procurement' or not (e?'receivedAt') then raise exception 'Cần Mua hàng tiếp nhận trước' using errcode='42501';end if;
   total:=(p_data->>'amount')::bigint; n:=coalesce((e->>'actualOrderedAmount')::bigint,0);delta:=total-n;
   if delta<=0 or total>r.amount-coalesce((e->>'releasedAmount')::bigint,0) or delta>b.held then raise exception 'Số tiền đặt hàng không hợp lệ hoặc vượt ngân sách giữ' using errcode='23514';end if;
   update public.procure_v13_budgets set held=held-delta,committed=committed+delta where id=b.id;
   e:=e||jsonb_build_object('actualOrderedAmount',total,'poReference',left(p_data->>'poRef',80),'supplierName',left(p_data->>'supplierName',200),'status','ORDERED');
   insert into public.procure_v13_ledger(budget_id,transaction_type,amount,pr_id,actor_uid,details,balance_before,balance_after)values(b.id,'HOLD_TO_COMMIT',delta,r.id,p_uid,'Đặt hàng theo PO',b.held,b.held-delta);
  else
   if a.role<>'finance' then raise exception 'Chỉ Tài chính được giải phóng số giữ' using errcode='42501';end if;
   if not(e?'receivedAt') then raise exception 'Mua hàng chưa tiếp nhận' using errcode='23514';end if;
   n:=(p_data->>'amount')::bigint;
   remaining:=r.amount-coalesce((e->>'actualOrderedAmount')::bigint,0)-coalesce((e->>'releasedAmount')::bigint,0);
   if n<=0 or n>remaining or n>b.held or trim(comment)='' then raise exception 'Số giải phóng hoặc lý do không hợp lệ' using errcode='23514';end if;
   update public.procure_v13_budgets set held=held-n where id=b.id;
   e:=e||jsonb_build_object('releasedAmount',coalesce((e->>'releasedAmount')::bigint,0)+n,'releaseReason',comment);
   insert into public.procure_v13_ledger(budget_id,transaction_type,amount,pr_id,actor_uid,details,balance_before,balance_after)values(b.id,'RELEASE_UNCOMMITTED',n,r.id,p_uid,comment,b.held,b.held-n);
  end if;
  doc:=doc||jsonb_build_object('execution',e,'status','IN_PROGRESS','updatedAt',to_char(now(),'DD/MM/YYYY HH24:MI:SS'));
  update public.procure_v13_requests set data=doc,status='IN_PROGRESS',row_version=row_version+1,updated_at=now() where id=r.id;
 elsif p_action='TRANSFER_REQUEST' then
  if a.role<>'finance' then raise exception 'Chỉ Tài chính được đề xuất chuyển nguồn' using errcode='42501';end if;
  from_id:=p_data->>'fromBudgetId';to_id:=p_data->>'toBudgetId';n:=(p_data->>'amount')::bigint;
  if from_id=to_id or n<=0 or trim(comment)='' then raise exception 'Thông tin điều chuyển không hợp lệ' using errcode='23514';end if;
  select * into b from public.procure_v13_budgets where id=from_id and branch_id=a.branch_id;
  select * into b2 from public.procure_v13_budgets where id=to_id and branch_id=a.branch_id;
  if b.id is null or b2.id is null or b.allocated+b.adjustments-b.held-b.committed-b.used<n then raise exception 'Ngân sách chuyển không hợp lệ hoặc không đủ khả dụng' using errcode='23514';end if;
  transfer_id:='TRF-'||gen_random_uuid()::text;
  doc:=jsonb_build_object('id',transfer_id,'fiscalYear',current_year,'fromBudgetId',b.id,'fromBudgetName',b.name,'toBudgetId',b2.id,'toBudgetName',b2.name,'amount',n,'reason',comment,'effectiveDate',to_char(now(),'DD/MM/YYYY'),'createdBy',a.user_code,'createdByName',a.display_name,'createdAt',to_char(now(),'DD/MM/YYYY HH24:MI:SS'),'status','PENDING_APPROVAL','supportingDocName',left(coalesce(p_data->>'docName',''),255));
  insert into public.procure_v13_transfers(id,branch_id,created_by_uid,data)values(transfer_id,a.branch_id,p_uid,doc);
 elsif p_action='TRANSFER_DECIDE' then
  if a.role<>'bod' then raise exception 'Chỉ Ban Giám đốc được duyệt điều chuyển' using errcode='42501';end if;
  select * into t from public.procure_v13_transfers where id=p_data->>'transferId' for update;
  if t.id is null or t.status<>'PENDING_APPROVAL' then raise exception 'Đề xuất điều chuyển không còn chờ duyệt' using errcode='23514';end if;
  decision:=p_data->>'decision';if decision not in('APPROVED','REJECTED') then raise exception 'Quyết định không hợp lệ' using errcode='23514';end if;
  if decision='APPROVED' then
   from_id:=t.data->>'fromBudgetId';to_id:=t.data->>'toBudgetId';n:=(t.data->>'amount')::bigint;
   perform 1 from public.procure_v13_budgets where id in(from_id,to_id) order by id for update;
   select * into b from public.procure_v13_budgets where id=from_id;
   select * into b2 from public.procure_v13_budgets where id=to_id;
   if b.id is null or b2.id is null or b.branch_id<>t.branch_id or b2.branch_id<>t.branch_id or b.allocated+b.adjustments-b.held-b.committed-b.used<n then raise exception 'Nguồn chuyển không đủ tại thời điểm duyệt' using errcode='23514';end if;
   update public.procure_v13_budgets set adjustments=adjustments-n where id=from_id;
   update public.procure_v13_budgets set adjustments=adjustments+n where id=to_id;
   insert into public.procure_v13_ledger(budget_id,transaction_type,amount,actor_uid,details,balance_before,balance_after)values
    (from_id,'TRANSFER_OUT',n,p_uid,t.id,b.allocated+b.adjustments-b.held-b.committed-b.used,b.allocated+b.adjustments-b.held-b.committed-b.used-n),
    (to_id,'TRANSFER_IN',n,p_uid,t.id,b2.allocated+b2.adjustments-b2.held-b2.committed-b2.used,b2.allocated+b2.adjustments-b2.held-b2.committed-b2.used+n);
  elsif trim(comment)='' then raise exception 'Từ chối cần lý do' using errcode='23514';end if;
  doc:=t.data||jsonb_build_object('status',decision,'decidedBy',a.display_name,'decidedAt',to_char(now(),'DD/MM/YYYY HH24:MI:SS'),'decisionNotes',comment);
  update public.procure_v13_transfers set status=decision,data=doc where id=t.id;
 elsif p_action='ACCOUNT_IMPORT' then
  if a.role<>'accountant' then raise exception 'Chỉ Kế toán được nhập đối soát' using errcode='42501';end if;
  items:=p_data->'rows';
  if jsonb_typeof(items)<>'array' or jsonb_array_length(items)<1 or jsonb_array_length(items)>300 then raise exception 'Tệp CSV phải có 1-300 dòng' using errcode='23514';end if;
  idx:=0;
  for e in select value from jsonb_array_elements(items) loop
   idx:=idx+1;invoice:=upper(trim(coalesce(e->>'invoiceNo','')));
   valstat:='VALID';v:='Đã kiểm tra mã phiếu, nguồn ngân sách và nghĩa vụ.';
   if invoice='' or length(invoice)>90 or invoice=any(seen) or exists(select 1 from public.procure_v13_invoices where invoice_no=invoice) then valstat:='DUPLICATE';v:='Số hóa đơn đã tồn tại hoặc bị trùng.';
   else
    select * into r from public.procure_v13_requests where id=e->>'prId';
    if r.id is null or r.branch_id<>a.branch_id or r.budget_id<>e->>'budgetId' or r.status<>'IN_PROGRESS' then
     valstat:='NOT_FOUND';v:='Không có phiếu mua hàng phù hợp trong chi nhánh.';
    elsif coalesce(e->>'amount','')!~'^[0-9]+$' or (e->>'amount')::numeric<=0 or (e->>'amount')::numeric>1000000000000 or (e->>'amount')::numeric > coalesce((r.data->'execution'->>'actualOrderedAmount')::bigint,0)-coalesce((r.data->'execution'->>'actualRecordedAmount')::bigint,0) then
     valstat:='AMOUNT_MISMATCH';v:='Vượt cam kết còn lại hoặc số tiền không hợp lệ.';
    end if;
   end if;
   seen:=array_append(seen,invoice);
   rows:=rows||jsonb_build_array(e||jsonb_build_object('rowId',idx,'invoiceNo',invoice,'validationStatus',valstat,'validationMessage',v));
  end loop;
  transfer_id:='BATCH-'||gen_random_uuid()::text;
  doc:=jsonb_build_object('id',transfer_id,'fileName',left(coalesce(p_data->>'fileName','import.csv'),255),'importedAt',to_char(now(),'DD/MM/YYYY HH24:MI:SS'),'importedBy',a.display_name,'status','PREVIEW','rows',rows,'totalRows',jsonb_array_length(rows),
   'validRows',(select count(*) from jsonb_array_elements(rows) as z(value) where z.value->>'validationStatus'='VALID'),
   'duplicateRows',(select count(*) from jsonb_array_elements(rows) as z(value) where z.value->>'validationStatus'='DUPLICATE'),
   'errorRows',(select count(*) from jsonb_array_elements(rows) as z(value) where z.value->>'validationStatus' not in('VALID','DUPLICATE')),
   'totalAmount',(select coalesce(sum((z.value->>'amount')::bigint),0) from jsonb_array_elements(rows) as z(value) where z.value->>'validationStatus'='VALID'));
  insert into public.procure_v13_batches(id,created_by_uid,branch_id,status,data)values(transfer_id,p_uid,a.branch_id,'PREVIEW',doc);
 elsif p_action='ACCOUNT_COMMIT' then
  if a.role<>'accountant' then raise exception 'Chỉ Kế toán được ghi nhận chi phí' using errcode='42501';end if;
  select * into batch from public.procure_v13_batches where id=p_data->>'batchId' for update;
  if batch.id is null or batch.branch_id<>a.branch_id or batch.status<>'PREVIEW' then raise exception 'Đợt nhập không ở trạng thái chờ đối soát' using errcode='23514';end if;
  for e in select value from jsonb_array_elements(batch.data->'rows') order by value->>'prId',value->>'invoiceNo' loop
   if e->>'validationStatus'<>'VALID' then continue;end if;
   invoice:=e->>'invoiceNo';n:=(e->>'amount')::bigint;
   if exists(select 1 from public.procure_v13_invoices where invoice_no=invoice) then raise exception 'Hóa đơn đã được ghi nhận: %',invoice using errcode='23505';end if;
   select * into r from public.procure_v13_requests where id=e->>'prId' for update;
   if r.id is null or r.branch_id<>a.branch_id or r.budget_id<>e->>'budgetId' or r.status<>'IN_PROGRESS' then raise exception 'Phiếu mua hàng đã thay đổi' using errcode='23514';end if;
   remaining:=coalesce((r.data->'execution'->>'actualOrderedAmount')::bigint,0)-coalesce((r.data->'execution'->>'actualRecordedAmount')::bigint,0);
   if n<=0 or n>remaining then raise exception 'Hóa đơn vượt cam kết còn lại' using errcode='23514';end if;
   select * into b from public.procure_v13_budgets where id=r.budget_id for update;
   if b.committed<n then raise exception 'Số cam kết nguồn không đủ' using errcode='23514';end if;
   update public.procure_v13_budgets set committed=committed-n,used=used+n where id=b.id;
   insert into public.procure_v13_invoices(invoice_no,pr_id,budget_id,amount,batch_id)values(invoice,r.id,b.id,n,batch.id);
   total:=coalesce((r.data->'execution'->>'actualRecordedAmount')::bigint,0)+n;
   e:=r.data->'execution'; e:=e||jsonb_build_object('actualRecordedAmount',total,'status',case when total=coalesce((e->>'actualOrderedAmount')::bigint,0) then 'FULLY_INVOICED' else 'PARTIAL_INVOICED' end);
   v:=case when total=coalesce((e->>'actualOrderedAmount')::bigint,0) and r.amount-total-coalesce((e->>'releasedAmount')::bigint,0)=0 then 'COMPLETED' else 'IN_PROGRESS' end;
   update public.procure_v13_requests set data=data||jsonb_build_object('execution',e,'status',v,'updatedAt',to_char(now(),'DD/MM/YYYY HH24:MI:SS')),status=v,row_version=row_version+1,updated_at=now() where id=r.id;
   insert into public.procure_v13_ledger(budget_id,transaction_type,amount,pr_id,actor_uid,details,balance_before,balance_after)values(b.id,'COMMIT_TO_USED',n,r.id,p_uid,'Hóa đơn '||invoice,b.committed,b.committed-n);
  end loop;
  update public.procure_v13_batches set status='COMMITTED',data=data||jsonb_build_object('status','COMMITTED') where id=batch.id;
 elsif p_action='NOTIFICATION_READ' then
  if coalesce(p_data->>'all','false')='true' then update public.procure_v13_notifications set read=true where recipient_uid=p_uid;
  else update public.procure_v13_notifications set read=true where recipient_uid=p_uid and id=(p_data->>'id')::uuid;end if;
 elsif p_action='ADMIN_USER' then
  if a.role<>'admin' then raise exception 'Cần quyền Quản trị' using errcode='42501';end if;
  select * into candidate from public.procure_ai_profiles where user_code=p_data->>'userId' for update;
  if candidate.auth_uid is null or candidate.auth_uid=p_uid or candidate.branch_id<>a.branch_id or candidate.role in('bod','admin') then raise exception 'Tài khoản ngoài thẩm quyền quản trị' using errcode='42501';end if;
  if p_data?'active' then update public.procure_ai_profiles set active=(p_data->>'active')::boolean where auth_uid=candidate.auth_uid;
  elsif p_data?'role' and p_data->>'role' in('requester','dept_head','finance','procurement','accountant','branch_director') then
   update public.procure_ai_profiles set role=p_data->>'role' where auth_uid=candidate.auth_uid;
  else raise exception 'Thay đổi quyền không hợp lệ' using errcode='23514';end if;
 elsif p_action='DELEGATE' then
  if a.role<>'admin' then raise exception 'Chỉ Quản trị được ủy quyền' using errcode='42501';end if;
  if p_data->>'fromUserId'=p_data->>'toUserId' then raise exception 'Không được tự ủy quyền' using errcode='23514';end if;
  if not exists(select 1 from public.procure_ai_profiles where user_code=p_data->>'fromUserId' and branch_id=a.branch_id and active and role in('dept_head','finance','branch_director','bod')) or
   not exists(select 1 from public.procure_ai_profiles where user_code=p_data->>'toUserId' and branch_id=a.branch_id and active and role=(select role from public.procure_ai_profiles where user_code=p_data->>'fromUserId')) then raise exception 'Người nhận ủy quyền không phù hợp' using errcode='23514';end if;
  insert into public.procure_v13_delegations(from_uid,to_uid,role,branch_id,department_id,starts_on,ends_on,max_amount)
   select f.auth_uid,g.auth_uid,f.role,a.branch_id,null,to_date(p_data->>'startDate','DD/MM/YYYY'),to_date(p_data->>'endDate','DD/MM/YYYY'),nullif(p_data->>'maxAmountLimit','')::bigint from public.procure_ai_profiles f,public.procure_ai_profiles g where f.user_code=p_data->>'fromUserId' and g.user_code=p_data->>'toUserId';
 elsif p_action='REVOKE_DELEGATION' then
  if a.role<>'admin' then raise exception 'Chỉ quản trị được hủy ủy quyền' using errcode='42501';end if;
  update public.procure_v13_delegations set active=false where id=(p_data->>'id')::uuid and branch_id=a.branch_id;
 else
  raise exception 'Chức năng chưa được kết nối với hệ thống thật: %',p_action using errcode='0A000';
 end if;
 insert into public.procure_v13_audit(actor_uid,branch_id,action,entity_type,entity_id,details)
 values(p_uid,a.branch_id,p_action,case when p_action like 'TRANSFER%' then 'TRANSFER' when p_action='ADMIN_USER' then 'USER' when p_action like '%DELEGAT%' then 'DELEGATION' else 'PURCHASE_REQUEST' end,coalesce(pr_id,transfer_id,p_data->>'id',''),comment);
 return jsonb_build_object('ok',true,'id',coalesce(pr_id,transfer_id,p_data->>'id'),'status',v);
end $$;
revoke all on function public.procure_v13_mutate(uuid,text,jsonb), public.procure_v13_route(text,text,text,uuid,bigint), public.procure_v13_reviewer(text,text,text,uuid),public.procure_v13_assignee(jsonb) from public,anon,authenticated;
grant execute on function public.procure_v13_mutate(uuid,text,jsonb), public.procure_v13_route(text,text,text,uuid,bigint), public.procure_v13_reviewer(text,text,text,uuid),public.procure_v13_assignee(jsonb) to service_role;
