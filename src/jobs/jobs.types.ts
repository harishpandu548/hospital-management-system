// "|" meaning union type - it says a job can only be any of this 3 strings
export type JobType =
  | "APPOINTMENT_CREATED"
  | "APPOINTMENT_CANCELLED"
  | "APPOINTMENT_REMINDER"
  | "SLOT_LOCK_CLEANUP";

//what data does each job needs
export interface JobPayloadMap {
  //job 1 meaning when an appointment is created the job only needs appointment id
  APPOINTMENT_CREATED: {
    appointmentId: string;
  };
  APPOINTMENT_CANCELLED:{
    appointmentId:string;
  }
  APPOINTMENT_REMINDER: {
    appointmentId: string;
    reminderType: "T_24H" | "T_2H"; //24 hours before or 2 hours before
  };
  SLOT_LOCK_CLEANUP: Record<string, never>;
}
