UPDATE public.integrations_config
SET values = jsonb_set(jsonb_set(values, '{from}', '"+551151044779"'), '{callerIdOverride}', '"+551151044779"')
WHERE provider = 'twilio' AND user_id = '7f42c706-09ef-432e-8959-7cf06b3225af';