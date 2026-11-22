-- Add the CEO department to existing organizations and make Kanako part of it.
insert into public.departments (organization_id, name, description)
select o.id, 'CEO Office', 'Executive leadership, company strategy, cross-department coordination, and oversight'
from public.organizations o
where not exists (
  select 1 from public.departments d
  where d.organization_id = o.id and lower(d.name) in ('ceo office', 'ceo')
);

update public.ai_agents a
set department_id = d.id
from public.departments d
where a.organization_id = d.organization_id
  and a.job_title = 'AI Chief Executive Officer'
  and a.name = 'Kanako'
  and lower(d.name) = 'ceo office'
  and a.department_id is null;

create or replace function public.create_organization(org_name text)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  new_org_id uuid;
  caller_id uuid;
  ceo_department_id uuid;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Authentication required';
  end if;
  if org_name is null or length(trim(org_name)) = 0 or length(trim(org_name)) > 120 then
    raise exception 'Organization name must be between 1 and 120 characters';
  end if;

  insert into public.organizations (name, created_by)
  values (trim(org_name), caller_id)
  returning id into new_org_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (new_org_id, caller_id, 'owner');

  insert into public.departments (organization_id, name, description)
  values
    (new_org_id, 'CEO Office', 'Executive leadership, company strategy, cross-department coordination, and oversight'),
    (new_org_id, 'Operations', 'Daily operations, coordination, and execution'),
    (new_org_id, 'Human Resources', 'Recruitment, onboarding, and people operations'),
    (new_org_id, 'Customer Service', 'Customer support and service quality'),
    (new_org_id, 'Sales', 'Lead management, sales pipeline, and conversion'),
    (new_org_id, 'Marketing', 'Brand, content, campaigns, and growth'),
    (new_org_id, 'Finance', 'Budgets, expenses, and financial reporting'),
    (new_org_id, 'IT & Development', 'Systems, software, integrations, and technical support'),
    (new_org_id, 'Analytics & QA', 'Performance measurement, audits, and quality assurance');

  insert into public.ai_agents (
    organization_id, name, job_title, description, instructions,
    status, capabilities, configuration, created_by, department_id
  )
  select new_org_id, 'Kanako', 'AI Chief Executive Officer',
    'Central coordinator for the virtual company. This profile remains a draft until an approved model is configured.',
    'Coordinate the organization by reviewing operational context, clarifying priorities, preparing plans, and delegating tasks to activated AI employees. Do not claim external actions were completed unless an authorized tool confirms success. Require human approval before spending money, contacting external people, changing production systems, or performing irreversible actions. Be transparent about missing information and risks.',
    'draft', '[]'::jsonb, '{}'::jsonb, caller_id, d.id
  from public.departments d
  where d.organization_id = new_org_id and d.name = 'CEO Office';

  return new_org_id;
end;
$function$;

revoke all on function public.create_organization(text) from public, anon;
grant execute on function public.create_organization(text) to authenticated, service_role;
