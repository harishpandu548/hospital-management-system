import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { userId, activeRole } = await getAuthContext(req);

    let key: string;

    if (activeRole === "PATIENT") {
      const patient = await prisma.patient.findFirst({
        where: { userId, deletedAt: null },
        select: { id: true },
      });
      if (!patient) return NextResponse.json([]);
      key = `hms:notif:patient:${patient.id}`;
    } else if (activeRole === "DOCTOR") {
      const doctor = await prisma.doctor.findFirst({
        where: { userId },
        select: { id: true },
      });
      if (!doctor) return NextResponse.json([]);
      key = `hms:notif:doctor:${doctor.id}`;
    } else {
      return NextResponse.json([]);
    }

    const raw: string[] = await redis.lrange(key, 0, 19);
    const notifications = raw.map((r) => {
      try { return JSON.parse(r); } catch { return null; }
    }).filter(Boolean);

    return NextResponse.json(notifications);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

// Mark notification as read (clear it from list)
export async function DELETE(req: NextRequest) {
  try {
    const { userId, activeRole } = await getAuthContext(req);
    const body = await req.json();
    const { id } = body;

    let key: string;
    if (activeRole === "PATIENT") {
      const patient = await prisma.patient.findFirst({ where: { userId }, select: { id: true } });
      if (!patient) return NextResponse.json({ ok: true });
      key = `hms:notif:patient:${patient.id}`;
    } else if (activeRole === "DOCTOR") {
      const doctor = await prisma.doctor.findFirst({ where: { userId }, select: { id: true } });
      if (!doctor) return NextResponse.json({ ok: true });
      key = `hms:notif:doctor:${doctor.id}`;
    } else {
      return NextResponse.json({ ok: true });
    }

    // Remove the specific notification by id
    const raw: string[] = await redis.lrange(key, 0, 19);
    for (const r of raw) {
      try {
        const n = JSON.parse(r);
        if (n.id === id) {
          await redis.lrem(key, 1, r);
          break;
        }
      } catch { /**/ }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
