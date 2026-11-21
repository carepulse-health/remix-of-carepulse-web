import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity, ArrowRight, CalendarDays, ClipboardList, HeartPulse, LockKeyhole,
  ShieldCheck, Smartphone, Stethoscope, UserRoundCheck, Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CarePulse | Smart community clinic workspace" },
      { name: "description", content: "CarePulse helps community clinic teams review patient screenings, run appointments and coordinate doctors in one secure workspace." },
      { property: "og:title", content: "CarePulse | Smart community clinic workspace" },
      { property: "og:description", content: "Screenings, appointments and doctors in one secure workspace for community clinic teams." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LandingPage,
});

const features = [
  { icon: Activity, title: "Triage queue", text: "Screenings patients submit from the mobile app arrive ranked by priority, ready for clinical review." },
  { icon: CalendarDays, title: "Appointments", text: "Schedule visits, confirm bookings and check patients in at the front desk." },
  { icon: Stethoscope, title: "Doctors & schedules", text: "Keep doctor profiles and weekly availability current for the whole team." },
  { icon: ClipboardList, title: "Consultations", text: "Record consultation notes and follow-up dates against each visit." },
];

const roles = [
  { icon: ShieldCheck, role: "Admins", text: "Run the clinic: doctors, schedules, clinic details and staff access." },
  { icon: Stethoscope, role: "Doctors", text: "Start in the triage queue, review screenings and record consultations." },
  { icon: Users, role: "Receptionists", text: "Start in appointments, register patients and keep the day moving." },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link to="/" className="flex items-center gap-2.5" aria-label="CarePulse home">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <HeartPulse className="size-5" aria-hidden="true" />
            </span>
            <span className="font-display text-lg font-extrabold tracking-tight">CarePulse</span>
          </Link>
          <Button asChild size="sm" className="gap-2">
            <Link to="/staff-login"><LockKeyhole className="size-4" aria-hidden="true" />Staff sign in</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-care-teal">Smart community clinic</p>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              Every patient seen,
              <span className="block text-primary">in the right order.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
              CarePulse brings screenings, appointments and your clinical team into one calm, secure workspace, so community clinics can focus on care instead of paperwork.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-12 gap-2 px-6">
                <Link to="/staff-login">Staff sign in<ArrowRight className="size-4" aria-hidden="true" /></Link>
              </Button>
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Smartphone className="size-4 text-care-teal" aria-hidden="true" />Patients use the CarePulse mobile app
              </span>
            </div>
          </div>

          <div className="relative" aria-hidden="true">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div><p className="text-xs text-muted-foreground">Today</p><p className="font-display text-base font-bold">Triage queue</p></div>
                <span className="rounded-full bg-status-warning/15 px-2.5 py-1 text-[11px] font-semibold text-status-warning">3 awaiting review</span>
              </div>
              {[
                { level: "Emergency", tone: "bg-priority-emergency", width: "w-11/12" },
                { level: "Moderate", tone: "bg-priority-moderate", width: "w-8/12" },
                { level: "Mild", tone: "bg-priority-mild", width: "w-9/12" },
              ].map((row) => (
                <div key={row.level} className="flex items-center gap-3 border-b border-border py-3.5 last:border-0">
                  <span className={`size-2.5 shrink-0 rounded-full ${row.tone}`} />
                  <div className="flex-1 space-y-1.5"><div className={`h-2 rounded-full bg-muted ${row.width}`} /><div className="h-2 w-5/12 rounded-full bg-muted/70" /></div>
                  <span className="text-[11px] font-medium text-muted-foreground">{row.level}</span>
                </div>
              ))}
            </div>
            <div className="absolute -bottom-6 -left-4 hidden rounded-xl border border-border bg-card px-4 py-3 shadow-sm sm:flex sm:items-center sm:gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-status-positive/12 text-status-positive"><UserRoundCheck className="size-5" /></span>
              <div><p className="text-xs font-semibold">Screening reviewed</p><p className="text-[11px] text-muted-foreground">Follow-up booked for Thursday</p></div>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-card">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
            <h2 className="max-w-2xl font-display text-3xl font-bold tracking-tight">Built around how a community clinic actually runs</h2>
            <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
              {features.map(({ icon: Icon, title, text }) => (
                <article key={title} className="bg-card p-6">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-5" aria-hidden="true" /></span>
                  <h3 className="mt-5 font-display text-base font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:py-20">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight">The right view for every role</h2>
            <p className="mt-4 text-muted-foreground">Each team member signs in to the part of the clinic they're responsible for, and only sees the actions their role allows.</p>
            <ul className="mt-8 space-y-4">
              {roles.map(({ icon: Icon, role, text }) => (
                <li key={role} className="flex gap-4 rounded-xl border border-border bg-card p-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-care-teal/12 text-care-teal"><Icon className="size-5" aria-hidden="true" /></span>
                  <div><p className="font-semibold">{role}</p><p className="mt-1 text-sm text-muted-foreground">{text}</p></div>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col justify-center rounded-2xl bg-sidebar p-8 text-sidebar-foreground sm:p-10">
            <ShieldCheck className="size-8 text-sidebar-primary" aria-hidden="true" />
            <h2 className="mt-5 font-display text-2xl font-bold">Patient records stay inside the clinic</h2>
            <p className="mt-4 leading-7 text-sidebar-foreground/75">
              The staff workspace is only open to verified admins, doctors and receptionists. Every record is limited to the clinic it belongs to, and every change is checked by the database before it's saved.
            </p>
            <Button asChild variant="secondary" className="mt-8 w-fit gap-2">
              <Link to="/staff-login">Go to staff sign in<ArrowRight className="size-4" aria-hidden="true" /></Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>© {new Date().getFullYear()} CarePulse · Smart community clinic</span>
          <span>Patients: download the CarePulse mobile app to book and check in.</span>
        </div>
      </footer>
    </div>
  );
}
