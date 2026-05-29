import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { assertPermission } from "@/modules/appointments/appointment.permissions";
import { z } from "zod";

const CreatePatientSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  gender: z.string().min(1, "Gender is required"),
  dateOfBirth: z.coerce.date(),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  medicalNotes: z.string().optional(),
  bloodGroup: z.string().optional(),
  weightKg: z.number().optional(),
  heightCm: z.number().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { userId, activeRole } = await getAuthContext(req);

    // PATIENT role can create their own profile; staff roles need PATIENT_CREATE permission
    if (activeRole !== "PATIENT") {
      await assertPermission(userId, activeRole, "PATIENT_CREATE");
    }

    const body = await req.json();

    // Parse and validate — return readable field-level errors
    let data: z.infer<typeof CreatePatientSchema>;
    try {
      data = CreatePatientSchema.parse(body);
    } catch (zodErr: any) {
      const firstIssue = zodErr.issues?.[0];
      const field = firstIssue?.path?.join(".") ?? "input";
      const message = firstIssue?.message ?? "Invalid input";
      return NextResponse.json(
        { error: `${field}: ${message}` },
        { status: 400 }
      );
    }

    // prevent duplicate phone
    const existing = await prisma.patient.findFirst({
      where: { phone: data.phone },
    });

    if (existing) {
      // If the patient already has a profile linked to this user, return it
      if (activeRole === "PATIENT" && existing.userId === userId) {
        return NextResponse.json(existing);
      }
      return NextResponse.json(
        { error: "A patient with this phone number already exists" },
        { status: 400 }
      );
    }

    const patient = await prisma.patient.create({
      data: {
        ...data,
        userId: activeRole === "PATIENT" ? userId : undefined,
        createdBy: userId,
      },
    });

    return NextResponse.json(patient, { status: 201 });
  } catch (error: any) {
    const msg: string = error.message ?? "Request failed";

    if (msg.includes("FORBIDDEN") || msg.includes("permission")) {
      return NextResponse.json({ error: msg }, { status: 403 });
    }
    if (msg.includes("Unauthorized") || msg.includes("UNAUTHORIZED")) {
      return NextResponse.json({ error: "Please log in to continue" }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId, activeRole } = await getAuthContext(req);

    let where: any = { deletedAt: null };

    if (activeRole === "PATIENT") {
      where = { userId };
    }

    if (activeRole === "DOCTOR") {
      where = {
        appointments: {
          some: {
            doctor: { userId },
          },
        },
      };
    }

    const patients = await prisma.patient.findMany({ where });

    return NextResponse.json(patients);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}
