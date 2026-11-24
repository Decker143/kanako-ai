-- KANAKO AI Production schema reconstruction reference
-- READ-ONLY EXPORT / DRAFT ONLY. DO NOT APPLY TO PRODUCTION OR DEV.
-- Generated from PostgreSQL catalogs through Supabase SQL connector on 2026-11-24.
-- Schema only: no application rows, auth users, or workspace data.
-- This is a reconstruction aid, not a verified pg_dump replacement.

BEGIN;
CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE public."activity_logs" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    actor_user_id uuid,
    actor_agent_id uuid,
    action text NOT NULL,
    entity_type text,
    entity_id uuid,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."agent_learning_events" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    agent_id uuid NOT NULL,
    task_id uuid,
    agent_run_id uuid,
    event_type text NOT NULL,
    feedback text,
    lesson text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."agent_memories" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    agent_id uuid NOT NULL,
    memory_type text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    source_run_id uuid,
    confidence numeric(4,3) DEFAULT 0.500 NOT NULL,
    created_by uuid,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."agent_runs" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    agent_id uuid NOT NULL,
    task_id uuid,
    status text DEFAULT 'queued'::text NOT NULL,
    input jsonb DEFAULT '{}'::jsonb NOT NULL,
    output jsonb DEFAULT '{}'::jsonb NOT NULL,
    error text,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."ai_agents" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    department_id uuid,
    name text NOT NULL,
    job_title text NOT NULL,
    description text,
    instructions text,
    model_provider text,
    model_name text,
    capabilities jsonb DEFAULT '[]'::jsonb NOT NULL,
    configuration jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    skills text[] DEFAULT '{}'::text[] NOT NULL,
    max_concurrent_tasks integer DEFAULT 2 NOT NULL,
    availability_status text DEFAULT 'available'::text NOT NULL
);
COMMENT ON COLUMN public."ai_agents"."skills" IS 'Owner-maintained skill tags used as one signal for safe task assignment.';
COMMENT ON COLUMN public."ai_agents"."max_concurrent_tasks" IS 'Maximum number of non-terminal tasks assigned to this employee.';
COMMENT ON COLUMN public."ai_agents"."availability_status" IS 'Manual availability override used by CEO delegation; busy and unavailable employees are not assigned new work.';
CREATE TABLE public."approvals" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    request_type text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    requested_by uuid,
    decided_by uuid,
    decision_note text,
    decided_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."automation_workflows" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    trigger_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    steps jsonb DEFAULT '[]'::jsonb NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."conversations" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    title text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."departments" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    color text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."knowledge_documents" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    title text NOT NULL,
    content text,
    source_type text DEFAULT 'manual'::text NOT NULL,
    source_url text,
    storage_path text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."messages" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    conversation_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    agent_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."office_commands" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    agent_id uuid NOT NULL,
    command text NOT NULL,
    destination text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone
);
CREATE TABLE public."office_meeting_attendees" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    meeting_id uuid NOT NULL,
    agent_id uuid NOT NULL,
    attendance_status text DEFAULT 'invited'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."office_meetings" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    title text NOT NULL,
    agenda text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'scheduled'::text NOT NULL,
    scheduled_for timestamp with time zone,
    started_at timestamp with time zone,
    ended_at timestamp with time zone,
    notes text DEFAULT ''::text NOT NULL,
    decisions text DEFAULT ''::text NOT NULL,
    action_items jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."organization_members" (
  organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."organizations" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."profiles" (
  id uuid NOT NULL,
    display_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."reports" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    title text NOT NULL,
    report_type text NOT NULL,
    period_start date,
    period_end date,
    content jsonb DEFAULT '{}'::jsonb NOT NULL,
    generated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."task_updates" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    task_id uuid NOT NULL,
    actor_user_id uuid,
    event_type text NOT NULL,
    message text NOT NULL,
    progress_percent integer,
    target_agent_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    actor_agent_id uuid
);
CREATE TABLE public."tasks" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    status text DEFAULT 'queued'::text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    department_id uuid,
    assigned_agent_id uuid,
    assigned_user_id uuid,
    created_by uuid,
    due_at timestamp with time zone,
    completed_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."workflow_runs" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    workflow_id uuid NOT NULL,
    status text DEFAULT 'queued'::text NOT NULL,
    input jsonb DEFAULT '{}'::jsonb NOT NULL,
    output jsonb DEFAULT '{}'::jsonb NOT NULL,
    error text,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE activity_logs ADD CONSTRAINT "activity_logs_actor_agent_id_fkey" FOREIGN KEY (actor_agent_id) REFERENCES ai_agents(id) ON DELETE SET NULL;
ALTER TABLE activity_logs ADD CONSTRAINT "activity_logs_actor_user_id_fkey" FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE activity_logs ADD CONSTRAINT "activity_logs_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE activity_logs ADD CONSTRAINT "activity_logs_pkey" PRIMARY KEY (id);
ALTER TABLE agent_learning_events ADD CONSTRAINT "agent_learning_events_agent_id_fkey" FOREIGN KEY (agent_id) REFERENCES ai_agents(id) ON DELETE CASCADE;
ALTER TABLE agent_learning_events ADD CONSTRAINT "agent_learning_events_agent_run_id_fkey" FOREIGN KEY (agent_run_id) REFERENCES agent_runs(id) ON DELETE SET NULL;
ALTER TABLE agent_learning_events ADD CONSTRAINT "agent_learning_events_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE agent_learning_events ADD CONSTRAINT "agent_learning_events_event_type_check" CHECK (event_type = ANY (ARRAY['task_approved'::text, 'revision_requested'::text, 'task_failed'::text, 'user_correction'::text]));
ALTER TABLE agent_learning_events ADD CONSTRAINT "agent_learning_events_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE agent_learning_events ADD CONSTRAINT "agent_learning_events_pkey" PRIMARY KEY (id);
ALTER TABLE agent_learning_events ADD CONSTRAINT "agent_learning_events_task_id_fkey" FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL;
ALTER TABLE agent_memories ADD CONSTRAINT "agent_memories_agent_id_fkey" FOREIGN KEY (agent_id) REFERENCES ai_agents(id) ON DELETE CASCADE;
ALTER TABLE agent_memories ADD CONSTRAINT "agent_memories_confidence_check" CHECK (confidence >= 0::numeric AND confidence <= 1::numeric);
ALTER TABLE agent_memories ADD CONSTRAINT "agent_memories_content_check" CHECK (length(TRIM(BOTH FROM content)) >= 1 AND length(TRIM(BOTH FROM content)) <= 6000);
ALTER TABLE agent_memories ADD CONSTRAINT "agent_memories_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE agent_memories ADD CONSTRAINT "agent_memories_memory_type_check" CHECK (memory_type = ANY (ARRAY['procedure'::text, 'preference'::text, 'correction'::text, 'task_pattern'::text, 'domain_fact'::text]));
ALTER TABLE agent_memories ADD CONSTRAINT "agent_memories_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE agent_memories ADD CONSTRAINT "agent_memories_pkey" PRIMARY KEY (id);
ALTER TABLE agent_memories ADD CONSTRAINT "agent_memories_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE agent_memories ADD CONSTRAINT "agent_memories_source_run_id_fkey" FOREIGN KEY (source_run_id) REFERENCES agent_runs(id) ON DELETE SET NULL;
ALTER TABLE agent_memories ADD CONSTRAINT "agent_memories_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'archived'::text]));
ALTER TABLE agent_memories ADD CONSTRAINT "agent_memories_title_check" CHECK (length(TRIM(BOTH FROM title)) >= 1 AND length(TRIM(BOTH FROM title)) <= 180);
ALTER TABLE agent_runs ADD CONSTRAINT "agent_runs_agent_id_fkey" FOREIGN KEY (agent_id) REFERENCES ai_agents(id) ON DELETE CASCADE;
ALTER TABLE agent_runs ADD CONSTRAINT "agent_runs_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE agent_runs ADD CONSTRAINT "agent_runs_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE agent_runs ADD CONSTRAINT "agent_runs_pkey" PRIMARY KEY (id);
ALTER TABLE agent_runs ADD CONSTRAINT "agent_runs_status_check" CHECK (status = ANY (ARRAY['queued'::text, 'running'::text, 'succeeded'::text, 'failed'::text, 'cancelled'::text]));
ALTER TABLE agent_runs ADD CONSTRAINT "agent_runs_task_id_fkey" FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL;
ALTER TABLE ai_agents ADD CONSTRAINT "ai_agents_availability_status_check" CHECK (availability_status = ANY (ARRAY['available'::text, 'busy'::text, 'unavailable'::text]));
ALTER TABLE ai_agents ADD CONSTRAINT "ai_agents_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE ai_agents ADD CONSTRAINT "ai_agents_department_id_fkey" FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE ai_agents ADD CONSTRAINT "ai_agents_max_concurrent_tasks_check" CHECK (max_concurrent_tasks >= 1 AND max_concurrent_tasks <= 20);
ALTER TABLE ai_agents ADD CONSTRAINT "ai_agents_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE ai_agents ADD CONSTRAINT "ai_agents_pkey" PRIMARY KEY (id);
ALTER TABLE ai_agents ADD CONSTRAINT "ai_agents_status_check" CHECK (status = ANY (ARRAY['draft'::text, 'active'::text, 'paused'::text, 'archived'::text]));
ALTER TABLE approvals ADD CONSTRAINT "approvals_decided_by_fkey" FOREIGN KEY (decided_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE approvals ADD CONSTRAINT "approvals_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE approvals ADD CONSTRAINT "approvals_pkey" PRIMARY KEY (id);
ALTER TABLE approvals ADD CONSTRAINT "approvals_requested_by_fkey" FOREIGN KEY (requested_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE approvals ADD CONSTRAINT "approvals_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'cancelled'::text]));
ALTER TABLE automation_workflows ADD CONSTRAINT "automation_workflows_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE automation_workflows ADD CONSTRAINT "automation_workflows_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE automation_workflows ADD CONSTRAINT "automation_workflows_pkey" PRIMARY KEY (id);
ALTER TABLE automation_workflows ADD CONSTRAINT "automation_workflows_status_check" CHECK (status = ANY (ARRAY['draft'::text, 'active'::text, 'paused'::text, 'archived'::text]));
ALTER TABLE conversations ADD CONSTRAINT "conversations_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE conversations ADD CONSTRAINT "conversations_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE conversations ADD CONSTRAINT "conversations_pkey" PRIMARY KEY (id);
ALTER TABLE departments ADD CONSTRAINT "departments_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE departments ADD CONSTRAINT "departments_organization_id_name_key" UNIQUE (organization_id, name);
ALTER TABLE departments ADD CONSTRAINT "departments_pkey" PRIMARY KEY (id);
ALTER TABLE knowledge_documents ADD CONSTRAINT "knowledge_documents_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE knowledge_documents ADD CONSTRAINT "knowledge_documents_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE knowledge_documents ADD CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY (id);
ALTER TABLE messages ADD CONSTRAINT "messages_agent_id_fkey" FOREIGN KEY (agent_id) REFERENCES ai_agents(id) ON DELETE SET NULL;
ALTER TABLE messages ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;
ALTER TABLE messages ADD CONSTRAINT "messages_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE messages ADD CONSTRAINT "messages_pkey" PRIMARY KEY (id);
ALTER TABLE messages ADD CONSTRAINT "messages_role_check" CHECK (role = ANY (ARRAY['system'::text, 'user'::text, 'assistant'::text, 'tool'::text]));
ALTER TABLE office_commands ADD CONSTRAINT "office_commands_agent_id_fkey" FOREIGN KEY (agent_id) REFERENCES ai_agents(id) ON DELETE CASCADE;
ALTER TABLE office_commands ADD CONSTRAINT "office_commands_command_check" CHECK (command = ANY (ARRAY['call_to_meeting'::text, 'return_to_workstation'::text]));
ALTER TABLE office_commands ADD CONSTRAINT "office_commands_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE office_commands ADD CONSTRAINT "office_commands_destination_check" CHECK (destination = ANY (ARRAY['collaboration_hub'::text, 'workstation'::text]));
ALTER TABLE office_commands ADD CONSTRAINT "office_commands_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE office_commands ADD CONSTRAINT "office_commands_pkey" PRIMARY KEY (id);
ALTER TABLE office_commands ADD CONSTRAINT "office_commands_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text]));
ALTER TABLE office_meeting_attendees ADD CONSTRAINT "office_meeting_attendees_agent_id_fkey" FOREIGN KEY (agent_id) REFERENCES ai_agents(id) ON DELETE CASCADE;
ALTER TABLE office_meeting_attendees ADD CONSTRAINT "office_meeting_attendees_attendance_status_check" CHECK (attendance_status = ANY (ARRAY['invited'::text, 'attending'::text, 'attended'::text, 'absent'::text]));
ALTER TABLE office_meeting_attendees ADD CONSTRAINT "office_meeting_attendees_meeting_id_agent_id_key" UNIQUE (meeting_id, agent_id);
ALTER TABLE office_meeting_attendees ADD CONSTRAINT "office_meeting_attendees_meeting_id_fkey" FOREIGN KEY (meeting_id) REFERENCES office_meetings(id) ON DELETE CASCADE;
ALTER TABLE office_meeting_attendees ADD CONSTRAINT "office_meeting_attendees_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE office_meeting_attendees ADD CONSTRAINT "office_meeting_attendees_pkey" PRIMARY KEY (id);
ALTER TABLE office_meetings ADD CONSTRAINT "office_meetings_action_items_check" CHECK (jsonb_typeof(action_items) = 'array'::text);
ALTER TABLE office_meetings ADD CONSTRAINT "office_meetings_agenda_check" CHECK (char_length(agenda) <= 4000);
ALTER TABLE office_meetings ADD CONSTRAINT "office_meetings_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE office_meetings ADD CONSTRAINT "office_meetings_decisions_check" CHECK (char_length(decisions) <= 12000);
ALTER TABLE office_meetings ADD CONSTRAINT "office_meetings_notes_check" CHECK (char_length(notes) <= 12000);
ALTER TABLE office_meetings ADD CONSTRAINT "office_meetings_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE office_meetings ADD CONSTRAINT "office_meetings_pkey" PRIMARY KEY (id);
ALTER TABLE office_meetings ADD CONSTRAINT "office_meetings_status_check" CHECK (status = ANY (ARRAY['scheduled'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text]));
ALTER TABLE office_meetings ADD CONSTRAINT "office_meetings_title_check" CHECK (char_length(title) >= 1 AND char_length(title) <= 120);
ALTER TABLE organization_members ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE organization_members ADD CONSTRAINT "organization_members_pkey" PRIMARY KEY (organization_id, user_id);
ALTER TABLE organization_members ADD CONSTRAINT "organization_members_role_check" CHECK (role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text, 'member'::text, 'viewer'::text]));
ALTER TABLE organization_members ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE organizations ADD CONSTRAINT "organizations_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE organizations ADD CONSTRAINT "organizations_name_check" CHECK (length(TRIM(BOTH FROM name)) >= 1 AND length(TRIM(BOTH FROM name)) <= 120);
ALTER TABLE organizations ADD CONSTRAINT "organizations_pkey" PRIMARY KEY (id);
ALTER TABLE profiles ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE profiles ADD CONSTRAINT "profiles_pkey" PRIMARY KEY (id);
ALTER TABLE reports ADD CONSTRAINT "reports_generated_by_fkey" FOREIGN KEY (generated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE reports ADD CONSTRAINT "reports_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE reports ADD CONSTRAINT "reports_pkey" PRIMARY KEY (id);
ALTER TABLE task_updates ADD CONSTRAINT "task_updates_actor_agent_id_fkey" FOREIGN KEY (actor_agent_id) REFERENCES ai_agents(id) ON DELETE SET NULL;
ALTER TABLE task_updates ADD CONSTRAINT "task_updates_actor_present_check" CHECK (actor_user_id IS NOT NULL OR actor_agent_id IS NOT NULL);
ALTER TABLE task_updates ADD CONSTRAINT "task_updates_actor_user_id_fkey" FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;
ALTER TABLE task_updates ADD CONSTRAINT "task_updates_event_type_check" CHECK (event_type = ANY (ARRAY['progress'::text, 'note'::text, 'blocker'::text, 'handoff_requested'::text, 'handoff_approved'::text]));
ALTER TABLE task_updates ADD CONSTRAINT "task_updates_message_check" CHECK (char_length(message) >= 1 AND char_length(message) <= 4000);
ALTER TABLE task_updates ADD CONSTRAINT "task_updates_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE task_updates ADD CONSTRAINT "task_updates_pkey" PRIMARY KEY (id);
ALTER TABLE task_updates ADD CONSTRAINT "task_updates_progress_event_check" CHECK (event_type = 'progress'::text OR progress_percent IS NULL);
ALTER TABLE task_updates ADD CONSTRAINT "task_updates_progress_percent_check" CHECK (progress_percent >= 0 AND progress_percent <= 100);
ALTER TABLE task_updates ADD CONSTRAINT "task_updates_target_agent_id_fkey" FOREIGN KEY (target_agent_id) REFERENCES ai_agents(id) ON DELETE SET NULL;
ALTER TABLE task_updates ADD CONSTRAINT "task_updates_task_id_fkey" FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD CONSTRAINT "tasks_assigned_agent_id_fkey" FOREIGN KEY (assigned_agent_id) REFERENCES ai_agents(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD CONSTRAINT "tasks_assigned_user_id_fkey" FOREIGN KEY (assigned_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD CONSTRAINT "tasks_department_id_fkey" FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD CONSTRAINT "tasks_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD CONSTRAINT "tasks_pkey" PRIMARY KEY (id);
ALTER TABLE tasks ADD CONSTRAINT "tasks_priority_check" CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]));
ALTER TABLE tasks ADD CONSTRAINT "tasks_status_check" CHECK (status = ANY (ARRAY['queued'::text, 'in_progress'::text, 'blocked'::text, 'in_review'::text, 'completed'::text, 'cancelled'::text]));
ALTER TABLE workflow_runs ADD CONSTRAINT "workflow_runs_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE workflow_runs ADD CONSTRAINT "workflow_runs_pkey" PRIMARY KEY (id);
ALTER TABLE workflow_runs ADD CONSTRAINT "workflow_runs_status_check" CHECK (status = ANY (ARRAY['queued'::text, 'running'::text, 'succeeded'::text, 'failed'::text, 'cancelled'::text]));
ALTER TABLE workflow_runs ADD CONSTRAINT "workflow_runs_workflow_id_fkey" FOREIGN KEY (workflow_id) REFERENCES automation_workflows(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION private.enforce_ai_task_review_gate()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  latest_run_output jsonb;
begin
  if new.status = 'completed'
     and old.status is distinct from 'completed' then
    select ar.output
      into latest_run_output
      from public.agent_runs as ar
     where ar.organization_id = new.organization_id
       and ar.task_id = new.id
       and ar.status = 'succeeded'
     order by ar.created_at desc, ar.id desc
     limit 1;

    if latest_run_output is not null then
      if not private.has_org_role(new.organization_id, array['owner', 'admin']::text[]) then
        raise exception 'Only workspace owners and admins can complete AI-generated tasks after review.';
      end if;

      if coalesce(latest_run_output -> 'review' ->> 'decision', '') <> 'approved' then
        raise exception 'AI-generated work must receive an explicit approval before task completion.';
      end if;
    end if;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.has_org_role(target_org uuid, allowed_roles text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = target_org
      and m.user_id = (select auth.uid())
      and m.role = any(allowed_roles)
  );
$function$;

CREATE OR REPLACE FUNCTION private.is_org_member(target_org uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = target_org
      and m.user_id = (select auth.uid())
  );
$function$;

CREATE OR REPLACE FUNCTION public.approve_task_handoff(p_task_id uuid, p_request_id uuid, p_organization_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_task_id uuid;
  v_target_agent_id uuid;
  v_message text;
  v_latest_id uuid;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id and m.user_id = auth.uid()
      and m.role in ('owner','admin')
  ) then
    raise exception 'Workspace owner or admin permission required' using errcode = '42501';
  end if;
  select t.id into v_task_id
  from public.tasks t
  where t.id = p_task_id and t.organization_id = p_organization_id
  for update;
  if not found then
    raise exception 'Task not found in this workspace' using errcode = 'P0002';
  end if;
  select u.target_agent_id, u.message into v_target_agent_id, v_message
  from public.task_updates u
  where u.id = p_request_id and u.task_id = p_task_id
    and u.organization_id = p_organization_id and u.event_type = 'handoff_requested';
  if not found or v_target_agent_id is null then
    raise exception 'Handoff request not found' using errcode = 'P0002';
  end if;
  select u.id into v_latest_id
  from public.task_updates u
  where u.task_id = p_task_id and u.organization_id = p_organization_id
    and u.event_type in ('handoff_requested','handoff_approved')
  order by u.created_at desc, u.id desc limit 1;
  if v_latest_id is distinct from p_request_id then
    raise exception 'A newer handoff decision already exists' using errcode = 'P0001';
  end if;
  v_result := public.assign_task_to_agent(
    p_task_id, v_target_agent_id, p_organization_id,
    'Owner-approved handoff: ' || left(coalesce(v_message,''),350)
  );
  insert into public.task_updates (
    organization_id, task_id, actor_user_id, event_type, message, target_agent_id
  ) values (
    p_organization_id, p_task_id, auth.uid(), 'handoff_approved',
    'Owner approved handoff. ' || left(coalesce(v_message,''),3800), v_target_agent_id
  );
  return v_result;
end;
$function$;

CREATE OR REPLACE FUNCTION public.assign_task_to_agent(p_task_id uuid, p_agent_id uuid, p_organization_id uuid, p_rationale text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_agent public.ai_agents%rowtype;
  v_task public.tasks%rowtype;
  v_open_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  ) then
    raise exception 'Workspace owner or admin permission required' using errcode = '42501';
  end if;

  select * into v_agent
  from public.ai_agents a
  where a.id = p_agent_id and a.organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'AI employee not found in this workspace' using errcode = 'P0002';
  end if;

  if v_agent.status <> 'active'
     or v_agent.availability_status <> 'available'
     or v_agent.model_name is null
     or not (v_agent.capabilities @> '["task_execution"]'::jsonb) then
    raise exception 'AI employee is not eligible for new work' using errcode = 'P0001';
  end if;

  select * into v_task
  from public.tasks t
  where t.id = p_task_id and t.organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'Task not found in this workspace' using errcode = 'P0002';
  end if;

  if v_task.status not in ('queued', 'blocked') then
    raise exception 'Only queued or blocked tasks can be delegated' using errcode = 'P0001';
  end if;

  select count(*)::integer into v_open_count
  from public.tasks t
  where t.organization_id = p_organization_id
    and t.assigned_agent_id = p_agent_id
    and t.status not in ('completed', 'cancelled');

  if v_open_count >= v_agent.max_concurrent_tasks then
    raise exception 'AI employee has reached their concurrent task capacity' using errcode = 'P0001';
  end if;

  update public.tasks
  set assigned_agent_id = p_agent_id
  where id = p_task_id and organization_id = p_organization_id;

  insert into public.activity_logs (
    organization_id, actor_user_id, action, entity_type, entity_id, details
  ) values (
    p_organization_id, auth.uid(), 'ceo.task_delegated', 'task', p_task_id,
    jsonb_build_object(
      'assigned_agent_id', p_agent_id,
      'employee_name', v_agent.name,
      'rationale', left(coalesce(p_rationale, ''), 500),
      'open_task_count_before_assignment', v_open_count
    )
  );

  return jsonb_build_object(
    'task_id', p_task_id,
    'agent_id', p_agent_id,
    'open_task_count', v_open_count + 1,
    'max_concurrent_tasks', v_agent.max_concurrent_tasks
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_organization(org_name text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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

  select d.id into strict ceo_department_id
  from public.departments d
  where d.organization_id = new_org_id and d.name = 'CEO Office';

  insert into public.ai_agents (
    organization_id, name, job_title, description, instructions,
    status, capabilities, configuration, created_by, department_id
  ) values (
    new_org_id,
    'Kanako',
    'AI Chief Executive Officer',
    'Central coordinator for the virtual company. This profile remains a draft until an approved model is configured.',
    'Coordinate the organization by reviewing operational context, clarifying priorities, preparing plans, and delegating tasks to activated AI employees. Monitor department performance, workload, risks, and unresolved blockers. Do not claim external actions were completed unless an authorized tool confirms success. Require human approval before spending money, contacting external people, changing production systems, or performing irreversible actions. Be transparent about missing information and risks.',
    'draft',
    '[]'::jsonb,
    '{}'::jsonb,
    caller_id,
    ceo_department_id
  );

  return new_org_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;


CREATE TRIGGER set_updated_at BEFORE UPDATE ON ai_agents FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON approvals FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON automation_workflows FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON knowledge_documents FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tasks_require_ai_review_before_completion BEFORE UPDATE OF status ON tasks FOR EACH ROW EXECUTE FUNCTION private.enforce_ai_task_review_gate();

ALTER TABLE public."activity_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."agent_learning_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."agent_memories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."agent_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ai_agents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."approvals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."automation_workflows" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."departments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."knowledge_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."office_commands" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."office_meeting_attendees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."office_meetings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."organization_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."task_updates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."workflow_runs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_insert_members" ON public."activity_logs" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((private.is_org_member(organization_id) AND (actor_user_id = ( SELECT auth.uid() AS uid))));
CREATE POLICY "activity_select_members" ON public."activity_logs" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.is_org_member(organization_id));
CREATE POLICY "agent_learning_events_insert_admins" ON public."agent_learning_events" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text]) AND (created_by = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM ai_agents a
  WHERE ((a.id = agent_learning_events.agent_id) AND (a.organization_id = agent_learning_events.organization_id))))));
CREATE POLICY "agent_learning_events_select_members" ON public."agent_learning_events" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.is_org_member(organization_id));
CREATE POLICY "agent_memories_insert_admins" ON public."agent_memories" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text]) AND (created_by = ( SELECT auth.uid() AS uid)) AND (status = 'pending'::text) AND (EXISTS ( SELECT 1
   FROM ai_agents a
  WHERE ((a.id = agent_memories.agent_id) AND (a.organization_id = agent_memories.organization_id))))));
CREATE POLICY "agent_memories_select_members" ON public."agent_memories" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.is_org_member(organization_id));
CREATE POLICY "agent_memories_update_admins" ON public."agent_memories" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text])) WITH CHECK ((private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text]) AND (reviewed_by = ( SELECT auth.uid() AS uid))));
CREATE POLICY "agent_runs_delete_admins" ON public."agent_runs" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text]));
CREATE POLICY "agent_runs_insert_admins" ON public."agent_runs" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text]) AND (created_by = ( SELECT auth.uid() AS uid))));
CREATE POLICY "agent_runs_select_members" ON public."agent_runs" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.is_org_member(organization_id));
CREATE POLICY "agent_runs_update_admins" ON public."agent_runs" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text])) WITH CHECK (private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text]));
CREATE POLICY "agents_delete_admins" ON public."ai_agents" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text]));
CREATE POLICY "agents_insert_admins" ON public."ai_agents" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text]) AND (created_by = ( SELECT auth.uid() AS uid))));
CREATE POLICY "agents_select_members" ON public."ai_agents" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.is_org_member(organization_id));
CREATE POLICY "agents_update_admins" ON public."ai_agents" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text])) WITH CHECK (private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text]));
CREATE POLICY "approvals_insert_members" ON public."approvals" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((private.is_org_member(organization_id) AND (requested_by = ( SELECT auth.uid() AS uid))));
CREATE POLICY "approvals_select_members" ON public."approvals" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.is_org_member(organization_id));
CREATE POLICY "approvals_update_admins" ON public."approvals" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text, 'manager'::text])) WITH CHECK ((private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text, 'manager'::text]) AND (decided_by = ( SELECT auth.uid() AS uid))));
CREATE POLICY "workflows_delete_admins" ON public."automation_workflows" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text]));
CREATE POLICY "workflows_insert_admins" ON public."automation_workflows" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text]) AND (created_by = ( SELECT auth.uid() AS uid))));
CREATE POLICY "workflows_select_members" ON public."automation_workflows" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.is_org_member(organization_id));
CREATE POLICY "workflows_update_admins" ON public."automation_workflows" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text])) WITH CHECK (private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text]));
CREATE POLICY "conversations_delete_members" ON public."conversations" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.is_org_member(organization_id));
CREATE POLICY "conversations_insert_members" ON public."conversations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((private.is_org_member(organization_id) AND (created_by = ( SELECT auth.uid() AS uid))));
CREATE POLICY "conversations_select_members" ON public."conversations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.is_org_member(organization_id));
CREATE POLICY "conversations_update_members" ON public."conversations" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.is_org_member(organization_id)) WITH CHECK (private.is_org_member(organization_id));
CREATE POLICY "departments_delete_admins" ON public."departments" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text]));
CREATE POLICY "departments_insert_admins" ON public."departments" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text]));
CREATE POLICY "departments_select_members" ON public."departments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.is_org_member(organization_id));
CREATE POLICY "departments_update_admins" ON public."departments" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text])) WITH CHECK (private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text]));
CREATE POLICY "knowledge_delete_admins" ON public."knowledge_documents" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text]));
CREATE POLICY "knowledge_insert_members" ON public."knowledge_documents" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((private.is_org_member(organization_id) AND (created_by = ( SELECT auth.uid() AS uid))));
CREATE POLICY "knowledge_select_members" ON public."knowledge_documents" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.is_org_member(organization_id));
CREATE POLICY "knowledge_update_members" ON public."knowledge_documents" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.is_org_member(organization_id)) WITH CHECK (private.is_org_member(organization_id));
CREATE POLICY "messages_delete_admins" ON public."messages" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text]));
CREATE POLICY "messages_insert_members" ON public."messages" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((private.is_org_member(organization_id) AND (EXISTS ( SELECT 1
   FROM conversations c
  WHERE ((c.id = messages.conversation_id) AND (c.organization_id = messages.organization_id)))) AND ((agent_id IS NULL) OR (EXISTS ( SELECT 1
   FROM ai_agents a
  WHERE ((a.id = messages.agent_id) AND (a.organization_id = messages.organization_id)))))));
CREATE POLICY "messages_select_members" ON public."messages" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.is_org_member(organization_id));
CREATE POLICY "office_commands_insert_admins" ON public."office_commands" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text]) AND (created_by = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM ai_agents a
  WHERE ((a.id = office_commands.agent_id) AND (a.organization_id = office_commands.organization_id))))));
CREATE POLICY "office_commands_select_members" ON public."office_commands" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.is_org_member(organization_id));
CREATE POLICY "office_commands_update_admins" ON public."office_commands" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text])) WITH CHECK (private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text]));
CREATE POLICY "office_meeting_attendees_delete_admins" ON public."office_meeting_attendees" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text]));
CREATE POLICY "office_meeting_attendees_insert_admins" ON public."office_meeting_attendees" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text]) AND (EXISTS ( SELECT 1
   FROM office_meetings m
  WHERE ((m.id = office_meeting_attendees.meeting_id) AND (m.organization_id = office_meeting_attendees.organization_id)))) AND (EXISTS ( SELECT 1
   FROM ai_agents a
  WHERE ((a.id = office_meeting_attendees.agent_id) AND (a.organization_id = office_meeting_attendees.organization_id))))));
CREATE POLICY "office_meeting_attendees_select_members" ON public."office_meeting_attendees" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.is_org_member(organization_id));
CREATE POLICY "office_meeting_attendees_update_admins" ON public."office_meeting_attendees" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text])) WITH CHECK (private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text]));
CREATE POLICY "office_meetings_delete_admins" ON public."office_meetings" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text]));
CREATE POLICY "office_meetings_insert_admins" ON public."office_meetings" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text]) AND (created_by = ( SELECT auth.uid() AS uid))));
CREATE POLICY "office_meetings_select_members" ON public."office_meetings" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.is_org_member(organization_id));
CREATE POLICY "office_meetings_update_admins" ON public."office_meetings" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text])) WITH CHECK (private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text]));
CREATE POLICY "members_delete_admins" ON public."organization_members" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text]) AND (role <> 'owner'::text)));
CREATE POLICY "members_insert_owner_or_admin" ON public."organization_members" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((((user_id = ( SELECT auth.uid() AS uid)) AND (role = 'owner'::text) AND (EXISTS ( SELECT 1
   FROM organizations o
  WHERE ((o.id = organization_members.organization_id) AND (o.created_by = ( SELECT auth.uid() AS uid)))))) OR private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text])));
CREATE POLICY "members_select_org" ON public."organization_members" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((private.is_org_member(organization_id) OR (user_id = ( SELECT auth.uid() AS uid))));
CREATE POLICY "members_update_admins" ON public."organization_members" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text])) WITH CHECK (private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text]));
CREATE POLICY "organizations_delete_owner" ON public."organizations" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.has_org_role(id, ARRAY['owner'::text]));
CREATE POLICY "organizations_insert_creator" ON public."organizations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((created_by = ( SELECT auth.uid() AS uid)));
CREATE POLICY "organizations_select_members" ON public."organizations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.is_org_member(id));
CREATE POLICY "organizations_update_admins" ON public."organizations" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.has_org_role(id, ARRAY['owner'::text, 'admin'::text])) WITH CHECK (private.has_org_role(id, ARRAY['owner'::text, 'admin'::text]));
CREATE POLICY "profiles_insert_self" ON public."profiles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "profiles_select_self" ON public."profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "profiles_update_self" ON public."profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((id = ( SELECT auth.uid() AS uid))) WITH CHECK ((id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "reports_delete_admins" ON public."reports" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text]));
CREATE POLICY "reports_insert_members" ON public."reports" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((private.is_org_member(organization_id) AND (generated_by = ( SELECT auth.uid() AS uid))));
CREATE POLICY "reports_select_members" ON public."reports" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.is_org_member(organization_id));
CREATE POLICY "reports_update_admins" ON public."reports" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text])) WITH CHECK (private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text]));
CREATE POLICY "task_updates_insert_members" ON public."task_updates" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((private.is_org_member(organization_id) AND (actor_user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM tasks t
  WHERE ((t.id = task_updates.task_id) AND (t.organization_id = task_updates.organization_id)))) AND ((actor_agent_id IS NULL) OR (EXISTS ( SELECT 1
   FROM ai_agents a
  WHERE ((a.id = task_updates.actor_agent_id) AND (a.organization_id = task_updates.organization_id))))) AND ((target_agent_id IS NULL) OR (EXISTS ( SELECT 1
   FROM ai_agents a
  WHERE ((a.id = task_updates.target_agent_id) AND (a.organization_id = task_updates.organization_id)))))));
CREATE POLICY "task_updates_select_members" ON public."task_updates" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.is_org_member(organization_id));
CREATE POLICY "tasks_delete_admins" ON public."tasks" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text]));
CREATE POLICY "tasks_insert_members" ON public."tasks" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((private.is_org_member(organization_id) AND (created_by = ( SELECT auth.uid() AS uid))));
CREATE POLICY "tasks_select_members" ON public."tasks" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.is_org_member(organization_id));
CREATE POLICY "tasks_update_members" ON public."tasks" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.is_org_member(organization_id)) WITH CHECK (private.is_org_member(organization_id));
CREATE POLICY "workflow_runs_insert_admins" ON public."workflow_runs" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text]) AND (EXISTS ( SELECT 1
   FROM automation_workflows w
  WHERE ((w.id = workflow_runs.workflow_id) AND (w.organization_id = workflow_runs.organization_id))))));
CREATE POLICY "workflow_runs_select_members" ON public."workflow_runs" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.is_org_member(organization_id));
CREATE POLICY "workflow_runs_update_admins" ON public."workflow_runs" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text]) AND (EXISTS ( SELECT 1
   FROM automation_workflows w
  WHERE ((w.id = workflow_runs.workflow_id) AND (w.organization_id = workflow_runs.organization_id)))))) WITH CHECK ((private.has_org_role(organization_id, ARRAY['owner'::text, 'admin'::text]) AND (EXISTS ( SELECT 1
   FROM automation_workflows w
  WHERE ((w.id = workflow_runs.workflow_id) AND (w.organization_id = workflow_runs.organization_id))))));

CREATE INDEX activity_logs_actor_agent_idx ON public.activity_logs USING btree (actor_agent_id);
CREATE INDEX activity_logs_actor_user_idx ON public.activity_logs USING btree (actor_user_id);
CREATE INDEX activity_logs_org_idx ON public.activity_logs USING btree (organization_id, created_at DESC);
CREATE INDEX agent_learning_events_agent_created_idx ON public.agent_learning_events USING btree (organization_id, agent_id, created_at DESC);
CREATE INDEX agent_learning_events_agent_fk_idx ON public.agent_learning_events USING btree (agent_id);
CREATE INDEX agent_learning_events_created_by_fk_idx ON public.agent_learning_events USING btree (created_by);
CREATE INDEX agent_learning_events_run_fk_idx ON public.agent_learning_events USING btree (agent_run_id);
CREATE INDEX agent_learning_events_task_fk_idx ON public.agent_learning_events USING btree (task_id);
CREATE INDEX agent_memories_agent_fk_idx ON public.agent_memories USING btree (agent_id);
CREATE INDEX agent_memories_approved_agent_idx ON public.agent_memories USING btree (organization_id, agent_id, updated_at DESC) WHERE (status = 'approved'::text);
CREATE INDEX agent_memories_created_by_fk_idx ON public.agent_memories USING btree (created_by);
CREATE INDEX agent_memories_reviewed_by_fk_idx ON public.agent_memories USING btree (reviewed_by);
CREATE INDEX agent_memories_source_run_fk_idx ON public.agent_memories USING btree (source_run_id);
CREATE INDEX agent_runs_agent_created_idx ON public.agent_runs USING btree (agent_id, created_at DESC);
CREATE INDEX agent_runs_created_by_idx ON public.agent_runs USING btree (created_by);
CREATE UNIQUE INDEX agent_runs_offline_sync_id_unique ON public.agent_runs USING btree (organization_id, ((output ->> 'offline_client_id'::text))) WHERE (output ? 'offline_client_id'::text);
CREATE UNIQUE INDEX agent_runs_one_running_per_task ON public.agent_runs USING btree (organization_id, task_id) WHERE ((status = 'running'::text) AND (task_id IS NOT NULL));
CREATE INDEX agent_runs_org_created_idx ON public.agent_runs USING btree (organization_id, created_at DESC);
CREATE INDEX agent_runs_task_idx ON public.agent_runs USING btree (task_id);
CREATE INDEX ai_agents_created_by_idx ON public.ai_agents USING btree (created_by);
CREATE INDEX ai_agents_department_idx ON public.ai_agents USING btree (department_id);
CREATE INDEX ai_agents_org_idx ON public.ai_agents USING btree (organization_id);
CREATE INDEX approvals_decided_by_idx ON public.approvals USING btree (decided_by);
CREATE INDEX approvals_org_status_idx ON public.approvals USING btree (organization_id, status, created_at DESC);
CREATE INDEX approvals_requested_by_idx ON public.approvals USING btree (requested_by);
CREATE INDEX workflows_created_by_idx ON public.automation_workflows USING btree (created_by);
CREATE INDEX workflows_org_idx ON public.automation_workflows USING btree (organization_id);
CREATE INDEX conversations_created_by_idx ON public.conversations USING btree (created_by);
CREATE INDEX conversations_org_idx ON public.conversations USING btree (organization_id, updated_at DESC);
CREATE INDEX departments_org_idx ON public.departments USING btree (organization_id);
CREATE INDEX knowledge_documents_created_by_idx ON public.knowledge_documents USING btree (created_by);
CREATE INDEX knowledge_documents_org_idx ON public.knowledge_documents USING btree (organization_id);
CREATE INDEX messages_agent_idx ON public.messages USING btree (agent_id);
CREATE INDEX messages_conversation_idx ON public.messages USING btree (conversation_id, created_at);
CREATE INDEX messages_organization_idx ON public.messages USING btree (organization_id);
CREATE INDEX office_commands_agent_active_idx ON public.office_commands USING btree (agent_id, created_at DESC) WHERE (status = ANY (ARRAY['pending'::text, 'in_progress'::text]));
CREATE UNIQUE INDEX office_commands_one_active_per_agent ON public.office_commands USING btree (agent_id) WHERE (status = ANY (ARRAY['pending'::text, 'in_progress'::text]));
CREATE INDEX office_commands_org_created_idx ON public.office_commands USING btree (organization_id, created_at DESC);
CREATE INDEX office_meeting_attendees_agent_idx ON public.office_meeting_attendees USING btree (agent_id);
CREATE INDEX office_meeting_attendees_meeting_idx ON public.office_meeting_attendees USING btree (meeting_id);
CREATE INDEX office_meeting_attendees_org_idx ON public.office_meeting_attendees USING btree (organization_id);
CREATE INDEX office_meetings_created_by_idx ON public.office_meetings USING btree (created_by);
CREATE INDEX office_meetings_org_status_date_idx ON public.office_meetings USING btree (organization_id, status, scheduled_for DESC);
CREATE INDEX organization_members_user_idx ON public.organization_members USING btree (user_id);
CREATE INDEX organizations_created_by_idx ON public.organizations USING btree (created_by);
CREATE INDEX reports_generated_by_idx ON public.reports USING btree (generated_by);
CREATE INDEX reports_org_idx ON public.reports USING btree (organization_id, created_at DESC);
CREATE INDEX task_updates_actor_agent_created_idx ON public.task_updates USING btree (organization_id, actor_agent_id, created_at DESC) WHERE (actor_agent_id IS NOT NULL);
CREATE INDEX task_updates_org_task_created_idx ON public.task_updates USING btree (organization_id, task_id, created_at DESC);
CREATE INDEX tasks_assigned_agent_idx ON public.tasks USING btree (assigned_agent_id);
CREATE INDEX tasks_assigned_user_idx ON public.tasks USING btree (assigned_user_id);
CREATE INDEX tasks_created_by_idx ON public.tasks USING btree (created_by);
CREATE INDEX tasks_department_idx ON public.tasks USING btree (department_id);
CREATE UNIQUE INDEX tasks_offline_sync_id_unique ON public.tasks USING btree (organization_id, ((metadata ->> 'offline_client_id'::text))) WHERE (metadata ? 'offline_client_id'::text);
CREATE INDEX tasks_org_status_idx ON public.tasks USING btree (organization_id, status, created_at DESC);
CREATE UNIQUE INDEX workflow_runs_one_running_per_workflow ON public.workflow_runs USING btree (organization_id, workflow_id) WHERE (status = 'running'::text);
CREATE INDEX workflow_runs_org_idx ON public.workflow_runs USING btree (organization_id, created_at DESC);
CREATE INDEX workflow_runs_workflow_idx ON public.workflow_runs USING btree (workflow_id);

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."activity_logs" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."activity_logs" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."activity_logs" TO "postgres" WITH GRANT OPTION;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."activity_logs" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."agent_learning_events" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."agent_learning_events" TO "postgres" WITH GRANT OPTION;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."agent_learning_events" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."agent_memories" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."agent_memories" TO "postgres" WITH GRANT OPTION;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."agent_memories" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."agent_runs" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."agent_runs" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."agent_runs" TO "postgres" WITH GRANT OPTION;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."agent_runs" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."ai_agents" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."ai_agents" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."ai_agents" TO "postgres" WITH GRANT OPTION;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."ai_agents" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."approvals" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."approvals" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."approvals" TO "postgres" WITH GRANT OPTION;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."approvals" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."automation_workflows" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."automation_workflows" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."automation_workflows" TO "postgres" WITH GRANT OPTION;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."automation_workflows" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."conversations" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."conversations" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."conversations" TO "postgres" WITH GRANT OPTION;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."conversations" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."departments" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."departments" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."departments" TO "postgres" WITH GRANT OPTION;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."departments" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."knowledge_documents" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."knowledge_documents" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."knowledge_documents" TO "postgres" WITH GRANT OPTION;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."knowledge_documents" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."messages" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."messages" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."messages" TO "postgres" WITH GRANT OPTION;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."messages" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."office_commands" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."office_commands" TO "postgres" WITH GRANT OPTION;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."office_commands" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."office_meeting_attendees" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."office_meeting_attendees" TO "postgres" WITH GRANT OPTION;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."office_meeting_attendees" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."office_meetings" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."office_meetings" TO "postgres" WITH GRANT OPTION;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."office_meetings" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."organization_members" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."organization_members" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."organization_members" TO "postgres" WITH GRANT OPTION;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."organization_members" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."organizations" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."organizations" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."organizations" TO "postgres" WITH GRANT OPTION;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."organizations" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."profiles" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."profiles" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."profiles" TO "postgres" WITH GRANT OPTION;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."profiles" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."reports" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."reports" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."reports" TO "postgres" WITH GRANT OPTION;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."reports" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."task_updates" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."task_updates" TO "postgres" WITH GRANT OPTION;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."task_updates" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."tasks" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."tasks" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."tasks" TO "postgres" WITH GRANT OPTION;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."tasks" TO "service_role";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."workflow_runs" TO "anon";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."workflow_runs" TO "authenticated";
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."workflow_runs" TO "postgres" WITH GRANT OPTION;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."workflow_runs" TO "service_role";
GRANT EXECUTE ON FUNCTION "private"."enforce_ai_task_review_gate"() TO "postgres" WITH GRANT OPTION;
GRANT EXECUTE ON FUNCTION "private"."has_org_role"(target_org uuid, allowed_roles text[]) TO "authenticated";
GRANT EXECUTE ON FUNCTION "private"."has_org_role"(target_org uuid, allowed_roles text[]) TO "postgres" WITH GRANT OPTION;
GRANT EXECUTE ON FUNCTION "private"."is_org_member"(target_org uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION "private"."is_org_member"(target_org uuid) TO "postgres" WITH GRANT OPTION;
GRANT EXECUTE ON FUNCTION "public"."approve_task_handoff"(p_task_id uuid, p_request_id uuid, p_organization_id uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."approve_task_handoff"(p_task_id uuid, p_request_id uuid, p_organization_id uuid) TO "postgres" WITH GRANT OPTION;
GRANT EXECUTE ON FUNCTION "public"."approve_task_handoff"(p_task_id uuid, p_request_id uuid, p_organization_id uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION "public"."assign_task_to_agent"(p_task_id uuid, p_agent_id uuid, p_organization_id uuid, p_rationale text) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."assign_task_to_agent"(p_task_id uuid, p_agent_id uuid, p_organization_id uuid, p_rationale text) TO "postgres" WITH GRANT OPTION;
GRANT EXECUTE ON FUNCTION "public"."assign_task_to_agent"(p_task_id uuid, p_agent_id uuid, p_organization_id uuid, p_rationale text) TO "service_role";
GRANT EXECUTE ON FUNCTION "public"."create_organization"(org_name text) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."create_organization"(org_name text) TO "postgres" WITH GRANT OPTION;
GRANT EXECUTE ON FUNCTION "public"."create_organization"(org_name text) TO "service_role";
GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO "postgres" WITH GRANT OPTION;
GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO "service_role";
GRANT EXECUTE ON FUNCTION "public"."set_updated_at"() TO "PUBLIC";
GRANT EXECUTE ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT EXECUTE ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."set_updated_at"() TO "postgres" WITH GRANT OPTION;
GRANT EXECUTE ON FUNCTION "public"."set_updated_at"() TO "service_role";

-- Manual verification required: schema-level privileges, default privileges, extension setup,
-- Auth/storage managed objects, publication settings, role attributes, and Supabase platform config.
-- Review CREATE FUNCTION search_path/security settings and GRANTs before any target execution.
COMMIT;
