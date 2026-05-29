/**
 * Doctor real-time availability for instant consultations.
 * GET  → returns {available: boolean} for current doctor (DOCTOR role)
 *         or list of available doctor IDs (PATIENT role)
 * POST → toggles/sets availability (DOCTOR role only)
 */
import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const AVAIL_TTL = 30 * 60; // 30 minutes

function availKey(doctorId: string) {
  return `hms:doctor:available:${doctorId}`;
}

export async function GET(req: NextRequest) {
  try {
    const { userId, activeRole } = await getAuthContext(req);

    if (activeRole === "DOCTOR") {
      const doctor = await prisma.doctor.findFirst({ where: { userId }, select: { id: true } });
      if (!doctor) return NextResponse.json({ available: false });
      const val = await redis.get(availKey(doctor.id));
      return NextResponse.json({ available: !!val, doctorId: doctor.id });
    }

    if (activeRole === "PATIENT") {
      // Return all currently available doctor IDs
      const doctors = await prisma.doctor.findMany({
        where: { isActive: true, deletedAt: null },
        select: { id: true },
      });
      const checks = await Promise.all(
        doctors.map(async (d) => ({
          id: d.id,
          available: !!(await redis.get(availKey(d.id))),
        }))
      );
      const availableIds = checks.filter((c) => c.available).map((c) => c.id);
      return NextResponse.json({ availableIds });
    }

    return NextResponse.json({ availableIds: [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, activeRole } = await getAuthContext(req);
    if (activeRole !== "DOCTOR") {
      return NextResponse.json({ error: "Doctors only" }, { status: 403 });
    }

    const doctor = await prisma.doctor.findFirst({ where: { userId }, select: { id: true } });
    if (!doctor) return NextResponse.json({ error: "Doctor profile not found" }, { status: 404 });

    const body = await req.json();
    const available: boolean = body.available ?? true;

    if (available) {
      await redis.set(availKey(doctor.id), "1", { ex: AVAIL_TTL });
    } else {
      await redis.del(availKey(doctor.id));
    }

    return NextResponse.json({ available, doctorId: doctor.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
