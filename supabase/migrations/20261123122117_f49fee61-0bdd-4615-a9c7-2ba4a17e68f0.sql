DROP POLICY IF EXISTS "doctors_clinic_admin_create" ON public.doctors;
CREATE POLICY "doctors_clinic_staff_create" ON public.doctors FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.clinic_members m WHERE m.clinic_id = doctors.clinic_id AND m.user_id = auth.uid() AND m.role = ANY (ARRAY['admin'::text,'receptionist'::text])));

DROP POLICY IF EXISTS "doctors_clinic_admin_update" ON public.doctors;
CREATE POLICY "doctors_clinic_staff_update" ON public.doctors FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.clinic_members m WHERE m.clinic_id = doctors.clinic_id AND m.user_id = auth.uid() AND m.role = ANY (ARRAY['admin'::text,'receptionist'::text])))
WITH CHECK (EXISTS (SELECT 1 FROM public.clinic_members m WHERE m.clinic_id = doctors.clinic_id AND m.user_id = auth.uid() AND m.role = ANY (ARRAY['admin'::text,'receptionist'::text])));

DROP POLICY IF EXISTS "doctor_schedules_clinic_admin_create" ON public.doctor_schedules;
CREATE POLICY "doctor_schedules_clinic_staff_create" ON public.doctor_schedules FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.clinic_members m WHERE m.clinic_id = doctor_schedules.clinic_id AND m.user_id = auth.uid() AND m.role = ANY (ARRAY['admin'::text,'receptionist'::text]))
AND EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_schedules.doctor_id AND d.clinic_id = doctor_schedules.clinic_id));

DROP POLICY IF EXISTS "doctor_schedules_clinic_admin_update" ON public.doctor_schedules;
CREATE POLICY "doctor_schedules_clinic_staff_update" ON public.doctor_schedules FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.clinic_members m WHERE m.clinic_id = doctor_schedules.clinic_id AND m.user_id = auth.uid() AND m.role = ANY (ARRAY['admin'::text,'receptionist'::text])))
WITH CHECK (EXISTS (SELECT 1 FROM public.clinic_members m WHERE m.clinic_id = doctor_schedules.clinic_id AND m.user_id = auth.uid() AND m.role = ANY (ARRAY['admin'::text,'receptionist'::text])));