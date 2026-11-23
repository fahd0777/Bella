-- allow owner-defined categories (stored in public.categories) on these columns
alter table public.tasks drop constraint if exists tasks_category_check;
alter table public.appointments drop constraint if exists appointments_category_check;
alter table public.expenses drop constraint if exists expenses_category_check;
alter table public.household_tasks drop constraint if exists household_tasks_category_check;
alter table public.tasks add constraint tasks_category_len check (char_length(category) between 1 and 60);
alter table public.appointments add constraint appointments_category_len check (char_length(category) between 1 and 60);
alter table public.expenses add constraint expenses_category_len check (char_length(category) between 1 and 60);
alter table public.household_tasks add constraint household_tasks_category_len check (char_length(category) between 1 and 60);
alter table public.categories add constraint categories_name_len check (char_length(name) between 1 and 60);
