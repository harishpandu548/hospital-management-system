import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";

async function resolveRoom(id: string, userId: string, activeRole: string) {
  const room = await prisma.consultationRoom.findUnique({
    where: { id },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, relation: true, userId: true } },
      doctor: { select: { id: true, fullname: true, specialization: true, userId: true } },
    },
  });
  if (!room) return null;

  if (activeRole === "PATIENT" && room.patient.userId !== userId) return null;
  if (activeRole === "DOCTOR" && room.doctor.userId !== userId) return null;

  return room;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { userId, activeRole } = await getAuthContext(req);
    const { id } = await context.params;

    const room = await resolveRoom(id, userId, activeRole);
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    return NextResponse.json(room);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { userId, activeRole } = await getAuthContext(req);
    const { id } = await context.params;
    const body = await req.json();
    const { status } = body;

    const room = await resolveRoom(id, userId, activeRole);
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const allowedTransitions: Record<string, string[]> = {
      DOCTOR: ["ACTIVE", "DECLINED", "ENDED"],
      PATIENT: ["ENDED"],
    };

    const allowed = allowedTransitions[activeRole] ?? [];
    if (!allowed.includes(status)) {
      return NextResponse.json({ error: "Invalid status transition" }, { status: 400 });
    }

    const updated = await prisma.consultationRoom.update({
      where: { id },
      data: {
        status,
        ...(status === "ENDED" ? { endedAt: new Date() } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
