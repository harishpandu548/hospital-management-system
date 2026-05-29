import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { enqueueJob } from "@/jobs/queue";

export async function GET(req: NextRequest) {
  try {
    const { userId, activeRole } = await getAuthContext(req);

    let appointments;

    if (activeRole === "ADMIN" || activeRole === "RECEPTIONIST") {
      appointments = await prisma.appointment.findMany({
        where: { deletedAt: null },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, dateOfBirth: true, medicalNotes: true, medicalFiles: true, phone: true, userId: true, relation: true, bloodGroup: true, gender: true, heightCm: true, weightKg: true } as any },
          doctor: { select: { id: true, fullname: true, specialization: true } },
        },
        orderBy: { appointmentDate: "desc" },
      });
    } else if (activeRole === "PATIENT") {
      // Get ALL patient profiles linked to this user (self + family members)
      const patients = await prisma.patient.findMany({
        where: { userId, deletedAt: null },
        select: { id: true },
      });
      if (patients.length === 0) {
        return NextResponse.json({ error: "Patient not found" }, { status: 404 });
      }
      const patientIds = patients.map((p) => p.id);
      appointments = await prisma.appointment.findMany({
        where: { patientId: { in: patientIds }, deletedAt: null },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, relation: true, medicalNotes: true } },
          doctor: { select: { id: true, fullname: true, specialization: true } },
        },
        orderBy: { appointmentDate: "desc" },
      });
    } else if (activeRole === "DOCTOR") {
      const doctor = await prisma.doctor.findFirst({ where: { userId } });
      if (!doctor) return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
      appointments = await prisma.appointment.findMany({
        where: { doctorId: doctor.id, deletedAt: null },
        include: { patient: { select: { id: true, firstName: true, lastName: true, dateOfBirth: true, medicalNotes: true, medicalFiles: true, phone: true, relation: true, bloodGroup: true, gender: true, heightCm: true, weightKg: true } as any } },
        orderBy: { appointmentDate: "desc" },
      });
    } else {
      return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });
    }

    return NextResponse.json(appointments);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, activeRole } = await getAuthContext(req);
    const body = await req.json();

    let patientId = body.patientId;

    if (activeRole === "PATIENT") {
      if (patientId) {
        // Verify the provided patientId belongs to this user (self or family member)
        const ownedPatient = await prisma.patient.findFirst({
          where: { id: patientId, userId, deletedAt: null },
        });
        if (!ownedPatient) {
          return NextResponse.json({ error: "Invalid patient profile selected." }, { status: 403 });
        }
      } else {
        // Default to primary (SELF) patient profile
        const patient = await prisma.patient.findFirst({
          where: { userId, relation: "SELF", deletedAt: null },
        });
        if (!patient) {
          // Fall back to any patient profile linked to this user
          const anyPatient = await prisma.patient.findFirst({ where: { userId, deletedAt: null } });
          if (!anyPatient) {
            return NextResponse.json({ error: "Patient profile not found. Please complete your profile first." }, { status: 404 });
          }
          patientId = anyPatient.id;
        } else {
          patientId = patient.id;
        }
      }
    }

    if (!patientId) return NextResponse.json({ error: "patientId is required" }, { status: 400 });
    if (!body.doctorId) return NextResponse.json({ error: "doctorId is required" }, { status: 400 });
    if (!body.appointmentDate) return NextResponse.json({ error: "appointmentDate is required" }, { status: 400 });

    const appointmentDate = new Date(body.appointmentDate);
    const slotStart = body.slotStart ? new Date(body.slotStart) : appointmentDate;
    const slotEnd = body.slotEnd
      ? new Date(body.slotEnd)
      : new Date(slotStart.getTime() + 30 * 60000);

    // 1. Reject past slots
    if (slotStart <= new Date()) {
      return NextResponse.json({ error: "Cannot book an appointment in the past." }, { status: 400 });
    }

    // 2. Doctor must have an availability rule for this day
    const dayOfWeek = appointmentDate.getUTCDay();
    const dayStart = new Date(appointmentDate);
    dayStart.setUTCHours(0, 0, 0, 0);

    const rule = await prisma.doctorAvailabilityRule.findFirst({
      where: {
        doctorId: body.doctorId,
        deletedAt: null,
        dayOfWeek,
        validFrom: { lte: dayStart },
        OR: [{ validTo: null }, { validTo: { gte: dayStart } }],
      },
    });

    if (!rule) {
      return NextResponse.json({
        error: "This doctor is not available on the selected date. Please choose a different date.",
      }, { status: 400 });
    }

    // 3. Slot must fall within rule hours
    const ruleStart = new Date(dayStart);
    ruleStart.setUTCHours(rule.startTime.getUTCHours(), rule.startTime.getUTCMinutes(), 0, 0);
    const ruleEnd = new Date(dayStart);
    ruleEnd.setUTCHours(rule.endTime.getUTCHours(), rule.endTime.getUTCMinutes(), 0, 0);

    if (slotStart < ruleStart || slotEnd > ruleEnd) {
      return NextResponse.json({
        error: "Selected time slot is outside the doctor's working hours.",
      }, { status: 400 });
    }

    // 4. Slot must not be over capacity
    const existingCount = await prisma.appointment.count({
      where: {
        doctorId: body.doctorId,
        slotStart,
        deletedAt: null,
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      },
    });

    if (existingCount >= rule.maxPatientsPerSlot) {
      return NextResponse.json({
        error: "This time slot is fully booked. Please select another slot.",
      }, { status: 400 });
    }

    const appointment = await prisma.$transaction(async (tx) => {
      const appt = await tx.appointment.create({
        data: {
          patientId,
          doctorId: body.doctorId,
          appointmentDate,
          slotStart,
          slotEnd,
          status: "SCHEDULED",
          createdBy: userId,
        },
      });

      await tx.appointmentStatusLog.create({
        data: {
          appointmentId: appt.id,
          oldStatus: null,
          newStatus: "SCHEDULED",
          changedBy: userId,
          changedByRole: activeRole,
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: "APPOINTMENT",
          entityId: appt.id,
          action: "CREATE",
          performedBy: userId,
        },
      });

      return appt;
    });

    try {
      await enqueueJob("APPOINTMENT_CREATED", { appointmentId: appointment.id });
    } catch {
      // Redis unavailable — appointment is still created successfully
    }

    return NextResponse.json(appointment, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
