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

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { userId, activeRole } = await getAuthContext(req);
    const { id: roomId } = await context.params;
    const { searchParams } = new URL(req.url);
    const afterId = searchParams.get("afterId") ?? undefined;

    const room = await verifyAccess(roomId, userId, activeRole);
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const messages = await prisma.chatMessage.findMany({
      where: {
        roomId,
        ...(afterId ? { id: { gt: afterId } } : {}),
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    return NextResponse.json(messages);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

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

    if (room.status === "ENDED" || room.status === "DECLINED") {
      return NextResponse.json({ error: "Consultation has ended" }, { status: 400 });
    }

    const { content, fileUrl, fileName, fileType } = body;
    if (!content && !fileUrl) {
      return NextResponse.json({ error: "Message must have content or a file" }, { status: 400 });
    }

    const message = await prisma.chatMessage.create({
      data: { roomId, senderId: userId, senderRole: activeRole, content, fileUrl, fileName, fileType },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
