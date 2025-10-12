-- Create system settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage settings
CREATE POLICY "Admins can manage system settings"
ON public.system_settings
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow all authenticated users to read settings
CREATE POLICY "Authenticated users can read system settings"
ON public.system_settings
FOR SELECT
USING (auth.role() = 'authenticated');

-- Insert default accessibility widget setting
INSERT INTO public.system_settings (key, value, description)
VALUES (
  'accessibility_widget_enabled',
  'true'::jsonb,
  'Controls whether the accessibility widget is visible to users'
)
ON CONFLICT (key) DO NOTHING;

-- Create updated_at trigger
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();