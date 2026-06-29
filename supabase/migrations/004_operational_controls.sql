create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}',
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

drop policy if exists "App settings are public" on public.app_settings;
create policy "App settings are public" on public.app_settings
  for select to anon, authenticated using (true);

drop policy if exists "Developers manage app settings" on public.app_settings;
create policy "Developers manage app settings" on public.app_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.app_settings (key, value)
values ('home_metrics', '{"showRegisteredUsers": true}'::jsonb)
on conflict (key) do nothing;

with seed_categories(name, slug, status) as (
  values
    (U&'An\00E1lisis de datos', 'analisis-de-datos', 'active'),
    (U&'Bioinform\00E1tica', 'bioinformatica', 'active'),
    (U&'Comunicaci\00F3n cient\00EDfica', 'comunicacion-cientifica', 'active'),
    ('Docencia', 'docencia', 'active'),
    ('Enfermedades infecciosas', 'enfermedades-infecciosas', 'active'),
    (U&'Gesti\00F3n de correo electr\00F3nico', 'gestion-de-correo-electronico', 'active'),
    ('Herramientas digitales', 'herramientas-digitales', 'active'),
    (U&'Investigaci\00F3n', 'investigacion', 'active'),
    (U&'Lectura cr\00EDtica', 'lectura-critica', 'active'),
    (U&'Microbiolog\00EDa cl\00EDnica', 'microbiologia-clinica', 'active'),
    ('Presentaciones', 'presentaciones', 'active'),
    ('PROA', 'proa', 'active'),
    (U&'Preparaci\00F3n de sesiones cl\00EDnicas', 'preparacion-de-sesiones-clinicas', 'active'),
    (U&'Productividad cl\00EDnica', 'productividad-clinica', 'active'),
    ('Productividad en laboratorio', 'productividad-en-laboratorio', 'active'),
    (U&'Protocolos y gu\00EDas cl\00EDnicas', 'protocolos-y-guias-clinicas', 'active'),
    (U&'Redacci\00F3n cient\00EDfica', 'redaccion-cientifica', 'active'),
    ('Redes sociales profesionales', 'redes-sociales-profesionales', 'active'),
    (U&'Revisi\00F3n bibliogr\00E1fica', 'revision-bibliografica', 'active'),
    (U&'Simulaci\00F3n cl\00EDnica', 'simulacion-clinica', 'active')
)
update public.categories c
set name = s.name,
    status = s.status
from seed_categories s
where c.slug = s.slug;

with seed_categories(name, slug, status) as (
  values
    (U&'An\00E1lisis de datos', 'analisis-de-datos', 'active'),
    (U&'Bioinform\00E1tica', 'bioinformatica', 'active'),
    (U&'Comunicaci\00F3n cient\00EDfica', 'comunicacion-cientifica', 'active'),
    ('Docencia', 'docencia', 'active'),
    ('Enfermedades infecciosas', 'enfermedades-infecciosas', 'active'),
    (U&'Gesti\00F3n de correo electr\00F3nico', 'gestion-de-correo-electronico', 'active'),
    ('Herramientas digitales', 'herramientas-digitales', 'active'),
    (U&'Investigaci\00F3n', 'investigacion', 'active'),
    (U&'Lectura cr\00EDtica', 'lectura-critica', 'active'),
    (U&'Microbiolog\00EDa cl\00EDnica', 'microbiologia-clinica', 'active'),
    ('Presentaciones', 'presentaciones', 'active'),
    ('PROA', 'proa', 'active'),
    (U&'Preparaci\00F3n de sesiones cl\00EDnicas', 'preparacion-de-sesiones-clinicas', 'active'),
    (U&'Productividad cl\00EDnica', 'productividad-clinica', 'active'),
    ('Productividad en laboratorio', 'productividad-en-laboratorio', 'active'),
    (U&'Protocolos y gu\00EDas cl\00EDnicas', 'protocolos-y-guias-clinicas', 'active'),
    (U&'Redacci\00F3n cient\00EDfica', 'redaccion-cientifica', 'active'),
    ('Redes sociales profesionales', 'redes-sociales-profesionales', 'active'),
    (U&'Revisi\00F3n bibliogr\00E1fica', 'revision-bibliografica', 'active'),
    (U&'Simulaci\00F3n cl\00EDnica', 'simulacion-clinica', 'active')
)
update public.categories c
set slug = s.slug,
    status = s.status
from seed_categories s
where c.name = s.name
  and not exists (
    select 1
    from public.categories other
    where other.slug = s.slug
      and other.id <> c.id
  );

with seed_categories(name, slug, status) as (
  values
    (U&'An\00E1lisis de datos', 'analisis-de-datos', 'active'),
    (U&'Bioinform\00E1tica', 'bioinformatica', 'active'),
    (U&'Comunicaci\00F3n cient\00EDfica', 'comunicacion-cientifica', 'active'),
    ('Docencia', 'docencia', 'active'),
    ('Enfermedades infecciosas', 'enfermedades-infecciosas', 'active'),
    (U&'Gesti\00F3n de correo electr\00F3nico', 'gestion-de-correo-electronico', 'active'),
    ('Herramientas digitales', 'herramientas-digitales', 'active'),
    (U&'Investigaci\00F3n', 'investigacion', 'active'),
    (U&'Lectura cr\00EDtica', 'lectura-critica', 'active'),
    (U&'Microbiolog\00EDa cl\00EDnica', 'microbiologia-clinica', 'active'),
    ('Presentaciones', 'presentaciones', 'active'),
    ('PROA', 'proa', 'active'),
    (U&'Preparaci\00F3n de sesiones cl\00EDnicas', 'preparacion-de-sesiones-clinicas', 'active'),
    (U&'Productividad cl\00EDnica', 'productividad-clinica', 'active'),
    ('Productividad en laboratorio', 'productividad-en-laboratorio', 'active'),
    (U&'Protocolos y gu\00EDas cl\00EDnicas', 'protocolos-y-guias-clinicas', 'active'),
    (U&'Redacci\00F3n cient\00EDfica', 'redaccion-cientifica', 'active'),
    ('Redes sociales profesionales', 'redes-sociales-profesionales', 'active'),
    (U&'Revisi\00F3n bibliogr\00E1fica', 'revision-bibliografica', 'active'),
    (U&'Simulaci\00F3n cl\00EDnica', 'simulacion-clinica', 'active')
)
insert into public.categories (name, slug, status)
select s.name, s.slug, s.status
from seed_categories s
where not exists (select 1 from public.categories c where c.name = s.name)
  and not exists (select 1 from public.categories c where c.slug = s.slug);

insert into public.prompt_tool_options (name, status)
values
  ('ChatGPT', 'active'),
  ('Codex', 'active'),
  ('Claude', 'active'),
  ('Gemini', 'active'),
  ('Microsoft Copilot', 'active'),
  ('Perplexity', 'active'),
  ('NotebookLM', 'active'),
  ('Elicit', 'active'),
  ('Consensus', 'active'),
  ('Scite', 'active'),
  ('Herramienta local', 'active'),
  ('Otro', 'active')
on conflict (name) do update
set status = excluded.status;

insert into public.ai_model_options (name, tool_name, status)
values
  ('ChatGPT 5.5', 'ChatGPT', 'active'),
  ('ChatGPT 5.4', 'ChatGPT', 'active'),
  ('Codex 5.5', 'Codex', 'active'),
  ('Codex 5.4', 'Codex', 'active'),
  ('Claude Opus', 'Claude', 'active'),
  ('Claude Sonnet', 'Claude', 'active'),
  ('Claude Haiku', 'Claude', 'active'),
  ('Gemini Advanced', 'Gemini', 'active'),
  ('Gemini Pro', 'Gemini', 'active'),
  ('Microsoft Copilot', 'Microsoft Copilot', 'active'),
  ('Perplexity Sonar', 'Perplexity', 'active'),
  ('NotebookLM', 'NotebookLM', 'active'),
  ('Elicit', 'Elicit', 'active'),
  ('Consensus', 'Consensus', 'active'),
  ('Scite', 'Scite', 'active'),
  ('Herramienta local', 'Herramienta local', 'active'),
  ('Otro', 'Otro', 'active')
on conflict (name) do update
set tool_name = excluded.tool_name,
    status = excluded.status;
