# CarePulse staff access

## Build
- Add a public email/password sign-in page for existing staff accounts; do not offer open registration.
- Move the clinic workspace behind a signed-in, clinic-membership check, with a sign-out path.
- Keep all dashboard and workflow records clearly sample-only. The current database rules do not provide a verified, role-specific workflow for clinic staff writes, so do not read or write real patient records yet.
- Make no database/schema changes.

## Technical details
- Use the existing Supabase browser client and RLS-protected `clinic_members` membership lookup.
- Add a named protected dashboard route and route-specific metadata; keep `/` as a public entry to sign-in.
- Record the route/access boundary in `AGENTS.md` and validate the public sign-in view plus route/test/build signals.
