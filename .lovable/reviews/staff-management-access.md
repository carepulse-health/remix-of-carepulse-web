# One database change needed for Staff Management

Right now **nothing** — not even the app's trusted server — is allowed to add, change or remove entries in the clinic staff list. That's why staff can only be added by hand in the Supabase dashboard today.

To let admins invite staff, change roles and remove access from the workspace, the trusted server needs permission to manage that list. Signed-in users (including patients) get **no** new permissions, and no security rules, triggers or functions change.

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_members TO service_role;
```

How it stays safe:
- Only the app's server uses this permission. Its key is never sent to browsers.
- Before every staff change, the server checks that the person asking is an **admin of that same clinic**.
- Admins can't change or remove their own access, and a clinic can never be left without an admin.
- The only roles that can be given are admin, doctor and receptionist.
