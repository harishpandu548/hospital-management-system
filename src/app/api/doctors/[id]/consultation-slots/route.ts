import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await getAuthContext(req);
    const { id: doctorId } = await context.params;
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");

    const where: any = {
      doctorId,
      isBooked: false,
      slotDate: { gte: new Date() },
    };

    if (dateStr) {
      const day = new Date(dateStr);
      const dayEnd = new Date(dateStr);
      dayEnd.setUTCHours(23, 59, 59, 999);
      where.slotDate = { gte: day, lte: dayEnd };
    }

    const slots = await prisma.consultationSlot.findMany({
      where,
      orderBy: [{ slotDate: "asc" }, { startTime: "asc" }],
    });

    return NextResponse.json(slots);
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
    const { id: doctorId } = await context.params;

    // Only the doctor themselves or admin can create slots
    if (activeRole === "DOCTOR") {
      const doctor = await prisma.doctor.findFirst({ where: { userId } });
      if (!doctor || doctor.id !== doctorId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (activeRole !== "ADMIN" && activeRole !== "RECEPTIONIST") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { slots } = body; // Array of { slotDate, startTime, endTime }

    if (!Array.isArray(slots) || slots.length === 0) {
      return NextResponse.json({ error: "slots array is required" }, { status: 400 });
    }

    const created = await prisma.consultationSlot.createMany({
      data: slots.map((s: any) => ({
        doctorId,
        slotDate: new Date(s.slotDate),
        startTime: new Date(s.startTime),
        endTime: new Date(s.endTime),
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({ created: created.count }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
