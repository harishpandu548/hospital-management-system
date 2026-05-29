import { prisma } from "@/lib/prisma";
import { acquireSlotLock } from "../slot-lock/slot-lock.service";
import { assertPermission } from "./appointment.permissions";
import {
  createAppointment,
  findAppointmentById,
  findAppointments,
} from "./appointment.repository";
import { AppointmentStatus } from "@prisma/client";
import { AuthContext } from "@/lib/auth";
import { enqueueJob } from "@/jobs/queue";

export interface CreateAppointmentInput {
  readonly patientId: string;
  readonly doctorId: string;
  readonly appointmentDate: Date;
  readonly slotStart: Date;
  readonly slotEnd: Date;
  readonly createdBy: string; // userId
}

export async function createAppointmentService(input: CreateAppointmentInput) {
  //slot lock redis+db
  await acquireSlotLock({
    doctorId: input.doctorId,
    appointmentDate: input.appointmentDate,
    slotStart: input.slotStart,
    slotEnd: input.slotEnd,
    lockedBy: input.createdBy,
  });
  //everything from now on should either gets succeed together or else all should disappear
  //transaction begins
  const appointment=await prisma.$transaction(async (tx: any) => {
    //creating the appointment
    const appointment = await createAppointment(tx, {
      patientId: input.patientId,
      doctorId: input.doctorId,
      appointmentDate: input.appointmentDate,
      slotStart: input.slotStart,
      slotEnd: input.slotEnd,
      createdBy: input.createdBy,
    });
    //create status log
    await tx.AppointmentStatusLog.create({
      data: {
        appointmentId: appointment.id,
        oldStatus: null,
        newStatus: AppointmentStatus.CREATED,
        changedBy: input.createdBy,
        changedByRole: "SYSTEM",
      },
    });
    //audit log
    await tx.auditLog.create({
      data: {
        entityType: "APPOINTMENT",
        entityId: appointment.id,
        action: "CREATE",
        performedBy: input.createdBy,
      },
    });
    return appointment;
  });
  //after db commit we are wiring the job
  await enqueueJob("APPOINTMENT_CREATED",{appointmentId:appointment.id})
  return appointment
}

//get appointment service for this user and role
export async function getAppointmentsService(auth: AuthContext) {
  const { userId, activeRole } = auth;

  const where: any = {
    deletedAt: null,
  };

  if (activeRole === "PATIENT") {
    where.patient = { userId };
  }

  if (activeRole === "DOCTOR") {
    where.doctor = { userId };
  }

  return prisma.$transaction(async (tx: any) => {
    return findAppointments(tx, where);
  });
}

//checks this user is allowed to see this appointment and if allowed decides how much data this user is allowed to see
export async function getAppointmentIdService(
  appointmentId: string,
  auth: AuthContext,
) {
  const { userId, activeRole } = auth;

  return prisma.$transaction(async (tx: any) => {
    const appointment = await findAppointmentById(tx, appointmentId);
    if (!appointment) {
      throw new Error("Appointment not found");
    }

    const isPatient = activeRole === "PATIENT" && appointment.patient?.userId === userId;
    const isDoctor = activeRole === "DOCTOR" && appointment.doctor?.userId === userId;
    const isStaff = activeRole === "RECEPTIONIST" || activeRole === "ADMIN";

    if (!isPatient && !isDoctor && !isStaff) {
      throw new Error("Forbidden");
    }
    if (isStaff) {
      return appointment;
    }
    const { statusLogs, ...filteredData } = appointment;
    return { ...filteredData };
  });
}
