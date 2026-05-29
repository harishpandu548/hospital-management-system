import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { redis } from "@/lib/redis";
import { nanoid } from "nanoid";

const SLOT_LOCK_TTL = 30; // seconds

export async function GET(req: NextRequest) {
  try {
    const { userId, activeRole } = await getAuthContext(req);

    if (activeRole === "PATIENT") {
      const patients = await prisma.patient.findMany({
        where: { userId, deletedAt: null },
        select: { id: true },
      });
      const patientIds = patients.map((p) => p.id);

      const rooms = await prisma.consultationRoom.findMany({
        where: { patientId: { in: patientIds } },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, relation: true, medicalNotes: true, medicalFiles: true, bloodGroup: true, gender: true, dateOfBirth: true, heightCm: true, weightKg: true } as any },
          doctor: { select: { id: true, fullname: true, specialization: true } },
          slot: { select: { slotDate: true, startTime: true, endTime: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(rooms);
    }

    if (activeRole === "DOCTOR") {
      const doctor = await prisma.doctor.findFirst({ where: { userId } });
      if (!doctor) return NextResponse.json({ error: "Doctor not found" }, { status: 404 });

      const rooms = await prisma.consultationRoom.findMany({
        where: { doctorId: doctor.id },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, phone: true, relation: true, medicalNotes: true, medicalFiles: true, bloodGroup: true, gender: true, dateOfBirth: true, heightCm: true, weightKg: true } as any },
          doctor: { select: { id: true, fullname: true, specialization: true } },
          slot: { select: { slotDate: true, startTime: true, endTime: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(rooms);
    }

    if (activeRole === "ADMIN" || activeRole === "RECEPTIONIST") {
      const rooms = await prisma.consultationRoom.findMany({
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, relation: true, medicalNotes: true, medicalFiles: true, bloodGroup: true, gender: true, dateOfBirth: true, heightCm: true, weightKg: true } as any },
          doctor: { select: { id: true, fullname: true, specialization: true } },
          slot: { select: { slotDate: true, startTime: true, endTime: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return NextResponse.json(rooms);
    }

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, activeRole } = await getAuthContext(req);
    if (activeRole !== "PATIENT") {
      return NextResponse.json({ error: "Only patients can initiate consultations" }, { status: 403 });
    }

    const body = await req.json();
    const { doctorId, patientId, slotId } = body;

    if (!doctorId) return NextResponse.json({ error: "doctorId is required" }, { status: 400 });

    const doctor = await prisma.doctor.findFirst({
      where: { id: doctorId, isActive: true, deletedAt: null },
    });
    if (!doctor) return NextResponse.json({ error: "Doctor not found or not available" }, { status: 404 });

    // Resolve patient profile
    let resolvedPatientId = patientId;
    if (resolvedPatientId) {
      const owned = await prisma.patient.findFirst({
        where: { id: resolvedPatientId, userId, deletedAt: null },
      });
      if (!owned) return NextResponse.json({ error: "Invalid patient profile" }, { status: 403 });
    } else {
      const patient = await prisma.patient.findFirst({
        where: { userId, deletedAt: null },
        orderBy: { relation: "asc" },
      });
      if (!patient) return NextResponse.json({ error: "Patient profile not found" }, { status: 404 });
      resolvedPatientId = patient.id;
    }

    // If a specific slot was requested — lock it atomically
    let resolvedSlotId: string | undefined;
    if (slotId) {
      const lockKey = `consult-slot-lock:${slotId}`;
      const locked = await redis.set(lockKey, userId, { ex: SLOT_LOCK_TTL, nx: true });
      if (!locked) {
        return NextResponse.json({ error: "This slot is being booked by someone else. Please try another." }, { status: 409 });
      }

      const slot = await prisma.consultationSlot.findUnique({ where: { id: slotId } });
      if (!slot || slot.isBooked || slot.doctorId !== doctorId) {
        await redis.del(lockKey);
        return NextResponse.json({ error: "Slot is no longer available." }, { status: 409 });
      }
      resolvedSlotId = slotId;
    }

    // Check for existing active/pending room
    const existing = await prisma.consultationRoom.findFirst({
      where: {
        patientId: resolvedPatientId,
        doctorId,
        status: { in: ["PENDING", "ACTIVE"] },
      },
    });
    if (existing) {
      if (resolvedSlotId) await redis.del(`consult-slot-lock:${resolvedSlotId}`);
      return NextResponse.json(existing);
    }

    // Create room + optionally book slot in one transaction
    const room = await prisma.$transaction(async (tx) => {
      const created = await tx.consultationRoom.create({
        data: {
          patientId: resolvedPatientId,
          doctorId,
          roomCode: nanoid(12),
          status: "PENDING",
        },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, relation: true, medicalNotes: true, medicalFiles: true, bloodGroup: true, gender: true, dateOfBirth: true, heightCm: true, weightKg: true } as any },
          doctor: { select: { id: true, fullname: true, specialization: true } },
        },
      });

      if (resolvedSlotId) {
        await tx.consultationSlot.update({
          where: { id: resolvedSlotId },
          data: { isBooked: true, patientId: resolvedPatientId, roomId: created.id },
        });
      }

      return created;
    });

    // Schedule reminders via Redis ZADD if slot booked
    if (resolvedSlotId) {
      const slot = await prisma.consultationSlot.findUnique({ where: { id: resolvedSlotId } });
      if (slot) {
        const callTime = slot.startTime.getTime();
        const remind30 = callTime - 30 * 60 * 1000;
        const remind5  = callTime - 5 * 60 * 1000;
        const now = Date.now();

        const reminders = [
          { score: remind30, value: JSON.stringify({ roomId: room.id, minutesBefore: 30 }) },
          { score: remind5,  value: JSON.stringify({ roomId: room.id, minutesBefore: 5 }) },
        ].filter((r) => r.score > now);

        for (const r of reminders) {
          await redis.zadd("hms:consult-reminders", { score: r.score, member: r.value });
        }
      }

      await redis.del(`consult-slot-lock:${resolvedSlotId}`);
    }

    return NextResponse.json(room, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
