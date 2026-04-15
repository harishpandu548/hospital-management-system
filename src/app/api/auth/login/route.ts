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

    // find user
    const user = await prisma.user.findUnique({
      where: { phone },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // compare password
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // extract roles
    const roles = user.roles.map(r => r.role.name);

    if (roles.length === 0) {
      return NextResponse.json(
        { error: "No roles assigned" },
        { status: 403 }
      );
    }

    // if activeRole not provided
    if (!activeRole) {
      if (roles.length === 1) {
        // auto login
        const token = signToken(user.id, roles[0]);

        return NextResponse.json({
          token,
          activeRole: roles[0]
        });
      }

      // multiple roles, ask frontend to choose
      return NextResponse.json({
        message: "Select role",
        roles
      });
    }

    // if activeRole provided  validate him
    if (!roles.includes(activeRole)) {
      return NextResponse.json(
        { error: "Invalid role selection" },
        { status: 403 }
      );
    }

    // issue token
    const token = signToken(user.id, activeRole);

    return NextResponse.json({
      token,
      activeRole
    });

  } catch (error) {
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
