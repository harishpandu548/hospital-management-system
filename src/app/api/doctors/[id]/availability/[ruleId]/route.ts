import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { assertPermission } from "@/modules/appointments/appointment.permissions";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string; ruleId: string }> }
) {
  try {
    const { userId, activeRole } = await getAuthContext(req);

    await assertPermission(userId, activeRole, "AVAILABILITY_MANAGE");

    const { id: doctorId, ruleId } = await context.params;

    const rule = await prisma.doctorAvailabilityRule.findUnique({
      where: { id: ruleId }
    });

    if (!rule || rule.doctorId !== doctorId) {
      return NextResponse.json(
        { error: "Availability rule not found" },
        { status: 404 }
      );
    }

    await prisma.doctorAvailabilityRule.update({
      where: { id: ruleId },
      data: { deletedAt: new Date() }
    });

    return NextResponse.json({ message: "Availability rule deleted" });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}
