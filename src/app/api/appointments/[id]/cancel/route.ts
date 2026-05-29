import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { AppointmentStatus } from "@prisma/client";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, activeRole } = await getAuthContext(req);
    const { id: appointmentId } = await context.params;

    let reason: string | undefined;
    try {
      const body = await req.json();
      reason = body?.reason;
    } catch {
      // No body or invalid JSON — reason is optional
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: true }
    });

    if (!appointment || appointment.deletedAt) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (
      appointment.status === AppointmentStatus.CANCELLED ||
      appointment.status === AppointmentStatus.COMPLETED
    ) {
      return NextResponse.json(
        { error: "Cannot cancel finalized appointment" },
        { status: 400 }
      );
    }

    // role enforcement
    if (activeRole === "DOCTOR") {
      const doctor = await prisma.doctor.findFirst({
        where: { userId },
        select: { id: true }
      });
      if (!doctor || doctor.id !== appointment.doctorId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (activeRole === "PATIENT") {
      if (appointment.patient.userId !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    await prisma.$transaction(async (tx) => {

      await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: AppointmentStatus.CANCELLED }
      });

      await tx.appointmentStatusLog.create({
        data: {
          appointmentId,
          oldStatus: appointment.status,
          newStatus: AppointmentStatus.CANCELLED,
          changedBy: userId,
          changedByRole: activeRole,
          reason
        }
      });

      await tx.auditLog.create({
        data: {
          performedBy: userId,
          action: "APPOINTMENT_CANCELLED",
          entityType: "Appointment",
          entityId: appointmentId
        }
      });

    });

    return NextResponse.json({ message: "Appointment cancelled" });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

