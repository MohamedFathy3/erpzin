-- Fix CLIENT_SIDE_AUTH: Update has_permission to require user_id matches auth.uid()
-- This prevents permission enumeration attacks where users could check permissions for other users

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _module text, _action text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = _user_id
      AND _user_id = auth.uid()  -- SECURITY: Require user_id matches authenticated user
      AND p.module = _module
      AND p.action = _action
      AND p.is_active = true
  )
$function$;

-- Also create a convenience function that automatically uses auth.uid()
CREATE OR REPLACE FUNCTION public.has_current_user_permission(_module text, _action text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = auth.uid()
      AND p.module = _module
      AND p.action = _action
      AND p.is_active = true
  )
$function$;