alter table public.hangouts add column if not exists photo_url text;

insert into storage.buckets (id, name, public)
values ('hangout-photos', 'hangout-photos', true)
on conflict (id) do update set public = true;
