alter table public.tn_production_recognition
  add column if not exists achievement_level text not null default 'spotlight',
  add column if not exists recognition_period text,
  add column if not exists evidence_url text;

alter table public.tn_production_recognition
  drop constraint if exists tn_production_recognition_level_check,
  add constraint tn_production_recognition_level_check
    check (achievement_level in ('spotlight','bronze','silver','gold','legacy')),
  drop constraint if exists tn_production_recognition_evidence_https_check,
  add constraint tn_production_recognition_evidence_https_check
    check (evidence_url is null or evidence_url ~* '^https://');

comment on column public.tn_production_recognition.achievement_level is 'Producer-selected recognition tier; does not imply compensation or employment status.';
comment on column public.tn_production_recognition.recognition_period is 'Optional period or milestone label attached to the recognition.';
comment on column public.tn_production_recognition.evidence_url is 'Optional HTTPS link supporting the recognition.';
