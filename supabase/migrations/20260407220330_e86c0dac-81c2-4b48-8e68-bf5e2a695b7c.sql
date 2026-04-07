
ALTER TABLE public.events ADD COLUMN coupon_text text NOT NULL DEFAULT '';
ALTER TABLE public.events ADD COLUMN coupon_image_url text;

INSERT INTO storage.buckets (id, name, public) VALUES ('coupon-images', 'coupon-images', true);

CREATE POLICY "Anyone can upload coupon images" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'coupon-images');
CREATE POLICY "Anyone can view coupon images" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'coupon-images');
