import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await getAuthContext(req);
    const { id } = await context.params;

    const doctor = await prisma.doctor.findFirst({
      where: { id, deletedAt: null },
      include: {
        availabilityRules: {
          where: { deletedAt: null },
          orderBy: { dayOfWeek: "asc" },
        },
      },
    });

    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    return NextResponse.json(doctor);
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

    if (activeRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const { isActive, adminPassword } = body;

    if (isActive === undefined || !adminPassword) {
      return NextResponse.json(
        { error: "isActive and adminPassword are required" },
        { status: 400 },
      );
    }

    // Verify admin password
    const admin = await prisma.user.findUnique({ where: { id: userId } });
    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    const passwordOk = await bcrypt.compare(adminPassword, admin.password);
    if (!passwordOk) {
      return NextResponse.json(
        { error: "Incorrect admin password" },
        { status: 403 },
      );
    }

    const updated = await prisma.doctor.update({
      where: { id },
      data: { isActive },
      select: { id: true, fullname: true, isActive: true },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
