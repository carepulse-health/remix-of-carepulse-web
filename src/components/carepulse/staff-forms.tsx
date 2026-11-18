import type { FormEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type {
  ClinicDetailsInput, ClinicRecord, DoctorInput, DoctorRecord, PatientInput, PatientRecord,
  ScheduleInput, ScheduleRecord,
} from "@/lib/carepulse-staff-data";

const optional = (max: number) => z.string().trim().max(max).transform((value) => value || null);
const optionalEmail = z.string().trim().max(255).refine((value) => !value || z.string().email().safeParse(value).success, "Enter a valid email address.").transform((value) => value || null);

const doctorSchema = z.object({
  fullName: z.string().trim().min(1, "Enter the doctor's name.").max(120),
  specialization: optional(120),
  availabilityStatus: optional(40),
});

export const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const scheduleSchema = z.object({
  dayOfWeek: z.enum(WEEK_DAYS as [string, ...string[]], { message: "Choose a day." }),
  startTime: z.string().regex(/^\d{2}:\d{2}/, "Enter a start time."),
  endTime: z.string().regex(/^\d{2}:\d{2}/, "Enter an end time."),
  isAvailable: z.boolean(),
}).refine((value) => value.endTime > value.startTime, { message: "End time must be after start time." });

const clinicSchema = z.object({
  name: z.string().trim().min(1, "Enter the clinic name.").max(160),
  address: optional(300),
  phone: optional(40),
  email: optionalEmail,
});

const patientSchema = z.object({
  fullName: z.string().trim().min(1, "Enter the patient's name.").max(120),
  dateOfBirth: z.string().trim().refine((value) => !value || (/^\d{4}-\d{2}-\d{2}$/.test(value) && value <= new Date().toISOString().slice(0, 10)), "Date of birth can't be in the future.").transform((value) => value || null),
  gender: optional(40),
  phone: optional(40),
  email: optionalEmail,
  address: optional(300),
  emergencyContactName: optional(120),
  emergencyContactPhone: optional(40),
});

type Result<T> = { ok: true; value: T } | { ok: false; message: string };

function parse<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, raw: unknown): Result<T> {
  const result = schema.safeParse(raw);
  return result.success ? { ok: true, value: result.data } : { ok: false, message: result.error.issues[0]?.message ?? "Check the form and try again." };
}

const text = (form: FormData, key: string) => String(form.get(key) ?? "");

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5 text-xs font-medium">{label}{children}</label>;
}

function FormError({ message }: { message: string }) {
  return message ? <p role="alert" className="text-xs text-destructive">{message}</p> : null;
}

type BaseProps = { open: boolean; onOpenChange: (open: boolean) => void; busy: boolean; error: string; onError: (message: string) => void };

function submitWith<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, read: (form: FormData) => unknown, onSave: (value: T) => void, onError: (message: string) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = parse(schema, read(new FormData(event.currentTarget)));
    if (result.ok) onSave(result.value);
    else onError(result.message);
  };
}

function Footer({ onCancel, busy, label }: { onCancel: () => void; busy: boolean; label: string }) {
  return <DialogFooter><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Saving…" : label}</Button></DialogFooter>;
}

export function DoctorDialog({ open, onOpenChange, busy, error, onError, doctor, onSave }: BaseProps & { doctor: DoctorRecord | null; onSave: (input: DoctorInput) => void }) {
  const onSubmit = submitWith(doctorSchema, (form) => ({ fullName: text(form, "fullName"), specialization: text(form, "specialization"), availabilityStatus: text(form, "availabilityStatus") }), onSave, onError);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[480px]"><DialogHeader><DialogTitle>{doctor ? "Edit doctor" : "Add doctor"}</DialogTitle><DialogDescription>Doctor profile for this clinic.</DialogDescription></DialogHeader>
    <form key={doctor?.id ?? "new"} className="space-y-4" onSubmit={onSubmit} noValidate>
      <FieldLabel label="Full name"><Input name="fullName" defaultValue={doctor?.full_name ?? ""} maxLength={120} required /></FieldLabel>
      <FieldLabel label="Specialty"><Input name="specialization" defaultValue={doctor?.specialization ?? ""} maxLength={120} placeholder="e.g. General practice" /></FieldLabel>
      <FieldLabel label="Availability"><Select name="availabilityStatus" defaultValue={doctor?.availability_status ?? "available"}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="available">Available</SelectItem><SelectItem value="busy">Busy</SelectItem><SelectItem value="on_leave">On leave</SelectItem><SelectItem value="unavailable">Unavailable</SelectItem>{doctor?.availability_status && !["available", "busy", "on_leave", "unavailable"].includes(doctor.availability_status) && <SelectItem value={doctor.availability_status}>{doctor.availability_status}</SelectItem>}</SelectContent></Select></FieldLabel>
      <FormError message={error} />
      <Footer onCancel={() => onOpenChange(false)} busy={busy} label={doctor ? "Save changes" : "Add doctor"} />
    </form></DialogContent></Dialog>;
}

export function ScheduleDialog({ open, onOpenChange, busy, error, onError, doctor, schedule, onSave }: BaseProps & { doctor: DoctorRecord | null; schedule: ScheduleRecord | null; onSave: (input: ScheduleInput) => void }) {
  const onSubmit = submitWith(scheduleSchema, (form) => ({ dayOfWeek: text(form, "dayOfWeek"), startTime: text(form, "startTime"), endTime: text(form, "endTime"), isAvailable: text(form, "isAvailable") !== "no" }), onSave, onError);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[460px]"><DialogHeader><DialogTitle>{schedule ? "Edit schedule slot" : "Add schedule slot"}</DialogTitle><DialogDescription>{doctor ? `Weekly hours for ${doctor.full_name}.` : "Weekly hours."}</DialogDescription></DialogHeader>
    <form key={schedule?.id ?? `new-${doctor?.id ?? ""}`} className="space-y-4" onSubmit={onSubmit} noValidate>
      <FieldLabel label="Day"><Select name="dayOfWeek" defaultValue={schedule?.day_of_week ?? "Monday"}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{WEEK_DAYS.map((day) => <SelectItem key={day} value={day}>{day}</SelectItem>)}</SelectContent></Select></FieldLabel>
      <div className="grid grid-cols-2 gap-3"><FieldLabel label="Start"><Input type="time" name="startTime" defaultValue={schedule?.start_time.slice(0, 5) ?? "09:00"} required /></FieldLabel><FieldLabel label="End"><Input type="time" name="endTime" defaultValue={schedule?.end_time.slice(0, 5) ?? "17:00"} required /></FieldLabel></div>
      <FieldLabel label="Status"><Select name="isAvailable" defaultValue={schedule?.is_available === false ? "no" : "yes"}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="yes">Available</SelectItem><SelectItem value="no">Unavailable</SelectItem></SelectContent></Select></FieldLabel>
      <FormError message={error} />
      <Footer onCancel={() => onOpenChange(false)} busy={busy} label={schedule ? "Save changes" : "Add slot"} />
    </form></DialogContent></Dialog>;
}

export function ClinicDialog({ open, onOpenChange, busy, error, onError, clinic, onSave }: BaseProps & { clinic: ClinicRecord; onSave: (input: ClinicDetailsInput) => void }) {
  const onSubmit = submitWith(clinicSchema, (form) => ({ name: text(form, "name"), address: text(form, "address"), phone: text(form, "phone"), email: text(form, "email") }), onSave, onError);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]"><DialogHeader><DialogTitle>Edit clinic details</DialogTitle><DialogDescription>Shown to staff and patients of this clinic.</DialogDescription></DialogHeader>
    <form key={clinic.id} className="space-y-4" onSubmit={onSubmit} noValidate>
      <FieldLabel label="Clinic name"><Input name="name" defaultValue={clinic.name} maxLength={160} required /></FieldLabel>
      <FieldLabel label="Address"><Input name="address" defaultValue={clinic.address ?? ""} maxLength={300} /></FieldLabel>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><FieldLabel label="Phone"><Input name="phone" type="tel" defaultValue={clinic.phone ?? ""} maxLength={40} /></FieldLabel><FieldLabel label="Email"><Input name="email" type="email" defaultValue={clinic.email ?? ""} maxLength={255} /></FieldLabel></div>
      <FormError message={error} />
      <Footer onCancel={() => onOpenChange(false)} busy={busy} label="Save details" />
    </form></DialogContent></Dialog>;
}

export function PatientDialog({ open, onOpenChange, busy, error, onError, patient, onSave }: BaseProps & { patient: PatientRecord | null; onSave: (input: PatientInput) => void }) {
  const onSubmit = submitWith(patientSchema, (form) => ({
    fullName: text(form, "fullName"), dateOfBirth: text(form, "dateOfBirth"), gender: text(form, "gender") === "none" ? "" : text(form, "gender"),
    phone: text(form, "phone"), email: text(form, "email"), address: text(form, "address"),
    emergencyContactName: text(form, "emergencyContactName"), emergencyContactPhone: text(form, "emergencyContactPhone"),
  }), onSave, onError);
  const genders = ["Female", "Male", "Other"];
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]"><DialogHeader><DialogTitle>{patient ? "Edit patient" : "Register patient"}</DialogTitle><DialogDescription>{patient ? "Update registration details. Clinic and linked account can't be changed here." : "Registers the patient with this clinic. The patient can link their own account later."}</DialogDescription></DialogHeader>
    <form key={patient?.id ?? "new"} className="space-y-4" onSubmit={onSubmit} noValidate>
      <FieldLabel label="Full name"><Input name="fullName" defaultValue={patient?.full_name ?? ""} maxLength={120} required /></FieldLabel>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FieldLabel label="Date of birth"><Input type="date" name="dateOfBirth" defaultValue={patient?.date_of_birth ?? ""} /></FieldLabel>
        <FieldLabel label="Gender"><Select name="gender" defaultValue={patient?.gender || "none"}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Not specified</SelectItem>{genders.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}{patient?.gender && !genders.includes(patient.gender) && <SelectItem value={patient.gender}>{patient.gender}</SelectItem>}</SelectContent></Select></FieldLabel>
        <FieldLabel label="Phone"><Input name="phone" type="tel" defaultValue={patient?.phone ?? ""} maxLength={40} /></FieldLabel>
        <FieldLabel label="Email"><Input name="email" type="email" defaultValue={patient?.email ?? ""} maxLength={255} /></FieldLabel>
      </div>
      <FieldLabel label="Address"><Input name="address" defaultValue={patient?.address ?? ""} maxLength={300} /></FieldLabel>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FieldLabel label="Emergency contact name"><Input name="emergencyContactName" defaultValue={patient?.emergency_contact_name ?? ""} maxLength={120} /></FieldLabel>
        <FieldLabel label="Emergency contact phone"><Input name="emergencyContactPhone" type="tel" defaultValue={patient?.emergency_contact_phone ?? ""} maxLength={40} /></FieldLabel>
      </div>
      <FormError message={error} />
      <Footer onCancel={() => onOpenChange(false)} busy={busy} label={patient ? "Save changes" : "Register patient"} />
    </form></DialogContent></Dialog>;
}