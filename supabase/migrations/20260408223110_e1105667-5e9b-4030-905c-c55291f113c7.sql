
CREATE TABLE public.student_location_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_location_history_student_time ON public.student_location_history (student_id, created_at DESC);

ALTER TABLE public.student_location_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert location history"
ON public.student_location_history
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Anyone can read location history"
ON public.student_location_history
FOR SELECT
TO anon
USING (true);
