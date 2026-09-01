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
  // Separate auth check so we can return 401 specifically for auth failures
  let authCtx: { userId: string; activeRole: string };
  try {
    authCtx = await getAuthContext(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { userId, activeRole } = authCtx;
    const body = await req.json();

    console.log("[POST /api/appointments] body received:", JSON.stringify(body));

    let patientId = body.patientId;

    if (activeRole === "PATIENT") {
      if (patientId) {
        // Verify the provided patientId belongs to this user (self or family member)
        const ownedPatient = await prisma.patient.findFirst({
          where: { id: patientId, userId, deletedAt: null },
        });
        if (!ownedPatient) {
          console.log("[POST /api/appointments] 403: patientId not owned by user");
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
            console.log("[POST /api/appointments] 404: no patient profile found");
            return NextResponse.json({ error: "Patient profile not found. Please complete your profile first." }, { status: 404 });
          }
          patientId = anyPatient.id;
        } else {
          patientId = patient.id;
        }
      }
    }

    console.log("[POST /api/appointments] resolved patientId:", patientId, "| doctorId:", body.doctorId);

    if (!patientId) return NextResponse.json({ error: "patientId is required" }, { status: 400 });
    if (!body.doctorId) return NextResponse.json({ error: "doctorId is required" }, { status: 400 });
    if (!body.appointmentDate) return NextResponse.json({ error: "appointmentDate is required" }, { status: 400 });

    const appointmentDate = new Date(body.appointmentDate);
    const slotStart = body.slotStart ? new Date(body.slotStart) : appointmentDate;
    const slotEnd = body.slotEnd
      ? new Date(body.slotEnd)
      : new Date(slotStart.getTime() + 30 * 60000);

    // Validate parsed dates
    if (isNaN(appointmentDate.getTime()) || isNaN(slotStart.getTime()) || isNaN(slotEnd.getTime())) {
      return NextResponse.json({ error: "Invalid date format provided." }, { status: 400 });
    }

    // 1. Reject past slots (use slotStart for comparison, with a small 10s grace period)
    const now = new Date();
    console.log("[POST /api/appointments] slotStart:", slotStart.toISOString(), "| now:", now.toISOString());
    if (slotStart.getTime() <= now.getTime() - 10_000) {
      console.log("[POST /api/appointments] 400: slot is in the past");
      return NextResponse.json({ error: "Cannot book an appointment in the past." }, { status: 400 });
    }

    // 2. Doctor must have an availability rule for this day
    // appointmentDate is a full ISO timestamp — derive UTC day from it
    const dayStart = new Date(appointmentDate);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayOfWeek = dayStart.getUTCDay();

    console.log("[POST /api/appointments] dayStart:", dayStart.toISOString(), "| dayOfWeek:", dayOfWeek, "| doctorId:", body.doctorId);

    const rule = await prisma.doctorAvailabilityRule.findFirst({
      where: {
        doctorId: body.doctorId,
        deletedAt: null,
        dayOfWeek,
        validFrom: { lte: dayStart },
        OR: [{ validTo: null }, { validTo: { gte: dayStart } }],
      },
    });

    console.log("[POST /api/appointments] rule found:", rule ? rule.id : "NONE (no rule matched)");

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

    console.log("[POST /api/appointments] ruleStart:", ruleStart.toISOString(), "| ruleEnd:", ruleEnd.toISOString(), "| slotStart:", slotStart.toISOString(), "| slotEnd:", slotEnd.toISOString());

    if (slotStart < ruleStart || slotEnd > ruleEnd) {
      console.log("[POST /api/appointments] 400: slot outside working hours");
      return NextResponse.json({
        error: `Selected time slot is outside the doctor's working hours (${ruleStart.toISOString()} – ${ruleEnd.toISOString()}).`,
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
    console.error("[POST /api/appointments] Unexpected error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
