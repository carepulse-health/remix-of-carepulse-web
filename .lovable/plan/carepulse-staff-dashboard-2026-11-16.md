# CarePulse staff dashboard

Build the signed-in clinic workspace at `/dashboard` while preserving the existing public sign-in page.

## Experience
- Keep the current professional CarePulse look and organize Overview, Appointments, Patients, Triage Queue, Doctors, Consultations, Notifications, and Settings into usable sections.
- Read clinic membership first, then load only the signed-in staff member's authorized clinics and records through Supabase RLS.
- Show real clinic records when accessible. Keep any demo content clearly marked and never mix it with real patient records.
- Provide staff sign-out and clear empty, loading, error, and no-membership states.

## Safe capabilities
- Enable only actions permitted by the existing RLS policies. Clearly mark patient registration, doctor/schedule editing, clinic settings, and staff-account administration as unavailable until the database grants the required access.
- Use existing tables only; do not change the schema or weaken RLS.

## Technical details
- Keep `/` public and `/dashboard` under the existing authenticated route layout.
- Use the existing browser Supabase client for user-scoped reads and writes, relying on RLS; never use the service-role client for ordinary clinic data.
- Validate membership before rendering clinic workspace data and scope queries by the authorized clinic ID.
- The connected database currently returns no clinic rows and no clinic memberships, so the no-membership state is expected until a staff account is assigned to a clinic.
