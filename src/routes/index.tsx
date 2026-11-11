import { useMemo, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity, AlertCircle, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, CalendarDays,
  Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Clock3, ClipboardCheck,
  Download, FileText, HeartPulse, LayoutDashboard, LogOut, Menu, MoreHorizontal,
  Plus, Search, Settings2, ShieldCheck, SlidersHorizontal, Stethoscope, Users,
  UserRound, UserRoundPlus, X,
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis,
  PieChart, Pie, Cell,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  activityData, initialAppointments, initialDoctors, initialPatients, initialTriage,
  triageSummaryData, type Appointment, type AppointmentStatus, type Doctor, type Patient,
  type TriagePriority, type TriageRecord,
} from "@/lib/carepulse-data";

type Section = "Overview" | "Patients" | "Appointments" | "Triage Queue" | "Doctors" | "Consultations" | "Notifications" | "Reports" | "Clinic Settings";
type AppointmentFilter = "All appointments" | "Today" | "Pending" | "Confirmed" | "Completed";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CarePulse | Community clinic workspace" },
      { name: "description", content: "CarePulse clinic operations dashboard for patient care, appointments and triage." },
      { property: "og:title", content: "CarePulse | Community clinic workspace" },
      { property: "og:description", content: "A connected daily workspace for community clinic teams." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CarePulseApp,
});

const navItems: { label: Section; icon: typeof LayoutDashboard; group: "WORKSPACE" | "CARE & CLINICAL" | "INSIGHTS" | "PREFERENCES" }[] = [
  { label: "Overview", icon: LayoutDashboard, group: "WORKSPACE" },
  { label: "Patients", icon: Users, group: "CARE & CLINICAL" },
  { label: "Appointments", icon: CalendarDays, group: "CARE & CLINICAL" },
  { label: "Triage Queue", icon: Activity, group: "CARE & CLINICAL" },
  { label: "Doctors", icon: Stethoscope, group: "CARE & CLINICAL" },
  { label: "Consultations", icon: ClipboardCheck, group: "CARE & CLINICAL" },
  { label: "Notifications", icon: Bell, group: "INSIGHTS" },
  { label: "Reports", icon: FileText, group: "INSIGHTS" },
  { label: "Clinic Settings", icon: Settings2, group: "PREFERENCES" },
];

const statusClasses: Record<AppointmentStatus, string> = {
  Pending: "bg-status-warning/15 text-status-warning",
  Confirmed: "bg-primary/10 text-primary",
  "Checked In": "bg-care-teal/15 text-care-teal",
  "In Consultation": "bg-accent text-accent-foreground",
  Completed: "bg-status-positive/12 text-status-positive",
  Cancelled: "bg-muted text-muted-foreground",
  "No Show": "bg-destructive/10 text-destructive",
};

const priorityClasses: Record<TriagePriority, string> = {
  Mild: "bg-priority-mild/12 text-priority-mild",
  Moderate: "bg-priority-moderate/15 text-priority-moderate",
  Emergency: "bg-priority-emergency/10 text-priority-emergency",
};

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const calendarDays = [
  { date: 27, muted: true }, { date: 28, muted: true }, { date: 29, muted: true }, { date: 30, muted: true }, { date: 31, muted: true },
  ...Array.from({ length: 30 }, (_, i) => ({ date: i + 1, muted: false })),
];

function CarePulseApp() {
  const [section, setSection] = useState<Section>("Overview");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [appointmentFilter, setAppointmentFilter] = useState<AppointmentFilter>("All appointments");
  const [patients, setPatients] = useState(initialPatients);
  const [appointments, setAppointments] = useState(initialAppointments);
  const [triage, setTriage] = useState(initialTriage);
  const [doctors, setDoctors] = useState(initialDoctors);
  const [modal, setModal] = useState<"patient" | "appointment" | "doctor" | "consultation" | null>(null);
  const [patientOpen, setPatientOpen] = useState<Patient | null>(null);
  const [selectedConsultation, setSelectedConsultation] = useState<Appointment | null>(null);
  const [notificationCount, setNotificationCount] = useState(3);

  const searchMatches = (value: string) => value.toLowerCase().includes(query.trim().toLowerCase());
  const filteredPatients = useMemo(() => patients.filter((patient) =>
    searchMatches(patient.name) || searchMatches(patient.id) || searchMatches(patient.phone)), [patients, query]);
  const filteredAppointments = useMemo(() => appointments.filter((appointment) => {
    const matchesSearch = searchMatches(appointment.patient) || searchMatches(appointment.id) || searchMatches(appointment.doctor);
    if (!matchesSearch) return false;
    if (appointmentFilter === "Today") return appointment.date === "Today";
    if (appointmentFilter === "All appointments") return true;
    return appointment.status === appointmentFilter;
  }), [appointments, appointmentFilter, query]);

  function updateAppointment(id: string, status: AppointmentStatus) {
    setAppointments((current) => current.map((item) => item.id === id ? { ...item, status } : item));
  }

  function addPatient(form: FormData) {
    const first = String(form.get("firstName") ?? "").trim();
    const last = String(form.get("lastName") ?? "").trim();
    const patient = {
      id: `CP-${String(2049 + patients.length - initialPatients.length).padStart(4, "0")}`,
      name: `${first} ${last}`,
      age: Number(form.get("age")), gender: String(form.get("gender")),
      phone: String(form.get("phone")).trim(), lastVisit: "New patient",
      reason: "Registration completed",
    };
    setPatients((current) => [patient, ...current]);
    setModal(null);
  }

  function addAppointment(form: FormData) {
    const patientId = String(form.get("patient"));
    const patient = patients.find((item) => item.id === patientId);
    if (!patient) return;
    const doctorId = String(form.get("doctor"));
    const doctor = doctors.find((item) => item.id === doctorId);
    setAppointments((current) => [{
      id: `APT-${1083 + current.length - initialAppointments.length}`,
      patient: patient.name, patientId, doctor: doctor?.name ?? "Unassigned",
      date: String(form.get("date")), time: String(form.get("time")),
      reason: String(form.get("reason")).trim(), status: "Pending",
    }, ...current]);
    setModal(null);
  }

  function addDoctor(form: FormData) {
    const name = String(form.get("name")).trim();
    setDoctors((current) => [{
      id: `DOC-${105 + current.length - initialDoctors.length}`,
      name: name.startsWith("Dr.") ? name : `Dr. ${name}`,
      specialty: String(form.get("specialty")), availability: "Available",
      hours: "08:00 AM – 04:00 PM",
      initials: name.replace(/^Dr\.\s*/i, "").split(" ").map((part) => part[0] ?? "").slice(0, 2).join("").toUpperCase(),
    }, ...current]);
    setModal(null);
  }

  function saveConsultation(form: FormData) {
    if (!selectedConsultation) return;
    updateAppointment(selectedConsultation.id, "Completed");
    setTriage((current) => current.map((item) => item.patientId === selectedConsultation.patientId ? { ...item, reviewed: true } : item));
    setSelectedConsultation(null);
    setModal(null);
    void form;
  }

  const pageTitle = section === "Overview" ? "Good morning, Adegoke" : section;
  const pageDescription: Record<Section, string> = {
    Overview: "Here’s what’s happening at your clinic today.",
    Patients: "Manage patient records and visit history.",
    Appointments: "Schedule, confirm and track patient visits.",
    "Triage Queue": "Review incoming patient assessments and priorities.",
    Doctors: "Manage your clinical team and availability.",
    Consultations: "Document patient visits and clinical outcomes.",
    Notifications: "Important updates from across your clinic.",
    Reports: "Clinic activity and care delivery at a glance.",
    "Clinic Settings": "Manage the details and preferences for your clinic.",
  };

  return (
    <div className="carepulse-shell flex min-h-screen bg-background text-foreground">
      <Sidebar section={section} onSection={(next) => { setSection(next); setDrawerOpen(false); }} drawerOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="min-w-0 flex-1">
        <header className="app-topbar flex h-[72px] items-center justify-between border-b border-border bg-card px-5 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" onClick={() => setDrawerOpen(true)}><Menu /></Button>
            <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex"><span>Workspace</span><ChevronRight className="size-3.5" /><span className="font-semibold text-foreground">{section}</span></div>
            <span className="truncate text-sm font-semibold sm:hidden">{section}</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="hidden h-9 w-60 items-center gap-2 rounded-md border border-input bg-background px-3 lg:flex">
              <Search className="size-4 text-muted-foreground" />
              <input aria-label="Search clinic" value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" placeholder="Search patients, appointments…" />
              <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">⌘ K</kbd>
            </div>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications" onClick={() => { setSection("Notifications"); setNotificationCount(0); }}>
              <Bell className="size-[18px]" />{notificationCount > 0 && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive ring-2 ring-card" />}
            </Button>
            <span className="hidden h-7 w-px bg-border sm:block" />
            <button className="flex items-center gap-2.5 text-left" onClick={() => setSection("Clinic Settings")} aria-label="Open profile and clinic settings">
              <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">AK</span>
              <span className="hidden sm:block"><span className="block text-xs font-semibold">Adegoke Khadijah</span><span className="block text-[11px] text-muted-foreground">Clinic administrator</span></span>
              <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" />
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1600px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
          <div className="mb-7 flex flex-col justify-between gap-4 sm:mb-8 sm:flex-row sm:items-end">
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-care-blue">Wednesday, November 11, 2026</p>
              <h1 className="font-display text-[26px] font-bold leading-tight tracking-[-0.03em] sm:text-[30px]">{pageTitle}</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">{pageDescription[section]}</p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Button variant="outline" className="h-10 gap-2" onClick={() => setModal("appointment")}><CalendarDays className="size-4" /> Book appointment</Button>
              <Button className="h-10 gap-2" onClick={() => setModal("patient")}><Plus className="size-4" /> Register patient</Button>
            </div>
          </div>

          {section === "Overview" && <Overview patients={patients} appointments={appointments} doctors={doctors} triage={triage} onSection={setSection} onSelectConsultation={(appointment) => { setSelectedConsultation(appointment); setModal("consultation"); }} onStatus={updateAppointment} />}
          {section === "Patients" && <PatientsSection patients={filteredPatients} search={query} onSearch={setQuery} onAdd={() => setModal("patient")} onOpen={setPatientOpen} />}
          {section === "Appointments" && <AppointmentsSection appointments={filteredAppointments} filter={appointmentFilter} onFilter={setAppointmentFilter} onStatus={updateAppointment} onBook={() => setModal("appointment")} />}
          {section === "Triage Queue" && <TriageSection triage={triage} onReview={(id) => setTriage((current) => current.map((item) => item.id === id ? { ...item, reviewed: true } : item))} />}
          {section === "Doctors" && <DoctorsSection doctors={doctors} onAdd={() => setModal("doctor")} />}
          {section === "Consultations" && <ConsultationsSection appointments={appointments} onOpen={(appointment) => { setSelectedConsultation(appointment); setModal("consultation"); }} />}
          {section === "Notifications" && <NotificationsSection onRead={() => setNotificationCount(0)} />}
          {section === "Reports" && <ReportsSection />}
          {section === "Clinic Settings" && <SettingsSection />}
        </main>
      </div>
      <Dialogs modal={modal} onClose={() => setModal(null)} patients={patients} doctors={doctors} selectedConsultation={selectedConsultation} onPatient={addPatient} onAppointment={addAppointment} onDoctor={addDoctor} onConsultation={saveConsultation} />
      <PatientDialog patient={patientOpen} onClose={() => setPatientOpen(null)} appointments={appointments} triage={triage} />
    </div>
  );
}

function Sidebar({ section, onSection, drawerOpen, onClose }: { section: Section; onSection: (section: Section) => void; drawerOpen: boolean; onClose: () => void }) {
  const groups = ["WORKSPACE", "CARE & CLINICAL", "INSIGHTS", "PREFERENCES"] as const;
  return <>
    {drawerOpen && <button className="fixed inset-0 z-40 bg-foreground/35 lg:hidden" aria-label="Close menu" onClick={onClose} />}
    <aside className={`sidebar-panel fixed inset-y-0 left-0 z-50 flex w-[252px] flex-col bg-sidebar text-sidebar-foreground transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex h-[72px] items-center justify-between border-b border-sidebar-border px-5">
        <div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground"><HeartPulse className="size-5" /></span><div><div className="font-display text-[17px] font-extrabold leading-none tracking-[-0.04em]">carepulse<span className="text-sidebar-primary">.</span></div><div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/65">Clinic workspace</div></div></div>
        <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent lg:hidden" onClick={onClose} aria-label="Close menu"><X /></Button>
      </div>
      <div className="border-b border-sidebar-border px-4 py-4"><button className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-sidebar-accent"><span className="flex size-9 items-center justify-center rounded-md bg-sidebar-primary/15 text-sidebar-primary"><HeartPulse className="size-[18px]" /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">Lagos Community Clinic</span><span className="mt-0.5 block text-[10px] text-sidebar-foreground/60">Main branch</span></span><ChevronDown className="size-3.5 text-sidebar-foreground/60" /></button></div>
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {groups.map((group) => <div key={group} className="mb-6">
          <p className="mb-2 px-3 text-[9px] font-bold tracking-[0.15em] text-sidebar-foreground/45">{group}</p>
          <div className="space-y-0.5">{navItems.filter((item) => item.group === group).map(({ label, icon: Icon }) => {
            const active = label === section;
            const showAlert = label === "Triage Queue";
            return <button key={label} onClick={() => onSection(label)} className={`group flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-[12px] font-medium transition-colors ${active ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" : "text-sidebar-foreground/72 hover:bg-sidebar-accent/75 hover:text-sidebar-foreground"}`}><Icon className={`size-[17px] ${active ? "text-sidebar-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"}`} /><span className="flex-1">{label}</span>{showAlert && <span className="flex size-[18px] items-center justify-center rounded-full bg-destructive/90 text-[9px] font-bold text-destructive-foreground">3</span>}</button>;
          })}</div>
        </div>)}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <div className="rounded-md bg-sidebar-accent/70 px-3 py-3"><div className="flex items-center gap-2 text-[11px] font-semibold"><span className="size-2 rounded-full bg-status-positive" />All systems operational</div><p className="mt-1.5 pl-4 text-[10px] text-sidebar-foreground/55">Last synced just now</p></div>
        <button className="mt-3 flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-[11px] text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"><LogOut className="size-4" /> Sign out</button>
      </div>
    </aside>
  </>;
}

function Overview({ patients, appointments, doctors, triage, onSection, onSelectConsultation, onStatus }: {
  patients: Patient[]; appointments: Appointment[]; doctors: Doctor[]; triage: TriageRecord[]; onSection: (section: Section) => void;
  onSelectConsultation: (appointment: Appointment) => void; onStatus: (id: string, status: AppointmentStatus) => void;
}) {
  const pending = appointments.filter((item) => item.status === "Pending").length;
  const completed = appointments.filter((item) => item.status === "Completed").length;
  const emergency = triage.filter((item) => item.priority === "Emergency" && !item.reviewed).length;
  const available = doctors.filter((doctor) => doctor.availability === "Available").length;
  const metrics = [
    { title: "Total patients", value: patients.length + 1243, delta: "+12.8%", direction: "up", icon: Users, iconClass: "text-primary bg-primary/10", note: "vs. last month" },
    { title: "Today's appointments", value: appointments.filter((item) => item.date === "Today").length + 18, delta: "+4.2%", direction: "up", icon: CalendarDays, iconClass: "text-care-teal bg-care-teal/12", note: "vs. yesterday" },
    { title: "Pending appointments", value: pending + 8, delta: "Needs attention", direction: "flat", icon: Clock3, iconClass: "text-status-warning bg-status-warning/15", note: "awaiting confirmation" },
    { title: "Completed consultations", value: completed + 31, delta: "+8.1%", direction: "up", icon: ClipboardCheck, iconClass: "text-status-positive bg-status-positive/12", note: "today so far" },
  ];
  return <>
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:gap-4">
      {metrics.map(({ title, value, delta, direction, icon: Icon, iconClass, note }) => <article key={title} className="metric-card rounded-md border border-border bg-card p-4 sm:p-5"><div className="flex items-start justify-between"><div><p className="text-[11px] font-medium text-muted-foreground">{title}</p><p className="mt-2 text-[28px] font-bold leading-none tracking-[-0.045em]">{value.toLocaleString()}</p></div><span className={`flex size-9 items-center justify-center rounded-md ${iconClass}`}><Icon className="size-[18px]" /></span></div><div className="mt-4 flex items-center gap-1.5 text-[10px]">{direction === "up" ? <ArrowUpRight className="size-3.5 text-status-positive" /> : <span className="size-1.5 rounded-full bg-status-warning" />}<span className={`font-semibold ${direction === "up" ? "text-status-positive" : "text-status-warning"}`}>{delta}</span><span className="text-muted-foreground">{note}</span></div></article>)}
    </section>

    <section className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
      <article className="rounded-md border border-border bg-card p-5 sm:p-6 xl:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-sm font-bold">Appointment activity</h2><p className="mt-1 text-[11px] text-muted-foreground">Patient visits across the week</p></div><Select defaultValue="This week"><SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="This week">This week</SelectItem><SelectItem value="This month">This month</SelectItem><SelectItem value="This year">This year</SelectItem></SelectContent></Select></div>
        <div className="mt-5 h-[232px] w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={activityData} margin={{ top: 8, right: 6, left: -20, bottom: 0 }}><defs><linearGradient id="visitsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.18} /><stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.01} /></linearGradient><linearGradient id="appointmentsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-care-teal)" stopOpacity={0.14} /><stop offset="95%" stopColor="var(--color-care-teal)" stopOpacity={0.01} /></linearGradient></defs><CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="4 4" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} dy={8} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} /><ChartTooltip contentStyle={{ borderRadius: 6, borderColor: "var(--color-border)", fontSize: 11, backgroundColor: "var(--color-card)" }} /><Area type="monotone" dataKey="patients" stroke="var(--color-primary)" strokeWidth={2} fill="url(#visitsFill)" /><Area type="monotone" dataKey="appointments" stroke="var(--color-care-teal)" strokeWidth={2} fill="url(#appointmentsFill)" /></AreaChart></ResponsiveContainer></div>
        <div className="mt-1 flex justify-center gap-6"><span className="flex items-center gap-2 text-[10px] text-muted-foreground"><span className="size-2 rounded-full bg-primary" />Patients</span><span className="flex items-center gap-2 text-[10px] text-muted-foreground"><span className="size-2 rounded-full bg-care-teal" />Appointments</span></div>
      </article>
      <article className="rounded-md border border-border bg-card p-5 sm:p-6">
        <div className="flex items-start justify-between"><div><h2 className="text-sm font-bold">Triage priorities</h2><p className="mt-1 text-[11px] text-muted-foreground">Classifications this week</p></div><Button variant="ghost" size="icon" aria-label="Open triage queue" onClick={() => onSection("Triage Queue")}><ArrowRight className="size-4" /></Button></div>
        <div className="relative mx-auto mt-1 h-[190px] max-w-[255px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={triageSummaryData} dataKey="value" nameKey="name" innerRadius={61} outerRadius={82} paddingAngle={3} stroke="none" startAngle={90} endAngle={-270}>{triageSummaryData.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><ChartTooltip contentStyle={{ borderRadius: 6, borderColor: "var(--color-border)", fontSize: 11, backgroundColor: "var(--color-card)" }} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-[28px] font-bold tracking-[-0.05em]">100</span><span className="text-[10px] text-muted-foreground">this week</span></div></div>
        <div className="space-y-3">{triageSummaryData.map((item) => <div key={item.name} className="flex items-center justify-between text-[11px]"><span className="flex items-center gap-2 text-muted-foreground"><span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span><span className="font-semibold">{item.value}%</span></div>)}</div>
        <div className="mt-4 border-t border-border pt-3"><button className="flex w-full items-center justify-between text-[10px] font-semibold text-primary" onClick={() => onSection("Triage Queue")}>{emergency} emergency alerts need review <ArrowRight className="size-3.5" /></button><span className="sr-only">{available} doctors available</span></div>
      </article>
    </section>

    <section className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
      <article className="overflow-hidden rounded-md border border-border bg-card xl:col-span-2">
        <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6"><div><h2 className="text-sm font-bold">Upcoming appointments</h2><p className="mt-1 text-[11px] text-muted-foreground">Today, November 11</p></div><Button variant="ghost" size="sm" className="gap-1.5 text-xs text-primary" onClick={() => onSection("Appointments")}>View all <ArrowRight className="size-3.5" /></Button></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[660px] text-left"><thead className="bg-muted/50"><tr className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground"><th className="px-5 py-3 sm:px-6">Patient</th><th className="px-3 py-3">Time</th><th className="px-3 py-3">Doctor</th><th className="px-3 py-3">Status</th><th className="px-5 py-3 text-right sm:px-6">Action</th></tr></thead><tbody>{appointments.slice(0, 4).map((item) => <tr key={item.id} className="border-t border-border text-[11px]"><td className="px-5 py-3 sm:px-6"><button className="flex items-center gap-2.5 text-left" onClick={() => onSection("Patients")}><PersonAvatar name={item.patient} /><span><span className="block font-semibold">{item.patient}</span><span className="mt-0.5 block text-[9px] text-muted-foreground">{item.patientId}</span></span></button></td><td className="px-3 py-3 text-muted-foreground">{item.time}</td><td className="px-3 py-3 text-muted-foreground">{item.doctor}</td><td className="px-3 py-3"><Badge className={`whitespace-nowrap border-0 px-2 py-1 text-[9px] font-semibold ${statusClasses[item.status]}`}>{item.status}</Badge></td><td className="px-5 py-3 text-right sm:px-6">{item.status === "Pending" ? <Button variant="outline" size="sm" className="h-7 px-2.5 text-[10px]" onClick={() => onStatus(item.id, "Confirmed")}>Confirm</Button> : item.status === "Checked In" || item.status === "In Consultation" ? <Button variant="ghost" size="icon" className="size-7" aria-label={`Open consultation for ${item.patient}`} onClick={() => onSelectConsultation(item)}><ArrowRight className="size-3.5" /></Button> : <span className="text-[10px] text-muted-foreground">—</span>}</td></tr>)}</tbody></table></div>
      </article>
      <article className="rounded-md border border-border bg-card p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-bold">Recent registrations</h2><p className="mt-1 text-[11px] text-muted-foreground">Latest patients added</p></div><Button variant="ghost" size="icon" aria-label="View all patients" onClick={() => onSection("Patients")}><ArrowRight className="size-4" /></Button></div>
        <div className="space-y-4">{patients.slice(0, 4).map((patient, index) => <div key={patient.id} className="flex items-center gap-3"><PersonAvatar name={patient.name} /><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-semibold">{patient.name}</p><p className="mt-0.5 text-[9px] text-muted-foreground">{patient.id}</p></div><span className="whitespace-nowrap text-[9px] text-muted-foreground">{index === 0 ? "Just now" : `${index * 2}h ago`}</span></div>)}</div>
        <Button variant="outline" className="mt-5 h-9 w-full text-[11px]" onClick={() => onSection("Patients")}>View patient directory <ArrowRight className="ml-1 size-3.5" /></Button>
      </article>
    </section>
    <section className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
      <article className="rounded-md border border-border bg-card p-5 sm:p-6 xl:col-span-2"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-bold">Triage queue</h2><p className="mt-1 text-[11px] text-muted-foreground">Patient assessments awaiting review</p></div><Button variant="ghost" size="sm" className="gap-1.5 text-xs text-primary" onClick={() => onSection("Triage Queue")}>Open queue <ArrowRight className="size-3.5" /></Button></div><div className="space-y-2">{triage.slice(0, 3).map((record) => <TriageRow key={record.id} record={record} compact />)}</div><p className="mt-3 flex items-start gap-1.5 text-[9px] leading-relaxed text-muted-foreground"><ShieldCheck className="mt-0.5 size-3 shrink-0 text-care-teal" />AI classifications support clinical review and do not replace professional medical judgment.</p></article>
      <article className="rounded-md border border-border bg-card p-5 sm:p-6"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-bold">Doctor availability</h2><p className="mt-1 text-[11px] text-muted-foreground">{available} doctors available now</p></div><Button variant="ghost" size="icon" aria-label="Open doctors" onClick={() => onSection("Doctors")}><ArrowRight className="size-4" /></Button></div><div className="space-y-4">{doctors.slice(0, 3).map((doctor) => <DoctorRow key={doctor.id} doctor={doctor} />)}</div></article>
    </section>
  </>;
}

function PersonAvatar({ name, small = false }: { name: string; small?: boolean }) {
  const initials = name.split(" ").map((part) => part[0] ?? "").slice(0, 2).join("").toUpperCase();
  const tones = ["bg-primary/10 text-primary", "bg-care-teal/15 text-secondary-foreground", "bg-status-warning/20 text-foreground", "bg-accent text-accent-foreground"];
  const tone = tones[name.charCodeAt(0) % tones.length] ?? tones[0];
  return <span className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${small ? "size-8 text-[9px]" : "size-9 text-[10px]"} ${tone}`}>{initials}</span>;
}

function TriageRow({ record, compact = false, onReview }: { record: TriageRecord; compact?: boolean; onReview?: (id: string) => void }) {
  return <div className={`flex flex-col gap-3 rounded-md border border-border px-3 py-3 sm:flex-row sm:items-center ${record.priority === "Emergency" ? "border-l-[3px] border-l-priority-emergency" : ""}`}>
    <PersonAvatar name={record.patient} small />
    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[11px] font-semibold">{record.patient}</span><span className="text-[9px] text-muted-foreground">{record.patientId}</span></div><p className={`mt-1 text-[10px] leading-relaxed text-muted-foreground ${compact ? "line-clamp-1" : ""}`}>{record.summary}</p><div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-muted-foreground"><span>{record.time}</span><span>Assigned: {record.assignedTo}</span></div></div>
    <div className="flex items-center justify-between gap-2 sm:justify-end"><Badge className={`border-0 ${priorityClasses[record.priority]}`}>{record.priority === "Emergency" && <AlertCircle className="mr-1 size-3" />}{record.priority}</Badge>{record.reviewed ? <span className="flex items-center gap-1 text-[9px] font-medium text-status-positive"><Check className="size-3.5" /> Reviewed</span> : onReview ? <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => onReview(record.id)}>Mark reviewed</Button> : <span className="text-[9px] font-medium text-status-warning">Needs review</span>}</div>
  </div>;
}

function DoctorRow({ doctor }: { doctor: Doctor }) {
  const status: Record<Doctor["availability"], string> = { Available: "bg-status-positive", "In consultation": "bg-status-warning", "Off shift": "bg-muted-foreground/50" };
  return <div className="flex items-center gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-[9px] font-semibold text-secondary-foreground">{doctor.initials}</span><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-semibold">{doctor.name}</p><p className="mt-0.5 truncate text-[9px] text-muted-foreground">{doctor.specialty}</p></div><span className="flex items-center gap-1.5 whitespace-nowrap text-[9px] text-muted-foreground"><i className={`size-1.5 rounded-full ${status[doctor.availability]}`} />{doctor.availability}</span></div>;
}

function PatientsSection({ patients, search, onSearch, onAdd, onOpen }: { patients: Patient[]; search: string; onSearch: (value: string) => void; onAdd: () => void; onOpen: (patient: Patient) => void }) {
  return <><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex w-full max-w-sm items-center gap-2 rounded-md border border-input bg-card px-3"><Search className="size-4 text-muted-foreground" /><Input className="h-10 border-0 px-0 shadow-none focus-visible:ring-0" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search name, patient ID or phone" /></div><div className="flex gap-2"><Button variant="outline" className="gap-2"><SlidersHorizontal className="size-4" /> Filter</Button><Button onClick={onAdd} className="gap-2"><UserRoundPlus className="size-4" /> Register patient</Button></div></div><div className="overflow-hidden rounded-md border border-border bg-card"><div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 className="text-sm font-bold">Patient directory</h2><p className="mt-1 text-[11px] text-muted-foreground">{patients.length} sample patient records</p></div><Button variant="outline" size="sm" className="gap-2"><Download className="size-3.5" /> Export</Button></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left"><thead className="bg-muted/50"><tr className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground"><th className="px-5 py-3">Patient</th><th className="px-3 py-3">Patient ID</th><th className="px-3 py-3">Age / gender</th><th className="px-3 py-3">Phone</th><th className="px-3 py-3">Last visit</th><th className="px-5 py-3 text-right">Details</th></tr></thead><tbody>{patients.map((patient) => <tr key={patient.id} className="border-t border-border text-[11px]"><td className="px-5 py-3"><button className="flex items-center gap-2.5 text-left" onClick={() => onOpen(patient)}><PersonAvatar name={patient.name} /><span className="font-semibold">{patient.name}</span></button></td><td className="px-3 py-3 text-muted-foreground">{patient.id}</td><td className="px-3 py-3 text-muted-foreground">{patient.age} / {patient.gender}</td><td className="px-3 py-3 text-muted-foreground">{patient.phone}</td><td className="px-3 py-3 text-muted-foreground">{patient.lastVisit}</td><td className="px-5 py-3 text-right"><Button variant="ghost" size="sm" className="h-8 text-primary" onClick={() => onOpen(patient)}>View record <ArrowRight className="ml-1 size-3.5" /></Button></td></tr>)}</tbody></table>{patients.length === 0 && <p className="px-5 py-10 text-center text-sm text-muted-foreground">No patients match this search.</p>}</div></div></>;
}

function AppointmentsSection({ appointments, filter, onFilter, onStatus, onBook }: { appointments: Appointment[]; filter: AppointmentFilter; onFilter: (filter: AppointmentFilter) => void; onStatus: (id: string, status: AppointmentStatus) => void; onBook: () => void }) {
  const filters: AppointmentFilter[] = ["All appointments", "Today", "Pending", "Confirmed", "Completed"];
  return <><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-1 rounded-md border border-border bg-card p-1">{filters.map((item) => <Button key={item} variant={filter === item ? "secondary" : "ghost"} size="sm" className="h-8 px-3 text-[10px]" onClick={() => onFilter(item)}>{item}</Button>)}</div><Button onClick={onBook} className="gap-2"><Plus className="size-4" /> Book appointment</Button></div><div className="overflow-hidden rounded-md border border-border bg-card"><div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 className="text-sm font-bold">{filter}</h2><p className="mt-1 text-[11px] text-muted-foreground">{appointments.length} appointments shown</p></div><Button variant="outline" size="sm" className="gap-2"><CalendarDays className="size-3.5" /> November 11, 2026 <ChevronDown className="size-3" /></Button></div><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left"><thead className="bg-muted/50"><tr className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground"><th className="px-5 py-3">Patient</th><th className="px-3 py-3">Date & time</th><th className="px-3 py-3">Doctor</th><th className="px-3 py-3">Reason</th><th className="px-3 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody>{appointments.map((item) => <tr key={item.id} className="border-t border-border text-[11px]"><td className="px-5 py-3"><div className="flex items-center gap-2.5"><PersonAvatar name={item.patient} /><span><span className="block font-semibold">{item.patient}</span><span className="mt-0.5 block text-[9px] text-muted-foreground">{item.patientId}</span></span></div></td><td className="px-3 py-3"><span className="block font-medium">{item.date}</span><span className="mt-0.5 block text-[9px] text-muted-foreground">{item.time}</span></td><td className="px-3 py-3 text-muted-foreground">{item.doctor}</td><td className="px-3 py-3 text-muted-foreground">{item.reason}</td><td className="px-3 py-3"><Badge className={`whitespace-nowrap border-0 ${statusClasses[item.status]}`}>{item.status}</Badge></td><td className="px-5 py-3 text-right">{item.status === "Pending" ? <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => onStatus(item.id, "Confirmed")}>Confirm</Button> : item.status === "Confirmed" ? <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => onStatus(item.id, "Checked In")}>Check in</Button> : <Button variant="ghost" size="icon" className="size-8" aria-label={`More actions for ${item.patient}`}><MoreHorizontal className="size-4" /></Button>}</td></tr>)}</tbody></table>{appointments.length === 0 && <p className="px-5 py-10 text-center text-sm text-muted-foreground">No appointments match this filter.</p>}</div></div></>;
}

function TriageSection({ triage, onReview }: { triage: TriageRecord[]; onReview: (id: string) => void }) {
  const emergencies = triage.filter((item) => item.priority === "Emergency").length;
  return <><div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3"><MiniMetric label="Awaiting review" value={triage.filter((item) => !item.reviewed).length} icon={Clock3} /><MiniMetric label="Emergency priority" value={emergencies} icon={AlertCircle} tone="emergency" /><MiniMetric label="Reviewed today" value={triage.filter((item) => item.reviewed).length} icon={CheckCircle2} tone="positive" /></div><article className="rounded-md border border-border bg-card p-5 sm:p-6"><div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="text-sm font-bold">Live triage queue</h2><p className="mt-1 text-[11px] text-muted-foreground">AI screening summaries for staff review</p></div><Select defaultValue="All priorities"><SelectTrigger className="h-8 w-[142px] text-[10px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="All priorities">All priorities</SelectItem><SelectItem value="Emergency">Emergency</SelectItem><SelectItem value="Moderate">Moderate</SelectItem><SelectItem value="Mild">Mild</SelectItem></SelectContent></Select></div><div className="space-y-2">{triage.map((record) => <TriageRow key={record.id} record={record} onReview={onReview} />)}</div><p className="mt-5 flex items-start gap-2 border-t border-border pt-4 text-[10px] leading-relaxed text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-care-teal" />AI-generated classifications are screening aids only. Clinical staff must review every assessment and use professional medical judgment.</p></article></>;
}

function MiniMetric({ label, value, icon: Icon, tone = "normal" }: { label: string; value: number; icon: typeof Clock3; tone?: "normal" | "emergency" | "positive" }) {
  const toneClass = tone === "emergency" ? "text-destructive bg-destructive/10" : tone === "positive" ? "text-status-positive bg-status-positive/12" : "text-primary bg-primary/10";
  return <div className="flex items-center justify-between rounded-md border border-border bg-card p-4"><div><p className="text-[10px] text-muted-foreground">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div><span className={`flex size-9 items-center justify-center rounded-md ${toneClass}`}><Icon className="size-4" /></span></div>;
}

function DoctorsSection({ doctors, onAdd }: { doctors: Doctor[]; onAdd: () => void }) {
  return <><div className="mb-4 flex justify-end"><Button onClick={onAdd} className="gap-2"><UserRoundPlus className="size-4" /> Add doctor</Button></div><div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{doctors.map((doctor) => <article key={doctor.id} className="rounded-md border border-border bg-card p-5"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">{doctor.initials}</span><div><h2 className="text-[12px] font-bold">{doctor.name}</h2><p className="mt-1 text-[10px] text-muted-foreground">{doctor.specialty}</p></div></div><Button variant="ghost" size="icon" aria-label={`More options for ${doctor.name}`}><MoreHorizontal className="size-4" /></Button></div><div className="mt-5 border-t border-border pt-4"><div className="flex justify-between text-[10px]"><span className="text-muted-foreground">Availability</span><span className="font-medium">{doctor.availability}</span></div><div className="mt-2.5 flex justify-between text-[10px]"><span className="text-muted-foreground">Today's hours</span><span className="font-medium">{doctor.hours}</span></div><Button variant="outline" className="mt-4 h-8 w-full text-[10px]">View schedule <ArrowRight className="ml-1 size-3.5" /></Button></div></article>)}</div></>;
}

function ConsultationsSection({ appointments, onOpen }: { appointments: Appointment[]; onOpen: (appointment: Appointment) => void }) {
  const consultations = appointments.filter((item) => item.status === "Checked In" || item.status === "In Consultation" || item.status === "Completed");
  return <article className="rounded-md border border-border bg-card"><div className="border-b border-border px-5 py-4"><h2 className="text-sm font-bold">Consultation records</h2><p className="mt-1 text-[11px] text-muted-foreground">Open a visit to document notes and outcomes</p></div><div className="divide-y divide-border">{consultations.map((item) => <div key={item.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"><PersonAvatar name={item.patient} /><div className="min-w-0 flex-1"><p className="text-[11px] font-semibold">{item.patient}</p><p className="mt-1 text-[10px] text-muted-foreground">{item.reason} · {item.doctor} · {item.time}</p></div><Badge className={`w-fit border-0 ${statusClasses[item.status]}`}>{item.status}</Badge><Button variant="outline" size="sm" onClick={() => onOpen(item)}>{item.status === "Completed" ? "View notes" : "Open consultation"}<ArrowRight className="ml-2 size-3.5" /></Button></div>)}</div></article>;
}

function NotificationsSection({ onRead }: { onRead: () => void }) {
  const notifications = [
    { icon: AlertCircle, tone: "text-destructive bg-destructive/10", title: "Emergency triage needs review", detail: "Tunde Okafor · Chest discomfort reported", time: "09:42 AM", unread: true },
    { icon: CalendarDays, tone: "text-primary bg-primary/10", title: "New appointment request", detail: "Emeka Nwosu requested a cardiology review", time: "09:25 AM", unread: true },
    { icon: UserRoundPlus, tone: "text-care-teal bg-care-teal/12", title: "New patient registered", detail: "Amina Yusuf was added to patient records", time: "08:55 AM", unread: true },
    { icon: CheckCircle2, tone: "text-status-positive bg-status-positive/12", title: "Consultation completed", detail: "Follow-up visit recorded by Dr. Nneka Okeke", time: "Yesterday", unread: false },
  ];
  return <article className="max-w-4xl rounded-md border border-border bg-card"><div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 className="text-sm font-bold">Recent notifications</h2><p className="mt-1 text-[11px] text-muted-foreground">Clinic updates and reminders</p></div><Button variant="outline" size="sm" className="text-[10px]" onClick={onRead}>Mark all as read</Button></div><div className="divide-y divide-border">{notifications.map((item) => <div key={item.title} className={`flex gap-3 px-5 py-4 ${item.unread ? "bg-primary/[0.025]" : ""}`}><span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${item.tone}`}><item.icon className="size-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-[11px] font-semibold">{item.title}</p>{item.unread && <span className="size-1.5 rounded-full bg-primary" />}</div><p className="mt-1 text-[10px] text-muted-foreground">{item.detail}</p></div><time className="whitespace-nowrap text-[9px] text-muted-foreground">{item.time}</time></div>)}</div></article>;
}

function ReportsSection() {
  return <><div className="mb-4 flex justify-end"><Button variant="outline" className="gap-2"><Download className="size-4" /> Export report</Button></div><div className="grid grid-cols-1 gap-4 xl:grid-cols-2"><article className="rounded-md border border-border bg-card p-5 sm:p-6 xl:col-span-2"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-sm font-bold">Patient and appointment activity</h2><p className="mt-1 text-[11px] text-muted-foreground">Daily clinic activity · November 2026</p></div><Select defaultValue="Last 7 days"><SelectTrigger className="h-8 w-[128px] text-[10px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Last 7 days">Last 7 days</SelectItem><SelectItem value="This month">This month</SelectItem></SelectContent></Select></div><div className="mt-4 h-[270px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={activityData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="4 4" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} dy={8} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} /><ChartTooltip contentStyle={{ borderRadius: 6, borderColor: "var(--color-border)", fontSize: 11, backgroundColor: "var(--color-card)" }} /><Area type="monotone" dataKey="patients" stroke="var(--color-primary)" strokeWidth={2} fill="var(--color-primary)" fillOpacity={0.08} /><Area type="monotone" dataKey="appointments" stroke="var(--color-care-teal)" strokeWidth={2} fill="var(--color-care-teal)" fillOpacity={0.08} /></AreaChart></ResponsiveContainer></div></article><ReportStat title="Appointment completion" value="86%" caption="Of confirmed visits completed this month" icon={CalendarDays} /><ReportStat title="Triage reviewed" value="94%" caption="Assessments reviewed by clinical staff" icon={Activity} /></div></>;
}

function ReportStat({ title, value, caption, icon: Icon }: { title: string; value: string; caption: string; icon: typeof CalendarDays }) {
  return <article className="flex items-start justify-between rounded-md border border-border bg-card p-5"><div><p className="text-[11px] text-muted-foreground">{title}</p><p className="mt-2 text-3xl font-bold tracking-[-0.04em]">{value}</p><p className="mt-2 text-[10px] text-muted-foreground">{caption}</p></div><span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary"><Icon className="size-[18px]" /></span></article>;
}

function SettingsSection() {
  return <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]"><article className="rounded-md border border-border bg-card p-5 sm:p-6"><div className="border-b border-border pb-4"><h2 className="text-sm font-bold">Clinic information</h2><p className="mt-1 text-[11px] text-muted-foreground">Update the details staff see in their workspace.</p></div><form className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={(event) => event.preventDefault()}><Field label="Clinic name"><Input defaultValue="Lagos Community Clinic" /></Field><Field label="Phone number"><Input defaultValue="+234 1 555 0120" /></Field><Field label="Email address"><Input type="email" defaultValue="hello@lagoscommunityclinic.example" /></Field><Field label="Clinic address"><Input defaultValue="Ikeja, Lagos, Nigeria" /></Field><Field label="Time zone"><Select defaultValue="WAT"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="WAT">West Africa Time (WAT)</SelectItem><SelectItem value="UTC">UTC</SelectItem></SelectContent></Select></Field><Field label="Default appointment duration"><Select defaultValue="30"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="15">15 minutes</SelectItem><SelectItem value="30">30 minutes</SelectItem><SelectItem value="45">45 minutes</SelectItem></SelectContent></Select></Field><div className="sm:col-span-2"><Button type="submit">Save clinic details</Button></div></form></article><article className="rounded-md border border-border bg-card p-5 sm:p-6"><h2 className="text-sm font-bold">Clinic hours</h2><p className="mt-1 text-[11px] text-muted-foreground">Weekly opening schedule</p><div className="mt-5 space-y-3">{weekdays.map((day) => <div key={day} className="flex items-center justify-between border-b border-border pb-2.5 text-[10px]"><span>{day}</span><span className={day === "Sun" ? "text-muted-foreground" : "font-medium"}>{day === "Sun" ? "Closed" : "08:00 AM – 06:00 PM"}</span></div>)}</div><Button variant="outline" className="mt-4 w-full">Edit opening hours</Button></article></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-[10px] font-medium">{label}</span>{children}</label>;
}

function Dialogs({ modal, onClose, patients, doctors, selectedConsultation, onPatient, onAppointment, onDoctor, onConsultation }: {
  modal: "patient" | "appointment" | "doctor" | "consultation" | null; onClose: () => void;
  patients: Patient[]; doctors: Doctor[]; selectedConsultation: Appointment | null;
  onPatient: (form: FormData) => void; onAppointment: (form: FormData) => void; onDoctor: (form: FormData) => void; onConsultation: (form: FormData) => void;
}) {
  const title = modal === "patient" ? "Register a patient" : modal === "appointment" ? "Book an appointment" : modal === "doctor" ? "Add a doctor" : "Consultation notes";
  const description = modal === "patient" ? "Add a new record to this clinic workspace." : modal === "appointment" ? "Choose a patient and schedule a clinic visit." : modal === "doctor" ? "Add a clinician to your care team." : "Document today's visit and clinical outcome.";
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (modal === "patient") onPatient(form);
    else if (modal === "appointment") onAppointment(form);
    else if (modal === "doctor") onDoctor(form);
    else if (modal === "consultation") onConsultation(form);
  };
  return <Dialog open={modal !== null} onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]"><DialogHeader><DialogTitle className="font-display">{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
    {modal === "patient" && <form onSubmit={submit} className="space-y-4"><div className="grid grid-cols-2 gap-3"><Field label="First name"><Input name="firstName" autoComplete="given-name" placeholder="First name" required /></Field><Field label="Last name"><Input name="lastName" autoComplete="family-name" placeholder="Last name" required /></Field></div><div className="grid grid-cols-2 gap-3"><Field label="Age"><Input name="age" type="number" min="0" max="120" placeholder="Age" required /></Field><Field label="Gender"><Select name="gender" defaultValue="Female"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Female">Female</SelectItem><SelectItem value="Male">Male</SelectItem><SelectItem value="Other">Other</SelectItem><SelectItem value="Prefer not to say">Prefer not to say</SelectItem></SelectContent></Select></Field></div><Field label="Phone number"><Input name="phone" type="tel" placeholder="+234 …" required /></Field><DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit">Register patient</Button></DialogFooter></form>}
    {modal === "appointment" && <form onSubmit={submit} className="space-y-4"><Field label="Patient"><Select name="patient" required><SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger><SelectContent>{patients.map((patient) => <SelectItem key={patient.id} value={patient.id}>{patient.name} · {patient.id}</SelectItem>)}</SelectContent></Select></Field><Field label="Doctor"><Select name="doctor" required><SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger><SelectContent>{doctors.map((doctor) => <SelectItem key={doctor.id} value={doctor.id}>{doctor.name} · {doctor.specialty}</SelectItem>)}</SelectContent></Select></Field><div className="grid grid-cols-2 gap-3"><Field label="Date"><Input name="date" type="date" required /></Field><Field label="Time"><Input name="time" type="time" required /></Field></div><Field label="Appointment reason"><Input name="reason" placeholder="Reason for visit" required /></Field><DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit">Create appointment</Button></DialogFooter></form>}
    {modal === "doctor" && <form onSubmit={submit} className="space-y-4"><Field label="Doctor's name"><Input name="name" placeholder="e.g. Dr. Jane Doe" required /></Field><Field label="Specialization"><Select name="specialty" required><SelectTrigger><SelectValue placeholder="Select specialty" /></SelectTrigger><SelectContent>{["General Practice", "Pediatrics", "Cardiology", "Obstetrics", "Dermatology", "Internal Medicine", "Other"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></Field><DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit">Add doctor</Button></DialogFooter></form>}
    {modal === "consultation" && <form onSubmit={submit} className="space-y-4"><div className="rounded-md bg-muted/60 p-3"><p className="text-xs font-semibold">{selectedConsultation?.patient}</p><p className="mt-1 text-[10px] text-muted-foreground">{selectedConsultation?.reason} · {selectedConsultation?.doctor}</p></div><Field label="Consultation notes"><Textarea name="notes" rows={4} placeholder="Record relevant observations and care provided…" required /></Field><Field label="Outcome"><Select name="outcome" defaultValue="Follow-up required"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Follow-up required">Follow-up required</SelectItem><SelectItem value="Treatment provided">Treatment provided</SelectItem><SelectItem value="Referred">Referred</SelectItem><SelectItem value="No further action">No further action</SelectItem></SelectContent></Select></Field><DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit"><CheckCircle2 className="size-4" /> Complete consultation</Button></DialogFooter></form>}
  </DialogContent></Dialog>;
}

function PatientDialog({ patient, onClose, appointments, triage }: { patient: Patient | null; onClose: () => void; appointments: Appointment[]; triage: TriageRecord[] }) {
  const records = patient ? appointments.filter((item) => item.patientId === patient.id) : [];
  const assessments = patient ? triage.filter((item) => item.patientId === patient.id) : [];
  return <Dialog open={patient !== null} onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]"><DialogHeader><DialogTitle>Patient profile</DialogTitle><DialogDescription>Clinic record and recent visit history.</DialogDescription></DialogHeader>{patient && <div><div className="flex items-center gap-3 border-b border-border pb-4"><PersonAvatar name={patient.name} /><div><p className="text-sm font-bold">{patient.name}</p><p className="mt-1 text-[10px] text-muted-foreground">{patient.id} · {patient.age} · {patient.gender}</p></div></div><div className="grid grid-cols-2 gap-3 py-4 text-[10px]"><div><p className="text-muted-foreground">Phone</p><p className="mt-1 font-medium">{patient.phone}</p></div><div><p className="text-muted-foreground">Last visit</p><p className="mt-1 font-medium">{patient.lastVisit}</p></div></div><h3 className="mb-2 text-xs font-bold">Appointment history</h3>{records.length ? records.map((item) => <div key={item.id} className="flex items-center justify-between border-t border-border py-2.5 text-[10px]"><span>{item.date} · {item.reason}</span><Badge className={`border-0 ${statusClasses[item.status]}`}>{item.status}</Badge></div>) : <p className="border-t border-border py-3 text-[10px] text-muted-foreground">No appointment history yet.</p>}<h3 className="mb-2 mt-4 text-xs font-bold">Triage history</h3>{assessments.length ? assessments.map((item) => <div key={item.id} className="flex items-start justify-between gap-3 border-t border-border py-2.5 text-[10px]"><span className="leading-relaxed text-muted-foreground">{item.summary}</span><Badge className={`shrink-0 border-0 ${priorityClasses[item.priority]}`}>{item.priority}</Badge></div>) : <p className="border-t border-border py-3 text-[10px] text-muted-foreground">No triage records yet.</p>}</div>}</DialogContent></Dialog>;
}