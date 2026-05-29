import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/jwt";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, password, activeRole } = body;

    if (!phone || !password) {
      return NextResponse.json(
        { error: "Phone and password required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { phone },
      include: {
        roles: { include: { role: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (user.status === "SUSPENDED") {
      return NextResponse.json(
        { error: "Account suspended. Please contact the administrator." },
        { status: 403 }
      );
    }
    if (user.status === "DELETED") {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const roles = user.roles.map((r) => r.role.name);
    if (roles.length === 0) {
      return NextResponse.json({ error: "No roles assigned" }, { status: 403 });
    }

    // Resolve the active role for this request
    let resolvedRole: string;
    if (!activeRole) {
      if (roles.length > 1) {
        return NextResponse.json({ message: "Select role", roles });
      }
      resolvedRole = roles[0];
    } else {
      if (!roles.includes(activeRole)) {
        return NextResponse.json({ error: "Invalid role selection" }, { status: 403 });
      }
      resolvedRole = activeRole;
    }

    // Resolve a display name for the user based on their role
    let name: string = phone;
    try {
      if (resolvedRole === "PATIENT") {
        const patient = await prisma.patient.findFirst({
          where: { userId: user.id },
          select: { firstName: true, lastName: true },
        });
        if (patient) name = `${patient.firstName} ${patient.lastName}`;
      } else if (resolvedRole === "DOCTOR") {
        const doctor = await prisma.doctor.findFirst({
          where: { userId: user.id },
          select: { fullname: true },
        });
        if (doctor) name = doctor.fullname;
      }
      // ADMIN / RECEPTIONIST — phone is fine as fallback
    } catch {
      // Name lookup is non-critical; proceed with phone fallback
    }

    const token = signToken(user.id, resolvedRole);
    return NextResponse.json({ token, activeRole: resolvedRole, name });
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
