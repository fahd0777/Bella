alter table public.user_settings drop constraint if exists user_settings_theme_check;
alter table public.user_settings alter column theme set default 'rose';
update public.user_settings set theme = 'rose' where theme not in ('rose','sage','mocha');
alter table public.user_settings add constraint user_settings_theme_check check (theme in ('rose','sage','mocha'));
