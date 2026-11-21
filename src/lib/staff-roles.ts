export const STAFF_ROLES = ["admin", "doctor", "receptionist"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export function isStaffRole(role: unknown): role is StaffRole {
  return typeof role === "string" && (STAFF_ROLES as readonly string[]).includes(role.trim().toLowerCase());
}
