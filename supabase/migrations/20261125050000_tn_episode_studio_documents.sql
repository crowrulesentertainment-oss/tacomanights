create table if not exists public.tn_production_episode_documents (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.tn_production_episodes(id) on delete cascade,
  document_type text not null check (document_type in ('outline','script','rundown','host_notes','promo_copy')),
  title text not null default '',
  content text not null default '',
  status text not null default 'draft' check (status in ('draft','ready_for_review','approved')),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tn_production_episode_documents_episode_type_key unique (episode_id, document_type),
  constraint tn_production_episode_documents_title_length check (char_length(title) <= 180),
  constraint tn_production_episode_documents_content_length check (char_length(content) <= 50000)
);
alter table public.tn_production_episode_documents enable row level security;
drop policy if exists "episode documents member read" on public.tn_production_episode_documents;
create policy "episode documents member read" on public.tn_production_episode_documents for select to authenticated using (private.tn_production_is_member());
drop policy if exists "episode documents member insert own" on public.tn_production_episode_documents;
create policy "episode documents member insert own" on public.tn_production_episode_documents for insert to authenticated with check (private.tn_production_is_member() and created_by = auth.uid() and updated_by = auth.uid());
drop policy if exists "episode documents owner or admin update" on public.tn_production_episode_documents;
create policy "episode documents owner or admin update" on public.tn_production_episode_documents for update to authenticated using (private.tn_production_is_member() and (created_by = auth.uid() or private.tn_production_is_admin())) with check (private.tn_production_is_member() and (created_by = auth.uid() or private.tn_production_is_admin()) and updated_by = auth.uid());
drop policy if exists "episode documents admin delete" on public.tn_production_episode_documents;
create policy "episode documents admin delete" on public.tn_production_episode_documents for delete to authenticated using (private.tn_production_is_admin());
create index if not exists tn_production_episode_documents_episode_idx on public.tn_production_episode_documents(episode_id);
