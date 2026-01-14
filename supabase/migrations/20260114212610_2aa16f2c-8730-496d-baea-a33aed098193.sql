-- Add preferred_language column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN preferred_language VARCHAR(10) DEFAULT 'ar';

-- Add comment
COMMENT ON COLUMN public.profiles.preferred_language IS 'User preferred language (ar, en)';