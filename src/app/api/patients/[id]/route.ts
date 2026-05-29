import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { userId, activeRole } = await getAuthContext(req);
    const { id: patientId } = await context.params;

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient || patient.deletedAt) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    if (activeRole === "PATIENT" && patient.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (activeRole !== "PATIENT" && activeRole !== "ADMIN" && activeRole !== "RECEPTIONIST") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      firstName, lastName, gender, dateOfBirth,
      phone, email, address, city, state,
      medicalNotes, medicalFiles, bloodGroup, weightKg, heightCm,
    } = body;

    const updated = await prisma.patient.update({
      where: { id: patientId },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(gender !== undefined && { gender }),
        ...(dateOfBirth !== undefined && { dateOfBirth: new Date(dateOfBirth) }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(medicalNotes !== undefined && { medicalNotes }),
        ...(medicalFiles !== undefined && { medicalFiles }),
        ...(bloodGroup !== undefined && { bloodGroup }),
        ...(weightKg !== undefined && { weightKg: weightKg ? parseFloat(weightKg) : null }),
        ...(heightCm !== undefined && { heightCm: heightCm ? parseFloat(heightCm) : null }),
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { userId, activeRole } = await getAuthContext(req);
    const { id: patientId } = await context.params;

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
