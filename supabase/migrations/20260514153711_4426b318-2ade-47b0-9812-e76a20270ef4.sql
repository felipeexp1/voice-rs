UPDATE auth.users
SET
  confirmation_token = COALESCE(confirmation_token, ''),
  email_change = COALESCE(email_change, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  recovery_token = COALESCE(recovery_token, ''),
  reauthentication_token = COALESCE(reauthentication_token, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  encrypted_password = CASE WHEN email = 'admin@voicers.local' THEN crypt('Admin@voice.2026', gen_salt('bf')) ELSE encrypted_password END
WHERE email = 'admin@voicers.local' OR confirmation_token IS NULL OR email_change IS NULL OR recovery_token IS NULL;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users WHERE email = 'admin@voicers.local'
ON CONFLICT (user_id, role) DO NOTHING;