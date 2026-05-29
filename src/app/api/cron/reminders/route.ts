/**
 * GET /api/cron/reminders
 * Processes due consultation reminders stored in Redis sorted set.
 * Call this endpoint every minute via Vercel Cron or an external scheduler.
 * Schedule in vercel.json: { "path": "/api/cron/reminders", "schedule": "* * * * *" }
 */
import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";

const CRON_SECRET = process.env.CRON_SECRET ?? "hms-cron-secret";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();

  // Pull all reminders due up to now (score <= now)
  // Upstash Redis uses zrange with BYSCORE option
  const due: string[] = await redis.zrange(
    "hms:consult-reminders",
    0,
    now,
    { byScore: true },
  );

  if (!due.length) return NextResponse.json({ processed: 0 });

  // Remove processed items
  await redis.zremrangebyscore("hms:consult-reminders", 0, now);

  let processed = 0;

  for (const raw of due) {
    try {
      const { roomId, minutesBefore } = JSON.parse(raw);

      const room = await prisma.consultationRoom.findUnique({
        where: { id: roomId },
        include: {
          patient: { select: { firstName: true, lastName: true, phone: true } },
          doctor: { select: { fullname: true, specialization: true } },
          slot: { select: { startTime: true } },
        },
      });

      if (!room || room.status === "ENDED" || room.status === "DECLINED") continue;

      // Store in-app notification for both parties in Redis lists
      const timeLabel = minutesBefore === 5 ? "5 minutes" : "30 minutes";
      const callTime = room.slot?.startTime
        ? new Date(room.slot.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "your scheduled time";

      const patientNotif = JSON.stringify({
        id: `${roomId}-p-${minutesBefore}`,
        type: "CONSULTATION_REMINDER",
        message: `Your video call with Dr. ${room.doctor.fullname} starts in ${timeLabel} at ${callTime}.`,
        roomId,
        createdAt: new Date().toISOString(),
        read: false,
      });

      const doctorNotif = JSON.stringify({
        id: `${roomId}-d-${minutesBefore}`,
        type: "CONSULTATION_REMINDER",
        message: `Video call with ${room.patient.firstName} ${room.patient.lastName} starts in ${timeLabel} at ${callTime}.`,
        roomId,
        createdAt: new Date().toISOString(),
        read: false,
      });

      // Push to patient/doctor notification queues (capped at 20)
      await redis.lpush(`hms:notif:patient:${room.patientId}`, patientNotif);
      await redis.ltrim(`hms:notif:patient:${room.patientId}`, 0, 19);

      await redis.lpush(`hms:notif:doctor:${room.doctorId}`, doctorNotif);
      await redis.ltrim(`hms:notif:doctor:${room.doctorId}`, 0, 19);

      processed++;
    } catch {
      // Skip malformed entries
    }
  }

  return NextResponse.json({ processed });
}
