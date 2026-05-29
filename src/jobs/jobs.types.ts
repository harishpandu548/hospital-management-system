export type JobType =
  | "APPOINTMENT_CREATED"
  | "APPOINTMENT_CANCELLED"
  | "APPOINTMENT_REMINDER"
  | "CONSULTATION_REMINDER"
  | "SLOT_LOCK_CLEANUP";

export interface JobPayloadMap {
  APPOINTMENT_CREATED: { appointmentId: string };
  APPOINTMENT_CANCELLED: { appointmentId: string };
  APPOINTMENT_REMINDER: {
    appointmentId: string;
    reminderType: "T_24H" | "T_2H";
  };
  CONSULTATION_REMINDER: {
    roomId: string;
    minutesBefore: number;
  };
  SLOT_LOCK_CLEANUP: Record<string, never>;
}
