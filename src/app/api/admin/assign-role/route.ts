import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";
import { assertPermission } from "@/modules/appointments/appointment.permissions";

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

    //check permission
    await assertPermission(userId, activeRole, "ROLE_ASSIGN");

    const body = await req.json();
    const { userId: targetUserId, roleName } = body;

    if (!targetUserId || !roleName) {
      return NextResponse.json(
        { error: "userId and roleName required" },
        { status: 400 }
      );
    }

    // check user exists
    const user = await prisma.user.findUnique({
      where: { id: targetUserId }
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // check role exists
    const role = await prisma.role.findUnique({
      where: { name: roleName }
    });

    if (!role) {
      return NextResponse.json(
        { error: "Role not found" },
        { status: 404 }
      );
    }

    // check already assigned
    const existing = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId: targetUserId,
          roleId: role.id
        }
      }
    });

    if (existing) {
      return NextResponse.json(
        { error: "Role already assigned" },
        { status: 400 }
      );
    }

    // assign role
    await prisma.userRole.create({
      data: {
        userId: targetUserId,
        roleId: role.id
      }
    });

    return NextResponse.json({
      message: "Role assigned successfully"
    });

  } catch (error) {
    return NextResponse.json(
      { error: "Failed to assign role" },
      { status: 500 }
    );
  }
}
