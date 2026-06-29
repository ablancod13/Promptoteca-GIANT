alter table public.folders
  add column if not exists color text not null default '#017F88';

alter table public.custom_prompt_versions
  add column if not exists version_type text not null default 'template';

create unique index if not exists custom_prompt_private_edit_unique_idx
  on public.custom_prompt_versions(user_id, original_prompt_id)
  where version_type = 'private_edit';
