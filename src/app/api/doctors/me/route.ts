import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { assertPermission } from "@/modules/appointments/appointment.permissions";

export async function GET(req: NextRequest) {
  try {
    const { userId, activeRole } = await getAuthContext(req);

    // ensure user is acting as DOCTOR
    if (activeRole !== "DOCTOR") {
      return NextResponse.json(
        { error: "Access denied: not acting as doctor" },
        { status: 403 }
      );
    }

    const doctor = await prisma.doctor.findFirst({
      where: { userId },
      include: {
        appointments: {
          where: {
            deletedAt: null
          },
          orderBy: {
            appointmentDate: "asc"
          }
        }
      }
    });

    if (!doctor) {
      return NextResponse.json(
        { error: "Doctor profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(doctor);

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load doctor profile" },
      { status: 500 }
    );
  }
}
