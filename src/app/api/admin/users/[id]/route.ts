import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import bcrypt from "bcryptjs";

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
    const { status, adminPassword } = body;

    if (!status || !adminPassword) {
      return NextResponse.json(
        { error: "status and adminPassword are required" },
        { status: 400 },
      );
    }

    if (!["ACTIVE", "SUSPENDED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
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

    // Prevent self-suspension
    if (id === userId && status === "SUSPENDED") {
      return NextResponse.json(
        { error: "Cannot suspend your own account" },
        { status: 400 },
      );
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { status },
      select: { id: true, phone: true, status: true },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    const msg: string = error.message ?? "Request failed";
    if (msg.includes("Unauthorized") || msg.includes("UNAUTHORIZED")) {
      return NextResponse.json({ error: "Please log in" }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
