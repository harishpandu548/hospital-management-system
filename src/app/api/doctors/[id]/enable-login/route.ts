import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { assertPermission } from "@/modules/appointments/appointment.permissions";
import bcrypt from "bcryptjs";

export async function POST(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { userId, activeRole } = await getAuthContext(req);

    //permission check
    await assertPermission(userId, activeRole, "DOCTOR_CREATE");

    const doctorId = context.params.id;

    const body = await req.json();
    const { phone, password } = body;

    if (!phone || !password) {
      return NextResponse.json(
        { error: "Phone and password required" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {

      // check doctor exists
      const doctor = await tx.doctor.findUnique({
        where: { id: doctorId }
      });

      if (!doctor) {
        throw new Error("Doctor not found");
      }

      // prevent double enable
      if (doctor.userId) {
        throw new Error("Login already enabled for this doctor");
      }

      // ensure phone is unique
      const existingUser = await tx.user.findUnique({
        where: { phone }
      });

      if (existingUser) {
        throw new Error("Phone already in use");
      }

      // hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // create user
      const user = await tx.user.create({
        data: {
          phone,
          password: hashedPassword
        }
      });

      // get DOCTOR role
      const doctorRole = await tx.role.findUnique({
        where: { name: "DOCTOR" }
      });

      if (!doctorRole) {
        throw new Error("DOCTOR role missing in system");
      }

      // assign DOCTOR role
      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: doctorRole.id
        }
      });

      // link doctor to user
      await tx.doctor.update({
        where: { id: doctorId },
        data: { userId: user.id }
      });

      return user.id;
    });

    return NextResponse.json({
      message: "Doctor login enabled successfully",
      userId: result
    });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error.message || "Failed to enable login" },
      { status: 500 }
    );
  }
}
