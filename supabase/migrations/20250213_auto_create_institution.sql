-- Function to handle new user signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.institutions (id, name, email, status)
  values (
    new.id, 
    coalesce(new.raw_user_meta_data->>'institution_name', 'New Institution'), -- Default name or from metadata
    new.email,
    'Autonomous'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
