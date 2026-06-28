
CREATE OR REPLACE FUNCTION public.get_app_config(_key text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT value FROM public.app_config WHERE key = _key
$$;

CREATE OR REPLACE FUNCTION public.current_plan(_uid uuid)
RETURNS text LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT COALESCE(plan, 'free') FROM public.profiles WHERE id = _uid
$$;

CREATE OR REPLACE FUNCTION public.ai_daily_limit(_uid uuid)
RETURNS int LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT (public.get_app_config(
    CASE WHEN public.current_plan(_uid) = 'premium'
         THEN 'ai_daily_limit_premium'
         ELSE 'ai_daily_limit_free' END
  ))::int
$$;

CREATE OR REPLACE FUNCTION public.current_ai_usage(_uid uuid)
RETURNS int LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT COALESCE(message_count, 0)
  FROM public.ai_usage_daily
  WHERE user_id = _uid AND day = (now() AT TIME ZONE 'utc')::date
$$;

REVOKE EXECUTE ON FUNCTION public.get_app_config(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_plan(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ai_daily_limit(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_ai_usage(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_app_config(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_plan(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ai_daily_limit(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_ai_usage(uuid) TO authenticated, service_role;
