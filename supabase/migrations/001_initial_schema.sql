create extension if not exists pgcrypto;
create extension if not exists vector with schema extensions;

create type public.platform_role as enum ('registered', 'moderator_candidate', 'moderator', 'admin', 'developer');
create type public.review_status as enum ('pending', 'approved', 'changes_requested', 'rejected', 'archived', 'hidden');
create type public.prompt_difficulty as enum ('principiante', 'intermedio', 'avanzado');
create type public.variable_field_type as enum ('text', 'textarea', 'select', 'multiselect', 'number', 'date');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  first_name text not null,
  last_name text not null,
  display_name text not null,
  country text not null,
  region text not null,
  city text,
  birth_year integer check (birth_year between 1900 and 2100),
  professional_role text not null,
  role_detail text,
  specialization_year integer check (specialization_year between 1950 and 2050),
  specialty text,
  institution text,
  institution_type text,
  primary_activity_area text,
  professional_experience_years integer check (professional_experience_years between 0 and 70),
  seimc_member boolean,
  license_number text,
  residency_year integer,
  interest_area text,
  ai_experience_level text not null,
  ai_professional_use text not null,
  ai_frequency text not null,
  ai_tools text[] not null default '{}',
  ai_tools_other text,
  platform_role public.platform_role not null default 'registered',
  points integer not null default 0 check (points >= 0),
  level integer not null default 1 check (level >= 1),
  terms_accepted_at timestamptz not null default now(),
  privacy_accepted_at timestamptz not null default now(),
  research_consent_at timestamptz not null default now(),
  account_status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  status text not null default 'active',
  created_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  parent_id uuid references public.categories(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.prompt_tool_options (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  status text not null default 'active',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.ai_model_options (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  tool_name text,
  status text not null default 'active',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.about_content (
  id text primary key default 'main',
  title text not null default 'Quiénes somos',
  intro text not null,
  composition text not null,
  creator_note text not null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint about_content_singleton check (id = 'main')
);

create table public.about_people (
  id uuid primary key default gen_random_uuid(),
  display_order integer not null default 0,
  name text not null,
  role text not null,
  bio text not null default '',
  person_type text not null default 'member',
  photo_url text,
  photo_storage_path text,
  photo_alt text,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, person_type)
);

create table public.prompts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null,
  content text not null,
  objective text,
  context text,
  author_id uuid references public.profiles(id) on delete set null,
  author_display_name text not null default 'Equipo GIANT',
  primary_category_id uuid not null references public.categories(id),
  proposed_category text,
  recommended_tools text[] not null default '{}',
  recommended_model text,
  intelligence_level text,
  language text not null,
  best_language text not null,
  difficulty public.prompt_difficulty not null default 'principiante',
  tags text[] not null default '{}',
  review_status public.review_status not null default 'pending',
  experimental boolean not null default false,
  validated_by_giant boolean not null default false,
  giant_quality_score integer check (giant_quality_score between 1 and 5),
  no_patient_data_confirmed boolean not null default false,
  license text not null default 'CC BY 4.0',
  version_current integer not null default 1,
  likes_count integer not null default 0 check (likes_count >= 0),
  favorites_count integer not null default 0 check (favorites_count >= 0),
  copies_count integer not null default 0 check (copies_count >= 0),
  template_uses_count integer not null default 0 check (template_uses_count >= 0),
  average_open_seconds integer,
  hidden_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.prompt_categories (
  prompt_id uuid not null references public.prompts(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  is_primary boolean not null default false,
  primary key (prompt_id, category_id)
);

create table public.prompt_versions (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references public.prompts(id) on delete cascade,
  version_number integer not null,
  content text not null,
  summary text,
  created_by uuid references public.profiles(id) on delete set null,
  change_reason text,
  created_at timestamptz not null default now(),
  unique (prompt_id, version_number)
);

create table public.prompt_variables (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references public.prompts(id) on delete cascade,
  name text not null,
  token text not null,
  field_type public.variable_field_type not null default 'text',
  options text[] not null default '{}',
  required boolean not null default true,
  help_text text,
  default_value text,
  order_index integer not null default 0,
  unique (prompt_id, token)
);

create table public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  prompt_id uuid not null references public.prompts(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, prompt_id)
);

create table public.private_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  prompt_id uuid not null references public.prompts(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, prompt_id)
);

create table public.custom_prompt_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  original_prompt_id uuid not null references public.prompts(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete set null,
  title text not null,
  content text not null,
  variable_values jsonb not null default '{}',
  private_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  prompt_id uuid not null references public.prompts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, prompt_id)
);

create table public.edit_suggestions (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references public.prompts(id) on delete cascade,
  editor_id uuid not null references public.profiles(id) on delete cascade,
  original_text text not null,
  proposed_text text not null,
  justification text not null,
  suggestion_type text not null default 'content',
  status text not null default 'pending',
  moderator_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references public.prompts(id) on delete cascade,
  reporter_id uuid references public.profiles(id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'open',
  moderator_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid references public.prompts(id) on delete cascade,
  moderator_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  previous_status public.review_status,
  next_status public.review_status,
  notes text,
  created_at timestamptz not null default now()
);

create table public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  points integer not null,
  prompt_id uuid references public.prompts(id) on delete set null,
  origin text not null default 'system',
  anti_fraud_status text not null default 'valid',
  idempotency_key text,
  created_at timestamptz not null default now()
);

create unique index points_ledger_idempotency_key_idx on public.points_ledger(idempotency_key) where idempotency_key is not null;
create unique index profiles_display_name_unique_idx on public.profiles(lower(display_name));

create table public.levels (
  level integer primary key,
  min_xp integer not null,
  max_xp integer,
  name text not null
);

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null,
  icon text not null,
  image_url text,
  image_storage_path text,
  image_alt text,
  criterion text not null,
  shareable boolean not null default true
);

create table public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (user_id, badge_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  read_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  anonymous_id text,
  event_type text not null,
  prompt_id uuid references public.prompts(id) on delete set null,
  metadata jsonb not null default '{}',
  occurred_at timestamptz not null default now()
);

create table public.prompt_embeddings (
  prompt_id uuid primary key references public.prompts(id) on delete cascade,
  embedding extensions.vector(1536) not null,
  model text not null default 'text-embedding-3-small',
  source_hash text not null,
  updated_at timestamptz not null default now()
);

create index categories_slug_idx on public.categories(slug);
create index prompt_tool_options_status_idx on public.prompt_tool_options(status);
create index ai_model_options_status_idx on public.ai_model_options(status);
create index about_people_active_order_idx on public.about_people(active, display_order);
create index prompts_primary_category_idx on public.prompts(primary_category_id);
create index prompts_review_status_idx on public.prompts(review_status);
create index prompts_created_at_idx on public.prompts(created_at desc);
create index prompts_tags_idx on public.prompts using gin(tags);
create index prompts_tools_idx on public.prompts using gin(recommended_tools);
create index analytics_events_type_time_idx on public.analytics_events(event_type, occurred_at desc);
create index prompt_embeddings_hnsw_idx on public.prompt_embeddings using hnsw (embedding extensions.vector_cosine_ops);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();

create trigger prompts_touch_updated_at before update on public.prompts
for each row execute function public.touch_updated_at();

create trigger about_content_touch_updated_at before update on public.about_content
for each row execute function public.touch_updated_at();

create trigger about_people_touch_updated_at before update on public.about_people
for each row execute function public.touch_updated_at();

create trigger private_notes_touch_updated_at before update on public.private_notes
for each row execute function public.touch_updated_at();

create trigger custom_prompt_versions_touch_updated_at before update on public.custom_prompt_versions
for each row execute function public.touch_updated_at();

create or replace function public.current_platform_role()
returns public.platform_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select platform_role from public.profiles where id = auth.uid()),
    'registered'::public.platform_role
  );
$$;

create or replace function public.is_moderator_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and platform_role in ('moderator', 'admin', 'developer')
      and account_status = 'active'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and platform_role in ('admin', 'developer')
      and account_status = 'active'
  );
$$;

create or replace function public.visible_prompt(prompt_status public.review_status)
returns boolean
language sql
immutable
as $$
  select prompt_status not in ('hidden', 'archived', 'rejected');
$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.prompt_tool_options enable row level security;
alter table public.ai_model_options enable row level security;
alter table public.about_content enable row level security;
alter table public.about_people enable row level security;
alter table public.prompts enable row level security;
alter table public.prompt_categories enable row level security;
alter table public.prompt_versions enable row level security;
alter table public.prompt_variables enable row level security;
alter table public.folders enable row level security;
alter table public.favorites enable row level security;
alter table public.private_notes enable row level security;
alter table public.custom_prompt_versions enable row level security;
alter table public.likes enable row level security;
alter table public.edit_suggestions enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.points_ledger enable row level security;
alter table public.levels enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.notifications enable row level security;
alter table public.analytics_events enable row level security;
alter table public.prompt_embeddings enable row level security;

create policy "Profiles can read themselves" on public.profiles
  for select to authenticated using (auth.uid() = id or public.is_moderator_or_admin());

create policy "Profiles can update themselves" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "Profiles can insert themselves" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

create policy "Categories are public" on public.categories
  for select to anon, authenticated using (status = 'active' or public.is_moderator_or_admin());

create policy "Moderators manage categories" on public.categories
  for all to authenticated using (public.is_moderator_or_admin()) with check (public.is_moderator_or_admin());

create policy "Prompt tool options are public" on public.prompt_tool_options
  for select to anon, authenticated using (status = 'active' or public.is_moderator_or_admin());

create policy "Moderators manage prompt tool options" on public.prompt_tool_options
  for all to authenticated using (public.is_moderator_or_admin()) with check (public.is_moderator_or_admin());

create policy "AI model options are public" on public.ai_model_options
  for select to anon, authenticated using (status = 'active' or public.is_moderator_or_admin());

create policy "Moderators manage AI model options" on public.ai_model_options
  for all to authenticated using (public.is_moderator_or_admin()) with check (public.is_moderator_or_admin());

create policy "About content is public" on public.about_content
  for select to anon, authenticated using (true);

create policy "Developers manage about content" on public.about_content
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Active about people are public" on public.about_people
  for select to anon, authenticated using (active or public.is_admin());

create policy "Developers manage about people" on public.about_people
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Visible prompts are public" on public.prompts
  for select to anon, authenticated using (public.visible_prompt(review_status));

create policy "Authenticated users submit prompts" on public.prompts
  for insert to authenticated
  with check (
    auth.uid() = author_id
    and no_patient_data_confirmed
    and license = 'CC BY 4.0'
    and review_status = 'pending'
  );

create policy "Authors can revise pending prompts" on public.prompts
  for update to authenticated
  using (auth.uid() = author_id and review_status in ('pending', 'changes_requested'))
  with check (auth.uid() = author_id and review_status in ('pending', 'changes_requested'));

create policy "Moderators manage prompts" on public.prompts
  for update to authenticated using (public.is_moderator_or_admin()) with check (public.is_moderator_or_admin());

create policy "Prompt category links follow visible prompts" on public.prompt_categories
  for select to anon, authenticated using (
    exists (
      select 1 from public.prompts p
      where p.id = prompt_id and public.visible_prompt(p.review_status)
    )
  );

create policy "Moderators manage prompt categories" on public.prompt_categories
  for all to authenticated using (public.is_moderator_or_admin()) with check (public.is_moderator_or_admin());

create policy "Authors add prompt categories" on public.prompt_categories
  for insert to authenticated with check (
    exists (select 1 from public.prompts p where p.id = prompt_id and p.author_id = auth.uid())
  );

create policy "Prompt versions visible with prompt" on public.prompt_versions
  for select to anon, authenticated using (
    exists (
      select 1 from public.prompts p
      where p.id = prompt_id
        and (public.visible_prompt(p.review_status) or p.author_id = auth.uid() or public.is_moderator_or_admin())
    )
  );

create policy "Moderators write prompt versions" on public.prompt_versions
  for insert to authenticated with check (public.is_moderator_or_admin() or created_by = auth.uid());

create policy "Prompt variables visible with prompt" on public.prompt_variables
  for select to anon, authenticated using (
    exists (
      select 1 from public.prompts p
      where p.id = prompt_id and public.visible_prompt(p.review_status)
    )
  );

create policy "Authors and moderators manage prompt variables" on public.prompt_variables
  for all to authenticated using (
    public.is_moderator_or_admin()
    or exists (select 1 from public.prompts p where p.id = prompt_id and p.author_id = auth.uid())
  ) with check (
    public.is_moderator_or_admin()
    or exists (select 1 from public.prompts p where p.id = prompt_id and p.author_id = auth.uid())
  );

create policy "Users own folders" on public.folders
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users own favorites" on public.favorites
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users own private notes" on public.private_notes
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users own custom versions" on public.custom_prompt_versions
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users own likes" on public.likes
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users create edit suggestions" on public.edit_suggestions
  for insert to authenticated with check (auth.uid() = editor_id);

create policy "Users see own or moderation edit suggestions" on public.edit_suggestions
  for select to authenticated using (auth.uid() = editor_id or public.is_moderator_or_admin());

create policy "Moderators resolve edit suggestions" on public.edit_suggestions
  for update to authenticated using (public.is_moderator_or_admin()) with check (public.is_moderator_or_admin());

create policy "Anyone can report visible prompts" on public.reports
  for insert to anon, authenticated with check (
    exists (select 1 from public.prompts p where p.id = prompt_id and public.visible_prompt(p.review_status))
  );

create policy "Moderators manage reports" on public.reports
  for select to authenticated using (public.is_moderator_or_admin());

create policy "Moderators update reports" on public.reports
  for update to authenticated using (public.is_moderator_or_admin()) with check (public.is_moderator_or_admin());

create policy "Moderators write moderation actions" on public.moderation_actions
  for insert to authenticated with check (public.is_moderator_or_admin() and auth.uid() = moderator_id);

create policy "Moderators read moderation actions" on public.moderation_actions
  for select to authenticated using (public.is_moderator_or_admin());

create policy "Users read own points" on public.points_ledger
  for select to authenticated using (auth.uid() = user_id or public.is_moderator_or_admin());

create policy "Moderators insert points" on public.points_ledger
  for insert to authenticated with check (public.is_moderator_or_admin());

create policy "Levels are public" on public.levels
  for select to anon, authenticated using (true);

create policy "Badges are public" on public.badges
  for select to anon, authenticated using (true);

create policy "Users read own badges" on public.user_badges
  for select to authenticated using (auth.uid() = user_id or public.is_moderator_or_admin());

create policy "Users read own notifications" on public.notifications
  for select to authenticated using (auth.uid() = user_id);

create policy "Users mark own notifications" on public.notifications
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Analytics accepts events" on public.analytics_events
  for insert to anon, authenticated with check (true);

create policy "Admins read analytics" on public.analytics_events
  for select to authenticated using (public.is_admin());

create or replace function public.match_prompts_semantic(
  query_embedding extensions.vector(1536),
  match_count integer default 12,
  filter_category text default null,
  filter_language text default null
)
returns table (
  id uuid,
  slug text,
  title text,
  summary text,
  category text,
  language text,
  best_language text,
  review_status public.review_status,
  experimental boolean,
  validated_by_giant boolean,
  likes integer,
  favorites integer,
  copies integer,
  similarity double precision
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    p.id,
    p.slug,
    p.title,
    p.summary,
    c.name as category,
    p.language,
    p.best_language,
    p.review_status,
    p.experimental,
    p.validated_by_giant,
    p.likes_count as likes,
    p.favorites_count as favorites,
    p.copies_count as copies,
    1 - (e.embedding <=> query_embedding) as similarity
  from public.prompt_embeddings e
  join public.prompts p on p.id = e.prompt_id
  join public.categories c on c.id = p.primary_category_id
  where public.visible_prompt(p.review_status)
    and (filter_category is null or c.name = filter_category)
    and (filter_language is null or p.language = filter_language or p.best_language = filter_language)
  order by e.embedding <=> query_embedding
  limit greatest(1, least(match_count, 50));
$$;
