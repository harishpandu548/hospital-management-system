import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  context: { params: { id: string } },
) {
  try {
    const { userId, activeRole } = await getAuthContext(req);
    const patientId = context.params.id;

    // load patient
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        appointments: {
          orderBy: { appointmentDate: "desc" },
        },
      },
    });

    if (!patient || patient.deletedAt) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // role based visibility enforcement

    // ADMIN and RECEPTIONIST are allowed
    if (activeRole === "ADMIN" || activeRole === "RECEPTIONIST") {
      return NextResponse.json(patient);
    }

    // PATIENT  only self
    if (activeRole === "PATIENT") {
      if (patient.userId !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.json(patient);
    }

    // DOCTOR  only if appointment exists with this doctor
    if (activeRole === "DOCTOR") {
      const doctor = await prisma.doctor.findFirst({
        where: { userId },
        select: { id: true },
      });

      if (!doctor) {
        return NextResponse.json(
          { error: "Doctor profile not found" },
          { status: 403 },
        );
      }

      const hasAccess = await prisma.appointment.findFirst({
        where: {
          patientId,
          doctorId: doctor.id,
        },
      });

      if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      return NextResponse.json(patient);
    }

    return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}
