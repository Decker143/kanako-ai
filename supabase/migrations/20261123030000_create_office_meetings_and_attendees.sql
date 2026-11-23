create table if not exists public.office_meetings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  agenda text not null default '' check (char_length(agenda) <= 4000),
  status text not null default 'scheduled' check (status in ('scheduled','in_progress','completed','cancelled')),
  scheduled_for timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  notes text not null default '' check (char_length(notes) <= 12000),
  decisions text not null default '' check (char_length(decisions) <= 12000),
  action_items jsonb not null default '[]'::jsonb check (jsonb_typeof(action_items) = 'array'),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists office_meetings_org_status_date_idx on public.office_meetings (organization_id, status, scheduled_for desc);
create table if not exists public.office_meeting_attendees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  meeting_id uuid not null references public.office_meetings(id) on delete cascade,
  agent_id uuid not null references public.ai_agents(id) on delete cascade,
  attendance_status text not null default 'invited' check (attendance_status in ('invited','attending','attended','absent')),
  created_at timestamptz not null default now(),
  unique (meeting_id, agent_id)
);
create index if not exists office_meeting_attendees_meeting_idx on public.office_meeting_attendees (meeting_id);
create index if not exists office_meetings_created_by_idx on public.office_meetings (created_by);
create index if not exists office_meeting_attendees_org_idx on public.office_meeting_attendees (organization_id);
create index if not exists office_meeting_attendees_agent_idx on public.office_meeting_attendees (agent_id);
alter table public.office_meetings enable row level security;
alter table public.office_meeting_attendees enable row level security;
revoke all on public.office_meetings from anon;
revoke all on public.office_meeting_attendees from anon;
grant select, insert, update, delete on public.office_meetings to authenticated;
grant select, insert, update, delete on public.office_meeting_attendees to authenticated;
create policy office_meetings_select_members on public.office_meetings for select to authenticated using (private.is_org_member(organization_id));
create policy office_meetings_insert_admins on public.office_meetings for insert to authenticated with check (private.has_org_role(organization_id, array['owner','admin']::text[]) and created_by = (select auth.uid()));
create policy office_meetings_update_admins on public.office_meetings for update to authenticated using (private.has_org_role(organization_id, array['owner','admin']::text[])) with check (private.has_org_role(organization_id, array['owner','admin']::text[]));
create policy office_meetings_delete_admins on public.office_meetings for delete to authenticated using (private.has_org_role(organization_id, array['owner','admin']::text[]));
create policy office_meeting_attendees_select_members on public.office_meeting_attendees for select to authenticated using (private.is_org_member(organization_id));
create policy office_meeting_attendees_insert_admins on public.office_meeting_attendees for insert to authenticated with check (private.has_org_role(organization_id, array['owner','admin']::text[]) and exists (select 1 from public.office_meetings m where m.id = meeting_id and m.organization_id = office_meeting_attendees.organization_id) and exists (select 1 from public.ai_agents a where a.id = agent_id and a.organization_id = office_meeting_attendees.organization_id));
create policy office_meeting_attendees_update_admins on public.office_meeting_attendees for update to authenticated using (private.has_org_role(organization_id, array['owner','admin']::text[])) with check (private.has_org_role(organization_id, array['owner','admin']::text[]));
create policy office_meeting_attendees_delete_admins on public.office_meeting_attendees for delete to authenticated using (private.has_org_role(organization_id, array['owner','admin']::text[]));
