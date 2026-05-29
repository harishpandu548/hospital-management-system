import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { activeRole } = await getAuthContext(req);

    if (activeRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");

    const users = await prisma.user.findMany({
      where: {
        status: { not: "DELETED" },
        ...(role
          ? { roles: { some: { role: { name: role } } } }
          : {}),
      },
      select: {
        id: true,
        phone: true,
        email: true,
        status: true,
        createdAt: true,
        roles: {
          select: { role: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users);
  } catch (error: any) {
    const msg: string = error.message ?? "Request failed";
    if (msg.includes("Unauthorized") || msg.includes("UNAUTHORIZED")) {
      return NextResponse.json({ error: "Please log in" }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
