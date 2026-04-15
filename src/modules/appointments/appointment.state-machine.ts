import { AppointmentStatus } from "@prisma/client";

// allowed state transitions for appointments (like consider example if appointment is created it can go to scheduled or cancel but it cannot go to completed directly after created )
export const APPOINTMENT_STATE_TRANSITIONS: Record<
  AppointmentStatus,
  AppointmentStatus[]
> = {
  CREATED: ["SCHEDULED", "CANCELLED"],
  SCHEDULED: ["CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CHECKED_IN: ["IN_PROGRESS"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export function isValidTransition(
    from:AppointmentStatus,
    to:AppointmentStatus
):boolean{
    return APPOINTMENT_STATE_TRANSITIONS[from].includes(to)
}