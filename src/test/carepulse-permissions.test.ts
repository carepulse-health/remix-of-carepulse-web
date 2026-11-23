import { describe, expect, it } from "vitest";
import { getStaffPermissions } from "@/lib/carepulse-permissions";

const clinic = "clinic-a";

describe("Staff permissions", () => {
  it("lets admins manage doctors, schedules and clinic details", () => {
    const p = getStaffPermissions([{ clinic_id: clinic, role: "admin" }], clinic);
    expect(p.canManageDoctors).toBe(true);
    expect(p.canManageSchedules).toBe(true);
    expect(p.canEditClinic).toBe(true);
  });

  it("lets admins and receptionists register and edit patients", () => {
    expect(getStaffPermissions([{ clinic_id: clinic, role: "admin" }], clinic).canManagePatients).toBe(true);
    expect(getStaffPermissions([{ clinic_id: clinic, role: "receptionist" }], clinic).canManagePatients).toBe(true);
  });

  it("lets receptionists manage doctors and schedules but not clinic details", () => {
    const p = getStaffPermissions([{ clinic_id: clinic, role: "receptionist" }], clinic);
    expect(p.canManageDoctors).toBe(true);
    expect(p.canManageSchedules).toBe(true);
    expect(p.canEditClinic).toBe(false);
  });

  it("gives doctors view-only access to patients", () => {
    const p = getStaffPermissions([{ clinic_id: clinic, role: "doctor" }], clinic);
    expect(p.canManagePatients).toBe(false);
    expect(p.canManageDoctors).toBe(false);
    expect(p.canManageSchedules).toBe(false);
  });

  it("ignores an admin role held in a different clinic", () => {
    const p = getStaffPermissions([{ clinic_id: "clinic-b", role: "admin" }, { clinic_id: clinic, role: "doctor" }], clinic);
    expect(p.canEditClinic).toBe(false);
    expect(p.canManagePatients).toBe(false);
  });
});