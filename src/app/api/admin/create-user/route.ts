import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";
import { assertPermission } from "@/modules/appointments/appointment.permissions";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    const { userId, activeRole } = verifyToken(token);

    //permission check
    await assertPermission(userId, activeRole, "USER_CREATE");

    const body = await req.json();
    const { phone, email, password, roleName } = body;

    if (!phone || !password || !roleName) {
      return NextResponse.json(
        { error: "phone, password and roleName required" },
        { status: 400 }
      );
    }

    // check role exists
    const role = await prisma.role.findUnique({
      where: { name: roleName }
    });

    if (!role) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    // check duplicate phone
    const existingUser = await prisma.user.findUnique({
      where: { phone }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this phone already exists" },
        { status: 400 }
      );
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // create user
    const newUser = await prisma.user.create({
      data: {
        phone,
        email,
        password: hashedPassword,
        roles: {
          create: {
            roleId: role.id
          }
        }
      }
    });

    return NextResponse.json({
      message: "User created successfully",
      userId: newUser.id,
      assignedRole: role.name
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
