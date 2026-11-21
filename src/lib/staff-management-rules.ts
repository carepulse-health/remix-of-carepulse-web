import { isStaffRole } from "@/lib/staff-roles";

export type StaffChange = { kind: "role"; newRole: string } | { kind: "remove" };

export const STAFF_RULE_MESSAGES = {
  self: "You can't change or remove your own access. Ask another admin to do it.",
  invalidRole: "Choose admin, doctor or receptionist.",
  sameRole: "This person already has that role.",
  lastAdmin: "A clinic must always keep at least one admin.",
} as const;

/**
 * Rules for changing an existing staff member's access, checked on the server before
 * any change is saved. Returns a reason when the change is not allowed, otherwise null.
 */
export function checkStaffChange(input: {
  actorUserId: string;
  target: { user_id: string; role: string };
  change: StaffChange;
  adminCount: number;
}): string | null {
  const { actorUserId, target, change, adminCount } = input;
  if (target.user_id === actorUserId) return STAFF_RULE_MESSAGES.self;
  const currentRole = target.role.trim().toLowerCase();
  if (change.kind === "role") {
    if (!isStaffRole(change.newRole)) return STAFF_RULE_MESSAGES.invalidRole;
    if (change.newRole.trim().toLowerCase() === currentRole) return STAFF_RULE_MESSAGES.sameRole;
  }
  const losesAdmin = currentRole === "admin" && (change.kind === "remove" || change.newRole.trim().toLowerCase() !== "admin");
  if (losesAdmin && adminCount <= 1) return STAFF_RULE_MESSAGES.lastAdmin;
  return null;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Lower-cases and trims an invite email; returns null when it isn't a usable address. */
export function normalizeInviteEmail(email: string): string | null {
  const value = email.trim().toLowerCase();
  return value.length <= 254 && EMAIL_PATTERN.test(value) ? value : null;
}
