-- Create students table
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  barcode_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create student_locations table
CREATE TABLE public.student_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id)
);

-- Create coupons table
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  coupon_code TEXT NOT NULL UNIQUE,
  redeemed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event_locations table
CREATE TABLE public.event_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_locations ENABLE ROW LEVEL SECURITY;

-- Since this app uses simple registration (no auth), allow public access
CREATE POLICY "Anyone can read students" ON public.students FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can register as student" ON public.students FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anyone can read locations" ON public.student_locations FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can insert locations" ON public.student_locations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anyone can update locations" ON public.student_locations FOR UPDATE TO anon USING (true);

CREATE POLICY "Anyone can read coupons" ON public.coupons FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can create coupons" ON public.coupons FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anyone can update coupons" ON public.coupons FOR UPDATE TO anon USING (true);

CREATE POLICY "Anyone can read event locations" ON public.event_locations FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can create event locations" ON public.event_locations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anyone can update event locations" ON public.event_locations FOR UPDATE TO anon USING (true);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for student_locations
CREATE TRIGGER update_student_locations_updated_at
  BEFORE UPDATE ON public.student_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();