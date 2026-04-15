import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { userId, activeRole } = await getAuthContext(req);
    const appointmentId = context.params.id;

    // 1️⃣ Load appointment with relations
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        doctor: true,
        statusLogs: {
          orderBy: { changedAt: "desc" }
        }
      }
    });

    if (!appointment || appointment.deletedAt) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    //  role based access enforcement

    // ADMIN and  RECEPTIONIST full access
    if (activeRole === "ADMIN" || activeRole === "RECEPTIONIST") {
      return NextResponse.json(appointment);
    }

    // DOCTOR must match doctor.userId
    if (activeRole === "DOCTOR") {
      const doctor = await prisma.doctor.findFirst({
        where: { userId },
        select: { id: true }
      });

      if (!doctor || doctor.id !== appointment.doctorId) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }

      return NextResponse.json(appointment);
    }

    // PATIENT  must match patient.userId
    if (activeRole === "PATIENT") {
      if (appointment.patient.userId !== userId) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }

      return NextResponse.json(appointment);
    }

    return NextResponse.json(
      { error: "Unauthorized role" },
      { status: 403 }
    );

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 401 }
    );
  }
}
