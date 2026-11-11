export type AppointmentStatus =
  | "Pending"
  | "Confirmed"
  | "Checked In"
  | "In Consultation"
  | "Completed"
  | "Cancelled"
  | "No Show";

export type TriagePriority = "Mild" | "Moderate" | "Emergency";

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  lastVisit: string;
  reason: string;
}

export interface Appointment {
  id: string;
  patient: string;
  patientId: string;
  doctor: string;
  time: string;
  date: string;
  reason: string;
  status: AppointmentStatus;
}

export interface TriageRecord {
  id: string;
  patient: string;
  patientId: string;
  time: string;
  priority: TriagePriority;
  summary: string;
  reviewed: boolean;
  assignedTo: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  availability: "Available" | "In consultation" | "Off shift";
  hours: string;
  initials: string;
}

export const initialPatients: Patient[] = [
  { id: "CP-2048", name: "Amina Yusuf", age: 34, gender: "Female", phone: "+234 803 555 0102", lastVisit: "Today", reason: "General check-up" },
  { id: "CP-2047", name: "Tunde Okafor", age: 62, gender: "Male", phone: "+234 803 555 0103", lastVisit: "Yesterday", reason: "Blood pressure review" },
  { id: "CP-2046", name: "Amara Bello", age: 8, gender: "Female", phone: "+234 803 555 0104", lastVisit: "Nov 08, 2026", reason: "Fever and cough" },
  { id: "CP-2045", name: "Chidi Eze", age: 45, gender: "Male", phone: "+234 803 555 0105", lastVisit: "Nov 07, 2026", reason: "Follow-up" },
  { id: "CP-2044", name: "Zainab Musa", age: 27, gender: "Female", phone: "+234 803 555 0106", lastVisit: "Nov 06, 2026", reason: "Antenatal visit" },
];

export const initialAppointments: Appointment[] = [
  { id: "APT-1082", patient: "Amina Yusuf", patientId: "CP-2048", doctor: "Dr. Tobi Adebayo", time: "09:30 AM", date: "Today", reason: "General check-up", status: "Checked In" },
  { id: "APT-1081", patient: "Tunde Okafor", patientId: "CP-2047", doctor: "Dr. Samuel Mensah", time: "10:00 AM", date: "Today", reason: "Blood pressure review", status: "Confirmed" },
  { id: "APT-1080", patient: "Amara Bello", patientId: "CP-2046", doctor: "Dr. Nneka Okeke", time: "10:30 AM", date: "Today", reason: "Fever and cough", status: "In Consultation" },
  { id: "APT-1079", patient: "Chidi Eze", patientId: "CP-2045", doctor: "Dr. Tobi Adebayo", time: "11:15 AM", date: "Today", reason: "Follow-up visit", status: "Pending" },
  { id: "APT-1078", patient: "Zainab Musa", patientId: "CP-2044", doctor: "Dr. Farida Lawal", time: "12:00 PM", date: "Today", reason: "Antenatal visit", status: "Confirmed" },
  { id: "APT-1077", patient: "Emeka Nwosu", patientId: "CP-2042", doctor: "Dr. Samuel Mensah", time: "01:30 PM", date: "Today", reason: "Cardiology review", status: "Pending" },
];

export const initialTriage: TriageRecord[] = [
  { id: "TR-0314", patient: "Tunde Okafor", patientId: "CP-2047", time: "09:42 AM", priority: "Emergency", summary: "Chest discomfort and shortness of breath reported. Immediate clinical assessment advised.", reviewed: false, assignedTo: "Dr. Samuel Mensah" },
  { id: "TR-0313", patient: "Amara Bello", patientId: "CP-2046", time: "09:18 AM", priority: "Moderate", summary: "Fever reported for two days with a persistent cough.", reviewed: false, assignedTo: "Dr. Nneka Okeke" },
  { id: "TR-0312", patient: "Amina Yusuf", patientId: "CP-2048", time: "08:55 AM", priority: "Mild", summary: "Routine wellness visit. No urgent symptoms reported.", reviewed: true, assignedTo: "Dr. Tobi Adebayo" },
  { id: "TR-0311", patient: "Zainab Musa", patientId: "CP-2044", time: "08:34 AM", priority: "Moderate", summary: "Reports persistent nausea and fatigue during pregnancy.", reviewed: false, assignedTo: "Dr. Farida Lawal" },
];

export const initialDoctors: Doctor[] = [
  { id: "DOC-104", name: "Dr. Tobi Adebayo", specialty: "General Practice", availability: "Available", hours: "08:00 AM – 04:00 PM", initials: "TA" },
  { id: "DOC-103", name: "Dr. Nneka Okeke", specialty: "Pediatrics", availability: "Available", hours: "08:00 AM – 03:00 PM", initials: "NO" },
  { id: "DOC-102", name: "Dr. Samuel Mensah", specialty: "Cardiology", availability: "In consultation", hours: "09:00 AM – 05:00 PM", initials: "SM" },
  { id: "DOC-101", name: "Dr. Farida Lawal", specialty: "Obstetrics", availability: "Off shift", hours: "10:00 AM – 06:00 PM", initials: "FL" },
];

export const activityData = [
  { day: "Mon", patients: 28, appointments: 22 },
  { day: "Tue", patients: 34, appointments: 26 },
  { day: "Wed", patients: 31, appointments: 24 },
  { day: "Thu", patients: 42, appointments: 33 },
  { day: "Fri", patients: 38, appointments: 29 },
  { day: "Sat", patients: 25, appointments: 18 },
  { day: "Sun", patients: 16, appointments: 12 },
];

export const triageSummaryData = [
  { name: "Mild", value: 52, color: "var(--color-care-teal)" },
  { name: "Moderate", value: 31, color: "var(--color-chart-4)" },
  { name: "Emergency", value: 17, color: "var(--color-destructive)" },
];