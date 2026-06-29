alter table public.prompts
  add column if not exists limitations text not null default '',
  add column if not exists misuse_risks text not null default '',
  add column if not exists source_references text[] not null default '{}',
  add column if not exists time_saved_minutes integer not null default 0 check (time_saved_minutes >= 0);
