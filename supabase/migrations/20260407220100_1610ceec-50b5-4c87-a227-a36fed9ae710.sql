
-- Events table: admin creates events with access codes and coupon rewards
CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  access_code text NOT NULL UNIQUE,
  coupon_reward text NOT NULL DEFAULT 'Complimentary Snack',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  latitude double precision,
  longitude double precision,
  active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read events" ON public.events FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can insert events" ON public.events FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anyone can update events" ON public.events FOR UPDATE TO anon USING (true);

-- Add event_id to coupons table
ALTER TABLE public.coupons ADD COLUMN event_id uuid REFERENCES public.events(id);

-- Scans log table for tracking scan counts per event
CREATE TABLE public.scan_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id),
  student_id uuid NOT NULL REFERENCES public.students(id),
  result text NOT NULL,
  distance_feet integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.scan_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read scan_logs" ON public.scan_logs FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can insert scan_logs" ON public.scan_logs FOR INSERT TO anon WITH CHECK (true);
