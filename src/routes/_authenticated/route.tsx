// Pathless layout route that gates every child under `src/routes/_authenticated/`
// behind a signed-in Supabase user who is also an admin, doctor or receptionist
// of at least one clinic. The subtree is client-rendered (`ssr: false`) because
// Supabase stores the session in `localStorage`, which the server cannot read.
//
// The membership check here decides who may open the staff workspace; the
// database's own access rules still decide what each person can read or change.
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { supabase } from '@/integrations/supabase/client'
import { checkStaffAccess } from '@/lib/carepulse-staff-access'

export const Route = createFileRoute('/_authenticated')({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) {
      throw redirect({ to: '/staff-login' })
    }
    const access = await checkStaffAccess(data.user.id)
    if (access.status === 'unverified') {
      throw new Error('We could not confirm your clinic access right now. Please refresh, or sign in again.')
    }
    if (access.status === 'denied') {
      // Patients and accounts without a staff role never see the workspace.
      await supabase.auth.signOut()
      throw redirect({ to: '/staff-login', search: { access: 'denied' } })
    }
    return { user: data.user, memberships: access.memberships }
  },
  component: () => <Outlet />,
})
