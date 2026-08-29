-- Run this after creating a user in Supabase Auth (Authentication > Users >
-- Add user, or have them sign up). Links that auth account to a staff row
-- so fn_is_staff() and the admin dashboard recognise them.
--
-- Find the new user's UUID in Authentication > Users, then:

insert into users (auth_user_id, name, email, role)
values (
  '00000000-0000-0000-0000-000000000000', -- replace with the auth.users id
  'Staff Name',
  'staff@example.com',
  'owner_admin' -- or 'sales_staff'
);
