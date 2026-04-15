import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { assertPermission } from "@/modules/appointments/appointment.permissions";
import { z } from "zod";

const AvailabilitySchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  slotDurationMinutes: z.number().min(5),
  maxPatientsPerSlot: z.number().min(1),
  validFrom: z.coerce.date(),
  validTo: z.coerce.date().optional()
});

export async function POST(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { userId, activeRole } = await getAuthContext(req);

    await assertPermission(userId, activeRole, "AVAILABILITY_MANAGE");

    const doctorId = context.params.id;

    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId }
    });

    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    const body = await req.json();
    const data = AvailabilitySchema.parse(body);

    if (data.startTime >= data.endTime) {
      return NextResponse.json(
        { error: "startTime must be before endTime" },
        { status: 400 }
      );
    }

    const rule = await prisma.doctorAvailabilityRule.create({
      data: {
        doctorId,
        ...data,
        createdBy: userId
      }
    });

    return NextResponse.json(rule, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}


export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { userId, activeRole } = await getAuthContext(req);

    await assertPermission(userId, activeRole, "AVAILABILITY_MANAGE");

    const doctorId = context.params.id;

    const rules = await prisma.doctorAvailabilityRule.findMany({
      where: {
        doctorId,
        deletedAt: null
      },
      orderBy: {
        dayOfWeek: "asc"
      }
    });

    return NextResponse.json(rules);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}
