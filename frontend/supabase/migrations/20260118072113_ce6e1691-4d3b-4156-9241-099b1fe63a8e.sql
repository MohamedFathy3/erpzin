-- Fix 1: Restrict audit_logs INSERT to authenticated users only
DROP POLICY IF EXISTS "System can create audit logs" ON public.audit_logs;

CREATE POLICY "Authenticated users can create audit logs" ON public.audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Fix 2: Restrict storage bucket write access to admins only
DROP POLICY IF EXISTS "Authenticated users can upload company logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update company logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete company logos" ON storage.objects;

-- Allow only admins to upload company logos
CREATE POLICY "Admins can upload company logos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'company-logos' 
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- Allow only admins to update company logos
CREATE POLICY "Admins can update company logos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- Allow only admins to delete company logos
CREATE POLICY "Admins can delete company logos" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );