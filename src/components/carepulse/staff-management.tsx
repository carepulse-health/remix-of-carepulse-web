import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  changeStaffRole, inviteStaffMember, listClinicStaff, removeStaffMember,
} from "@/lib/staff-management.functions";
import { STAFF_ROLES, type StaffRole } from "@/lib/staff-roles";

function errorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function StaffManagement({ clinicId, currentUserId }: { clinicId: string; currentUserId: string }) {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listClinicStaff);
  const inviteFn = useServerFn(inviteStaffMember);
  const roleFn = useServerFn(changeStaffRole);
  const removeFn = useServerFn(removeStaffMember);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("receptionist");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const queryKey = ["carepulse", "clinic-staff", clinicId];

  const staff = useQuery({ queryKey, queryFn: () => listFn({ data: { clinicId } }), retry: false });
  const refresh = () => queryClient.invalidateQueries({ queryKey });

  const invite = useMutation({
    mutationFn: () => inviteFn({ data: { clinicId, email, role } }),
    onSuccess: async (result) => {
      setError(""); setEmail("");
      setMessage(result.status === "invited" ? "Invitation sent. They'll set a password from the email." : "Existing account added to this clinic.");
      await refresh();
    },
    onError: (e) => { setMessage(""); setError(errorText(e, "The invitation could not be sent.")); },
  });
  const changeRole = useMutation({
    mutationFn: (input: { memberId: string; role: StaffRole }) => roleFn({ data: { clinicId, ...input } }),
    onSuccess: async () => { setError(""); setMessage("Role updated."); await refresh(); },
    onError: (e) => { setMessage(""); setError(errorText(e, "The role could not be changed.")); },
  });
  const remove = useMutation({
    mutationFn: (memberId: string) => removeFn({ data: { clinicId, memberId } }),
    onSuccess: async () => { setError(""); setMessage("Access removed."); await refresh(); },
    onError: (e) => { setMessage(""); setError(errorText(e, "Access could not be removed.")); },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    invite.mutate();
  }

  const busy = invite.isPending || changeRole.isPending || remove.isPending;

  return (
    <div className="space-y-4">
      {error && <div role="alert" className="border-l-4 border-l-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
      {message && <div role="status" className="border-l-4 border-l-status-positive bg-status-positive/10 px-4 py-3 text-sm text-status-positive">{message}</div>}
      <form onSubmit={submit} className="flex flex-col gap-3 border border-border bg-card p-5 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <label htmlFor="invite-email" className="text-xs font-medium">Staff email</label>
          <Input id="invite-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@yourclinic.com" />
        </div>
        <div className="space-y-1.5 sm:w-44">
          <span className="text-xs font-medium">Role</span>
          <Select value={role} onValueChange={(value) => setRole(value as StaffRole)}>
            <SelectTrigger aria-label="Role"><SelectValue /></SelectTrigger>
            <SelectContent>{STAFF_ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={busy} className="gap-2"><UserPlus className="size-4" />{invite.isPending ? "Sending…" : "Invite"}</Button>
      </form>
      <article className="overflow-hidden border border-border bg-card">
        <div className="border-b border-border px-5 py-4"><h2 className="text-sm font-bold">Clinic staff</h2><p className="mt-1 text-xs text-muted-foreground">You can't change or remove your own access, and the clinic always keeps at least one admin.</p></div>
        {staff.isPending && <p className="px-5 py-8 text-center text-sm text-muted-foreground">Loading staff…</p>}
        {staff.isError && <p className="px-5 py-8 text-center text-sm text-muted-foreground">{errorText(staff.error, "The staff list could not be loaded.")}</p>}
        {staff.data && <div className="divide-y divide-border">{staff.data.map((member) => {
          const isSelf = member.userId === currentUserId;
          return <div key={member.id} className="flex flex-col gap-3 px-5 py-3 text-sm sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1"><p className="truncate font-medium">{member.email}{isSelf && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}</p><p className="text-xs text-muted-foreground">{member.lastSignInAt ? "Active" : "Invitation pending"}</p></div>
            {isSelf ? <span className="text-xs font-medium capitalize">{member.role}</span> : <>
              <Select value={member.role} disabled={busy} onValueChange={(value) => changeRole.mutate({ memberId: member.id, role: value as StaffRole })}>
                <SelectTrigger className="sm:w-40" aria-label={`Role for ${member.email}`}><SelectValue /></SelectTrigger>
                <SelectContent>{STAFF_ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}</SelectContent>
              </Select>
              <Button variant="outline" size="sm" disabled={busy} onClick={() => { if (window.confirm(`Remove clinic access for ${member.email}?`)) remove.mutate(member.id); }}>Remove</Button>
            </>}
          </div>;
        })}</div>}
      </article>
    </div>
  );
}
