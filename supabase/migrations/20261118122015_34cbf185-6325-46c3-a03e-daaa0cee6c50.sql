GRANT INSERT (clinic_id, full_name, specialization, availability_status) ON public.doctors TO authenticated;
GRANT UPDATE (full_name, specialization, availability_status) ON public.doctors TO authenticated;

CREATE POLICY doctors_clinic_admin_create ON public.doctors
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.clinic_members m
  WHERE m.clinic_id = doctors.clinic_id AND m.user_id = auth.uid() AND m.role = 'admin'));

CREATE POLICY doctors_clinic_admin_update ON public.doctors
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.clinic_members m
  WHERE m.clinic_id = doctors.clinic_id AND m.user_id = auth.uid() AND m.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.clinic_members m
  WHERE m.clinic_id = doctors.clinic_id AND m.user_id = auth.uid() AND m.role = 'admin'));

GRANT INSERT (clinic_id, doctor_id, day_of_week, start_time, end_time, is_available) ON public.doctor_schedules TO authenticated;
GRANT UPDATE (day_of_week, start_time, end_time, is_available) ON public.doctor_schedules TO authenticated;

CREATE POLICY doctor_schedules_clinic_admin_create ON public.doctor_schedules
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.clinic_members m
    WHERE m.clinic_id = doctor_schedules.clinic_id AND m.user_id = auth.uid() AND m.role = 'admin')
  AND EXISTS (SELECT 1 FROM public.doctors d
    WHERE d.id = doctor_schedules.doctor_id AND d.clinic_id = doctor_schedules.clinic_id));

CREATE POLICY doctor_schedules_clinic_admin_update ON public.doctor_schedules
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.clinic_members m
  WHERE m.clinic_id = doctor_schedules.clinic_id AND m.user_id = auth.uid() AND m.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.clinic_members m
  WHERE m.clinic_id = doctor_schedules.clinic_id AND m.user_id = auth.uid() AND m.role = 'admin'));

GRANT UPDATE (name, address, phone, email, opening_hours) ON public.clinics TO authenticated;

CREATE POLICY clinics_clinic_admin_update ON public.clinics
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.clinic_members m
  WHERE m.clinic_id = clinics.id AND m.user_id = auth.uid() AND m.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.clinic_members m
  WHERE m.clinic_id = clinics.id AND m.user_id = auth.uid() AND m.role = 'admin'));

CREATE POLICY patients_clinic_front_desk_register ON public.patients
FOR INSERT TO authenticated
WITH CHECK (
  auth_user_id IS NULL
  AND EXISTS (SELECT 1 FROM public.clinic_members m
    WHERE m.clinic_id = patients.clinic_id AND m.user_id = auth.uid()
      AND m.role IN ('admin', 'receptionist')));

DROP POLICY patients_self_or_clinic_staff_update ON public.patients;

CREATE POLICY patients_self_or_front_desk_update ON public.patients
FOR UPDATE TO authenticated
USING (
  auth_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.clinic_members m
    WHERE m.clinic_id = patients.clinic_id AND m.user_id = auth.uid()
      AND m.role IN ('admin', 'receptionist')))
WITH CHECK (
  auth_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.clinic_members m
    WHERE m.clinic_id = patients.clinic_id AND m.user_id = auth.uid()
      AND m.role IN ('admin', 'receptionist')));

CREATE OR REPLACE FUNCTION public.guard_patient_updates()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
DECLARE
  v_caller_id uuid;
  v_is_staff boolean;
BEGIN
  v_caller_id := auth.uid();

  SELECT EXISTS (
    SELECT 1 FROM public.clinic_members cm
    WHERE cm.clinic_id = OLD.clinic_id
      AND cm.user_id = v_caller_id
  ) INTO v_is_staff;

  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Cannot modify patient ID' USING ERRCODE = '42501';
  END IF;

  IF NEW.clinic_id IS DISTINCT FROM OLD.clinic_id THEN
    RAISE EXCEPTION 'Cannot modify clinic affiliation' USING ERRCODE = '42501';
  END IF;

  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Cannot modify record creation date' USING ERRCODE = '42501';
  END IF;

  IF v_is_staff THEN
    IF NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
      RAISE EXCEPTION 'Staff cannot modify linked patient account' USING ERRCODE = '42501';
    END IF;
    NEW.updated_at := pg_catalog.now();
    RETURN NEW;
  END IF;

  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Patients cannot modify email address' USING ERRCODE = '42501';
  END IF;

  IF NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
    IF NOT (
      OLD.auth_user_id IS NULL
      AND NEW.auth_user_id = v_caller_id
      AND pg_catalog.current_setting('carepulse.linking_in_progress', true) = 'true'
    ) THEN
      RAISE EXCEPTION 'auth_user_id can only be linked via secure verification' USING ERRCODE = '42501';
    END IF;
  END IF;

  NEW.updated_at := pg_catalog.now();
  RETURN NEW;
END;
$function$;