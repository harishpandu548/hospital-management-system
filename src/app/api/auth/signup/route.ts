import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/jwt";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, password, email } = body;

    if (!phone || !password) {
      return NextResponse.json(
        { error: "Phone and password are required" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this phone already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const patientRole = await prisma.role.findUnique({ where: { name: "PATIENT" } });
    if (!patientRole) {
      return NextResponse.json(
        { error: "PATIENT role not configured – run the seed script" },
        { status: 500 }
      );
    }

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: { phone, email: email || undefined, password: hashedPassword },
      });
      await tx.userRole.create({
        data: { userId: newUser.id, roleId: patientRole.id },
      });
      return newUser;
    });

    const token = signToken(user.id, "PATIENT");

    return NextResponse.json({ token, activeRole: "PATIENT" }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Signup failed" }, { status: 500 });
  }
}
