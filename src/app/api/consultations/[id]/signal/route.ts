import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";

async function verifyAccess(roomId: string, userId: string, activeRole: string) {
  const room = await prisma.consultationRoom.findUnique({
    where: { id: roomId },
    include: {
      patient: { select: { userId: true } },
      doctor: { select: { userId: true } },
    },
  });
  if (!room) return null;
  if (activeRole === "PATIENT" && room.patient.userId !== userId) return null;
  if (activeRole === "DOCTOR" && room.doctor.userId !== userId) return null;
  return room;
}

// Poll for new signals sent by the other party
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { userId, activeRole } = await getAuthContext(req);
    const { id: roomId } = await context.params;
    const { searchParams } = new URL(req.url);
    const lastId = searchParams.get("lastId") ?? undefined;

    const room = await verifyAccess(roomId, userId, activeRole);
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    // Return signals from the OTHER party that arrived after lastId
    const signals = await prisma.webRTCSignal.findMany({
      where: {
        roomId,
        fromRole: { not: activeRole }, // only signals FROM the other side
        ...(lastId ? { id: { gt: lastId } } : {}),
      },
      orderBy: { createdAt: "asc" },
      take: 50,
    });

    return NextResponse.json(signals);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

// Send a WebRTC signal
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { userId, activeRole } = await getAuthContext(req);
    const { id: roomId } = await context.params;
    const body = await req.json();

    const room = await verifyAccess(roomId, userId, activeRole);
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const { type, payload } = body;
    if (!type || !payload) {
      return NextResponse.json({ error: "type and payload are required" }, { status: 400 });
    }

    const signal = await prisma.webRTCSignal.create({
      data: { roomId, fromRole: activeRole, type, payload: JSON.stringify(payload) },
    });

    return NextResponse.json(signal, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
