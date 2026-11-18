import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type ClinicMembership = { clinic_id: string; role: string };

export type ClinicRecord = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  opening_hours: Json;
};

export type PatientRecord = {
  id: string;
  clinic_id: string;
  full_name: string;
  date_of_birth: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
};

export type AppointmentRecord = {
  id: string;
  clinic_id: string;
  patient_id: string;
  doctor_id: string | null;
  appointment_date: string;
  appointment_time: string;
  reason: string | null;
  status: string | null;
};

export type DoctorRecord = {
  id: string;
  clinic_id: string;
  full_name: string;
  specialization: string | null;
  availability_status: string | null;
};

export type ScheduleRecord = {
  id: string;
  clinic_id: string;
  doctor_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  is_available: boolean | null;
};

export type TriageRecord = {
  id: string;
  clinic_id: string;
  patient_id: string;
  appointment_id: string | null;
  symptoms: string | null;
  ai_summary: string | null;
  priority_level: string;
  recommended_action: string | null;
  reviewed_by: string | null;
  review_status: string | null;
  created_at: string | null;
};

export type ConsultationRecord = {
  id: string;
  clinic_id: string;
  patient_id: string;
  doctor_id: string | null;
  appointment_id: string | null;
  consultation_notes: string | null;
  follow_up_date: string | null;
  created_at: string | null;
};

export type NotificationRecord = {
  id: string;
  clinic_id: string | null;
  user_id: string | null;
  patient_id: string | null;
  title: string;
  message: string;
  notification_type: string | null;
  is_read: boolean | null;
  created_at: string | null;
};

export type ClinicSettingsRecord = {
  clinic_id: string;
  settings: Json;
  updated_at: string | null;
};

export type ClinicWorkspace = {
  userId: string;
  email: string;
  memberships: ClinicMembership[];
  clinics: ClinicRecord[];
  patients: PatientRecord[];
  appointments: AppointmentRecord[];
  doctors: DoctorRecord[];
  schedules: ScheduleRecord[];
  triage: TriageRecord[];
  consultations: ConsultationRecord[];
  notifications: NotificationRecord[];
  settings: ClinicSettingsRecord[];
};

export function getMembershipClinicIds(memberships: ClinicMembership[]) {
  return [...new Set(memberships.map((membership) => membership.clinic_id))];
}

function failRead() {
  return new Error("Clinic records could not be loaded. Please try again or ask your clinic administrator to review your access.");
}

function readRows<T>(result: { data: T[] | null; error: unknown }): T[] {
  if (result.error) throw failRead();
  return result.data ?? [];
}

export async function readClinicWorkspace(userId: string): Promise<ClinicWorkspace> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || authData.user?.id !== userId) {
    throw new Error("Your sign-in has expired. Please sign in again.");
  }

  const membershipResult = await supabase
    .from("clinic_members")
    .select("clinic_id, role")
    .eq("user_id", userId);
  const memberships = readRows(membershipResult);
  const memberClinicIds = getMembershipClinicIds(memberships);

  if (memberClinicIds.length === 0) {
    return {
      userId,
      email: authData.user.email ?? "",
      memberships,
      clinics: [],
      patients: [],
      appointments: [],
      doctors: [],
      schedules: [],
      triage: [],
      consultations: [],
      notifications: [],
      settings: [],
    };
  }

  const clinicResult = await supabase
    .from("clinics")
    .select("id, name, address, phone, email, opening_hours")
    .in("id", memberClinicIds);
  const clinics = readRows(clinicResult);
  const authorizedClinicIds = memberClinicIds.filter((id) => clinics.some((clinic) => clinic.id === id));

  if (authorizedClinicIds.length === 0) {
    return {
      userId,
      email: authData.user.email ?? "",
      memberships,
      clinics: [],
      patients: [],
      appointments: [],
      doctors: [],
      schedules: [],
      triage: [],
      consultations: [],
      notifications: [],
      settings: [],
    };
  }

  const [patientsResult, appointmentsResult, doctorsResult, schedulesResult, triageResult, consultationsResult, notificationsResult, settingsResult] = await Promise.all([
    supabase.from("patients").select("id, clinic_id, full_name, date_of_birth, gender, phone, email, address, emergency_contact_name, emergency_contact_phone").in("clinic_id", authorizedClinicIds),
    supabase.from("appointments").select("id, clinic_id, patient_id, doctor_id, appointment_date, appointment_time, reason, status").in("clinic_id", authorizedClinicIds),
    supabase.from("doctors").select("id, clinic_id, full_name, specialization, availability_status").in("clinic_id", authorizedClinicIds),
    supabase.from("doctor_schedules").select("id, clinic_id, doctor_id, day_of_week, start_time, end_time, is_available").in("clinic_id", authorizedClinicIds),
    supabase.from("triage_records").select("id, clinic_id, patient_id, appointment_id, symptoms, ai_summary, priority_level, recommended_action, reviewed_by, review_status, created_at").in("clinic_id", authorizedClinicIds),
    supabase.from("consultation_logs").select("id, clinic_id, patient_id, doctor_id, appointment_id, consultation_notes, follow_up_date, created_at").in("clinic_id", authorizedClinicIds),
    supabase
      .from("notifications")
      .select("id, clinic_id, user_id, patient_id, title, message, notification_type, is_read, created_at")
      .or(`user_id.eq.${userId},clinic_id.in.(${authorizedClinicIds.join(",")})`),
    supabase.from("clinic_settings").select("clinic_id, settings, updated_at").in("clinic_id", authorizedClinicIds),
  ]);

  return {
    userId,
    email: authData.user.email ?? "",
    memberships,
    clinics,
    patients: readRows(patientsResult),
    appointments: readRows(appointmentsResult),
    doctors: readRows(doctorsResult),
    schedules: readRows(schedulesResult),
    triage: readRows(triageResult),
    consultations: readRows(consultationsResult),
    notifications: readRows(notificationsResult),
    settings: readRows(settingsResult),
  };
}

export function clinicWorkspaceQueryOptions(userId: string) {
  return queryOptions({
    queryKey: ["carepulse", "staff-workspace", userId],
    queryFn: () => readClinicWorkspace(userId),
  });
}

export async function createClinicAppointment(input: {
  clinicId: string;
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  reason: string;
}) {
  const { error } = await supabase.from("appointments").insert({
    clinic_id: input.clinicId,
    patient_id: input.patientId,
    doctor_id: input.doctorId,
    appointment_date: input.date,
    appointment_time: input.time,
    reason: input.reason,
    status: "pending",
  });
  if (error) throw new Error("This appointment could not be saved. Check clinic access and try again.");
}

export async function changeClinicAppointmentStatus(input: {
  clinicId: string;
  appointmentId: string;
  status: string;
}) {
  const { data, error } = await supabase
    .from("appointments")
    .update({ status: input.status, updated_at: new Date().toISOString() })
    .eq("id", input.appointmentId)
    .eq("clinic_id", input.clinicId)
    .select("id")
    .maybeSingle();
  if (error || !data) throw new Error("This appointment could not be updated. Check clinic access and try again.");
}

export async function reviewClinicTriage(input: {
  clinicId: string;
  triageId: string;
  userId: string;
}) {
  const { data, error } = await supabase
    .from("triage_records")
    .update({ review_status: "reviewed", reviewed_by: input.userId })
    .eq("id", input.triageId)
    .eq("clinic_id", input.clinicId)
    .select("id")
    .maybeSingle();
  if (error || !data) throw new Error("This screening could not be marked reviewed. Check clinic access and try again.");
}

export async function addClinicConsultation(input: {
  clinicId: string;
  patientId: string;
  doctorId: string | null;
  appointmentId: string | null;
  notes: string;
  followUpDate: string | null;
}) {
  const { error } = await supabase.from("consultation_logs").insert({
    clinic_id: input.clinicId,
    patient_id: input.patientId,
    doctor_id: input.doctorId,
    appointment_id: input.appointmentId,
    consultation_notes: input.notes,
    follow_up_date: input.followUpDate,
  });
  if (error) throw new Error("This consultation could not be saved. Check clinic access and try again.");
}

export async function markClinicNotificationRead(input: {
  clinicId: string;
  notificationId: string;
  userId: string;
}) {
  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", input.notificationId)
    .or(`user_id.eq.${input.userId},clinic_id.eq.${input.clinicId}`)
    .select("id")
    .maybeSingle();
  if (error || !data) throw new Error("This alert could not be marked read. Check clinic access and try again.");
}

const denied = (what: string) => new Error(`${what} could not be saved. Your role may not allow this change, or the details are invalid.`);

export type DoctorInput = { fullName: string; specialization: string | null; availabilityStatus: string | null };

export async function createClinicDoctor(clinicId: string, input: DoctorInput) {
  const { error } = await supabase.from("doctors").insert({
    clinic_id: clinicId,
    full_name: input.fullName,
    specialization: input.specialization,
    availability_status: input.availabilityStatus,
  });
  if (error) throw denied("This doctor");
}

export async function updateClinicDoctor(clinicId: string, doctorId: string, input: DoctorInput) {
  const { data, error } = await supabase
    .from("doctors")
    .update({ full_name: input.fullName, specialization: input.specialization, availability_status: input.availabilityStatus })
    .eq("id", doctorId)
    .eq("clinic_id", clinicId)
    .select("id");
  if (error || !data?.length) throw denied("This doctor");
}

export type ScheduleInput = { dayOfWeek: string; startTime: string; endTime: string; isAvailable: boolean };

export async function createDoctorSchedule(clinicId: string, doctorId: string, input: ScheduleInput) {
  const { error } = await supabase.from("doctor_schedules").insert({
    clinic_id: clinicId,
    doctor_id: doctorId,
    day_of_week: input.dayOfWeek,
    start_time: input.startTime,
    end_time: input.endTime,
    is_available: input.isAvailable,
  });
  if (error) throw denied("This schedule");
}

export async function updateDoctorSchedule(clinicId: string, scheduleId: string, input: ScheduleInput) {
  const { data, error } = await supabase
    .from("doctor_schedules")
    .update({ day_of_week: input.dayOfWeek, start_time: input.startTime, end_time: input.endTime, is_available: input.isAvailable })
    .eq("id", scheduleId)
    .eq("clinic_id", clinicId)
    .select("id");
  if (error || !data?.length) throw denied("This schedule");
}

export type ClinicDetailsInput = { name: string; address: string | null; phone: string | null; email: string | null };

export async function updateClinicDetails(clinicId: string, input: ClinicDetailsInput) {
  const { data, error } = await supabase
    .from("clinics")
    .update({ name: input.name, address: input.address, phone: input.phone, email: input.email })
    .eq("id", clinicId)
    .select("id");
  if (error || !data?.length) throw denied("Clinic details");
}

export type PatientInput = {
  fullName: string;
  dateOfBirth: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
};

function patientColumns(input: PatientInput) {
  return {
    full_name: input.fullName,
    date_of_birth: input.dateOfBirth,
    gender: input.gender,
    phone: input.phone,
    email: input.email,
    address: input.address,
    emergency_contact_name: input.emergencyContactName,
    emergency_contact_phone: input.emergencyContactPhone,
  };
}

// Never sends clinic or linked-login fields on edit; the database blocks staff from changing them.
export async function registerClinicPatient(clinicId: string, input: PatientInput) {
  const { error } = await supabase.from("patients").insert({ clinic_id: clinicId, ...patientColumns(input) });
  if (error) throw denied("This patient");
}

export async function updateClinicPatient(clinicId: string, patientId: string, input: PatientInput) {
  const { data, error } = await supabase
    .from("patients")
    .update(patientColumns(input))
    .eq("id", patientId)
    .eq("clinic_id", clinicId)
    .select("id");
  if (error || !data?.length) throw denied("This patient");
}