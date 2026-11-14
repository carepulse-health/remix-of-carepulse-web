DROP POLICY IF EXISTS clinics_authenticated_read ON public.clinics;
CREATE POLICY clinics_patient_or_clinic_staff_read
ON public.clinics
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.clinic_members AS m
    WHERE m.clinic_id = clinics.id
      AND m.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.patients AS p
    WHERE p.clinic_id = clinics.id
      AND p.auth_user_id = auth.uid()
  )
);