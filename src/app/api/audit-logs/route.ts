import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { assertPermission } from "@/modules/appointments/appointment.permissions";

export async function GET(req: NextRequest) {
  try {
    const { userId, activeRole } = await getAuthContext(req);

    await assertPermission(userId, activeRole, "AUDIT_VIEW");

    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return NextResponse.json(logs);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
}
