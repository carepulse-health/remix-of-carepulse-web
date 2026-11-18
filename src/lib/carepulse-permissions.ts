import type { ClinicMembership } from "@/lib/carepulse-staff-data";

export type StaffPermissions = {
  role: string | null;
  canManageDoctors: boolean;
  canManageSchedules: boolean;
  canEditClinic: boolean;
  canManagePatients: boolean;
};

// Mirrors the clinic database access rules; the database still enforces them.
export function getStaffPermissions(memberships: ClinicMembership[], clinicId: string): StaffPermissions {
  const roles = memberships
    .filter((membership) => membership.clinic_id === clinicId)
    .map((membership) => membership.role.trim().toLowerCase());
  const isAdmin = roles.includes("admin");
  const isReceptionist = roles.includes("receptionist");
  return {
    role: isAdmin ? "admin" : roles[0] ?? null,
    canManageDoctors: isAdmin,
    canManageSchedules: isAdmin,
    canEditClinic: isAdmin,
    canManagePatients: isAdmin || isReceptionist,
  };
}