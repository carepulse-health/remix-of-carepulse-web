import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkStaffChange, normalizeInviteEmail } from "@/lib/staff-management-rules";
import { STAFF_ROLES } from "@/lib/staff-roles";

export type StaffMember = {
  id: string;
  userId: string;
  role: string;
  email: string;
  addedAt: string | null;
  lastSignInAt: string | null;
};

export const STAFF_MANAGEMENT_OFF_MESSAGE =
  "Staff management isn't switched on for this clinic's database yet. Staff can still be added in Supabase.";

type AuthedSupabase = {
  from: (table: "clinic_members") => {
    select: (columns: "role") => {
      eq: (column: "clinic_id", value: string) => {
        eq: (column: "user_id", value: string) => {
          maybeSingle: () => PromiseLike<{ data: { role: string } | null; error: unknown }>;
        };
      };
    };
  };
};

/** The caller must be an admin of this clinic. Reads only their own membership, under RLS. */
async function assertClinicAdmin(supabase: AuthedSupabase, userId: string, clinicId: string) {
  const { data, error } = await supabase
    .from("clinic_members")
    .select("role")
    .eq("clinic_id", clinicId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || data?.role.trim().toLowerCase() !== "admin") {
    throw new Error("Only admins of this clinic can manage staff.");
  }
}

function friendlyDbError(error: { code?: string; message?: string } | null, fallback: string): Error {
  if (error?.code === "42501") return new Error(STAFF_MANAGEMENT_OFF_MESSAGE);
  if (error?.code === "23505") return new Error("This person is already on this clinic's staff.");
  return new Error(fallback);
}

async function loadAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const clinicInput = z.object({ clinicId: z.string().uuid() });

export const listClinicStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => clinicInput.parse(input))
  .handler(async ({ data, context }): Promise<StaffMember[]> => {
    await assertClinicAdmin(context.supabase as unknown as AuthedSupabase, context.userId, data.clinicId);
    const admin = await loadAdmin();
    const { data: rows, error } = await admin
      .from("clinic_members")
      .select("id, user_id, role, created_at")
      .eq("clinic_id", data.clinicId)
      .order("created_at", { ascending: true });
    if (error) throw friendlyDbError(error, "The staff list could not be loaded.");

    return Promise.all((rows ?? []).map(async (row) => {
      const { data: account } = await admin.auth.admin.getUserById(row.user_id);
      return {
        id: row.id,
        userId: row.user_id,
        role: row.role,
        email: account.user?.email ?? "Unknown account",
        addedAt: row.created_at,
        lastSignInAt: account.user?.last_sign_in_at ?? null,
      };
    }));
  });

const inviteInput = z.object({
  clinicId: z.string().uuid(),
  email: z.string().max(254),
  role: z.enum(STAFF_ROLES),
});

export const inviteStaffMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inviteInput.parse(input))
  .handler(async ({ data, context }): Promise<{ status: "invited" | "added" }> => {
    await assertClinicAdmin(context.supabase as unknown as AuthedSupabase, context.userId, data.clinicId);
    const email = normalizeInviteEmail(data.email);
    if (!email) throw new Error("Enter a valid email address.");
    const admin = await loadAdmin();

    // Check the staff list is writable before sending any email.
    const { error: accessError } = await admin.from("clinic_members").select("id").eq("clinic_id", data.clinicId).limit(1);
    if (accessError) throw friendlyDbError(accessError, "The staff list could not be checked.");

    // Look for an existing login with this email.
    let existingUserId: string | null = null;
    for (let page = 1; page <= 50 && !existingUserId; page += 1) {
      const { data: list, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error("Existing accounts could not be checked. Please try again.");
      existingUserId = list.users.find((user) => user.email?.toLowerCase() === email)?.id ?? null;
      if (list.users.length < 200) break;
    }

    if (existingUserId) {
      // Keep patient logins out of the staff workspace: patients use the mobile app.
      const { data: linkedPatients } = await context.supabase
        .from("patients")
        .select("id")
        .eq("auth_user_id", existingUserId)
        .limit(1);
      if ((linkedPatients ?? []).length > 0) {
        throw new Error("This email belongs to a patient account. Use a separate work email for staff access.");
      }
      const { error } = await admin
        .from("clinic_members")
        .insert({ clinic_id: data.clinicId, user_id: existingUserId, role: data.role });
      if (error) throw friendlyDbError(error, "This person could not be added.");
      return { status: "added" };
    }

    const { getRequest } = await import("@tanstack/react-start/server");
    const origin = new URL(getRequest().url).origin;
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${origin}/reset-password`,
    });
    if (inviteError || !invited.user) throw new Error("The invitation email could not be sent. Please try again.");

    const { error } = await admin
      .from("clinic_members")
      .insert({ clinic_id: data.clinicId, user_id: invited.user.id, role: data.role });
    if (error) {
      // Don't leave an invited login with no clinic access behind.
      await admin.auth.admin.deleteUser(invited.user.id);
      throw friendlyDbError(error, "This person could not be added.");
    }
    return { status: "invited" };
  });

async function loadTargetAndAdminCount(clinicId: string, memberId: string) {
  const admin = await loadAdmin();
  const { data: members, error } = await admin
    .from("clinic_members")
    .select("id, user_id, role")
    .eq("clinic_id", clinicId);
  if (error) throw friendlyDbError(error, "The staff list could not be loaded.");
  const target = (members ?? []).find((member) => member.id === memberId);
  if (!target) throw new Error("This staff member is no longer part of the clinic.");
  const adminCount = (members ?? []).filter((member) => member.role.trim().toLowerCase() === "admin").length;
  return { admin, target, adminCount };
}

export const changeStaffRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ clinicId: z.string().uuid(), memberId: z.string().uuid(), role: z.enum(STAFF_ROLES) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertClinicAdmin(context.supabase as unknown as AuthedSupabase, context.userId, data.clinicId);
    const { admin, target, adminCount } = await loadTargetAndAdminCount(data.clinicId, data.memberId);
    const blocked = checkStaffChange({ actorUserId: context.userId, target, change: { kind: "role", newRole: data.role }, adminCount });
    if (blocked) throw new Error(blocked);
    const { error } = await admin
      .from("clinic_members")
      .update({ role: data.role })
      .eq("id", data.memberId)
      .eq("clinic_id", data.clinicId);
    if (error) throw friendlyDbError(error, "The role could not be changed.");
    return { ok: true };
  });

export const removeStaffMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ clinicId: z.string().uuid(), memberId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertClinicAdmin(context.supabase as unknown as AuthedSupabase, context.userId, data.clinicId);
    const { admin, target, adminCount } = await loadTargetAndAdminCount(data.clinicId, data.memberId);
    const blocked = checkStaffChange({ actorUserId: context.userId, target, change: { kind: "remove" }, adminCount });
    if (blocked) throw new Error(blocked);
    // Removes clinic access only; the person's login itself is left untouched.
    const { error } = await admin
      .from("clinic_members")
      .delete()
      .eq("id", data.memberId)
      .eq("clinic_id", data.clinicId);
    if (error) throw friendlyDbError(error, "Access could not be removed.");
    return { ok: true };
  });
