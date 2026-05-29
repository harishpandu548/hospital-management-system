import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { assertPermission } from "@/modules/appointments/appointment.permissions";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { userId, activeRole } = await getAuthContext(req);

    // permission check
    await assertPermission(userId, activeRole, "DOCTOR_CREATE");

    const body = await req.json();

    const {
      fullname,
      specialization,
      qualification,
      experienceYears,
      createLogin,
      phone,
      password
    } = body;

    if (!fullname || !specialization || !experienceYears) {
      return NextResponse.json(
        { error: "Missing required doctor fields" },
        { status: 400 }
      );
    }

    // transaction ensures consistency
    const result = await prisma.$transaction(async (tx) => {

      let linkedUserId: string | null = null;

      if (createLogin === true) {

        if (!phone || !password) {
          throw new Error("Phone and password required for login creation");
        }

        // check duplicate phone
        const existingUser = await tx.user.findUnique({
          where: { phone }
        });

        if (existingUser) {
          throw new Error("User with this phone already exists");
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await tx.user.create({
          data: {
            phone,
            password: hashedPassword
          }
        });

        // assign DOCTOR role
        const doctorRole = await tx.role.findUnique({
          where: { name: "DOCTOR" }
        });

        if (!doctorRole) {
          throw new Error("DOCTOR role not found");
        }

        await tx.userRole.create({
          data: {
            userId: user.id,
            roleId: doctorRole.id
          }
        });

        linkedUserId = user.id;
      }

      // create doctor profile
      const doctor = await tx.doctor.create({
        data: {
          fullname,
          specialization,
          qualification,
          experienceYears,
          userId: linkedUserId
        }
      });

      return doctor;
    });

    return NextResponse.json({
      message: "Doctor created successfully",
      doctorId: result.id
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create doctor" },
      { status: 500 }
    );
  }
}



export async function GET(req: NextRequest) {
  try {
    const { userId, activeRole } = await getAuthContext(req);

    let where: any = { deletedAt: null };

    if (activeRole === "DOCTOR") {
      where = { userId };
    } else if (activeRole === "PATIENT" || activeRole === "RECEPTIONIST") {
      // Patients and receptionists only see active doctors
      where = { deletedAt: null, isActive: true };
    }

    const doctors = await prisma.doctor.findMany({
      where,
      orderBy: { fullname: "asc" }
    });

    return NextResponse.json(doctors);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}
