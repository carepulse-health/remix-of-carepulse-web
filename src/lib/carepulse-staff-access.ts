import { supabase } from "@/integrations/supabase/client";
import type { ClinicMembership } from "@/lib/carepulse-staff-data";

export const STAFF_ROLES = ["admin", "doctor", "receptionist"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export type WorkspaceSection =
  | "Overview" | "Appointments" | "Patients" | "Triage Queue" | "Doctors"
  | "Consultations" | "Notifications" | "Settings" | "Staff";

export const SECTION_SLUGS: Record<WorkspaceSection, string> = {
  Overview: "overview",
  Appointments: "appointments",
  Patients: "patients",
  "Triage Queue": "triage",
  Doctors: "doctors",
  Consultations: "consultations",
  Notifications: "notifications",
  Settings: "settings",
  Staff: "staff",
};

export function sectionFromSlug(slug: unknown): WorkspaceSection | undefined {
  const entry = Object.entries(SECTION_SLUGS).find(([, value]) => value === slug);
  return entry?.[0] as WorkspaceSection | undefined;
}

export function isStaffRole(role: unknown): role is StaffRole {
  return typeof role === "string" && (STAFF_ROLES as readonly string[]).includes(role.trim().toLowerCase());
}

/** Only admin, doctor and receptionist memberships open the staff workspace. */
export function staffMembershipsOnly(memberships: ClinicMembership[]): ClinicMembership[] {
  return memberships
    .filter((membership) => isStaffRole(membership.role))
    .map((membership) => ({ ...membership, role: membership.role.trim().toLowerCase() }));
}

const ROLE_SECTIONS: Record<StaffRole, WorkspaceSection[]> = {
  admin: ["Overview", "Appointments", "Patients", "Triage Queue", "Doctors", "Consultations", "Notifications", "Settings", "Staff"],
  doctor: ["Overview", "Triage Queue", "Consultations", "Patients", "Appointments", "Doctors", "Notifications", "Settings"],
  receptionist: ["Overview", "Appointments", "Patients", "Doctors", "Notifications", "Settings"],
};

const ROLE_LANDING: Record<StaffRole, WorkspaceSection> = {
  admin: "Overview",
  doctor: "Triage Queue",
  receptionist: "Appointments",
};

export function sectionsForRole(role: string | null): WorkspaceSection[] {
  return isStaffRole(role) ? ROLE_SECTIONS[role] : [];
}

export function landingSectionForRole(role: string | null): WorkspaceSection {
  return isStaffRole(role) ? ROLE_LANDING[role] : "Overview";
}

/** Highest-privilege staff role across the account's clinics, used to pick the first page after sign-in. */
export function primaryStaffRole(memberships: ClinicMembership[]): StaffRole | null {
  const roles = staffMembershipsOnly(memberships).map((membership) => membership.role);
  return STAFF_ROLES.find((role) => roles.includes(role)) ?? null;
}

export type StaffAccessResult =
  | { status: "granted"; memberships: ClinicMembership[] }
  | { status: "denied" }
  | { status: "unverified" };

/** Reads the signed-in user's own clinic memberships (RLS: self-read only). */
export async function checkStaffAccess(userId: string): Promise<StaffAccessResult> {
  const { data, error } = await supabase.from("clinic_members").select("clinic_id, role").eq("user_id", userId);
  if (error) return { status: "unverified" };
  const memberships = staffMembershipsOnly(data ?? []);
  return memberships.length > 0 ? { status: "granted", memberships } : { status: "denied" };
}
