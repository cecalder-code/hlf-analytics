# Supabase Authentication Setup

## Anonymous public dashboard viewing

1. In Supabase Auth, enable Email/Password and/or external providers if desired.
2. Create a public role policy by allowing `select` on `stores` and `pickups` for `true`.

## Secure admin login

1. Use Supabase Auth for admin sign-in.
2. Create an admin user in Supabase or manage users via the Authentication panel.
3. Ensure the application uses authenticated session tokens for admin data entry.

## Environment variables

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_SERVICE_ROLE_KEY` (for admin server-side operations if needed)
