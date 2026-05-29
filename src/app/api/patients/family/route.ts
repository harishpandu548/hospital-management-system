import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { z } from "zod";

const FamilyMemberSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  gender: z.string().min(1, "Gender is required"),
  dateOfBirth: z.coerce.date(),
  phone: z.string().min(1, "Phone is required"),
  relation: z.enum(["SPOUSE", "CHILD", "PARENT", "SIBLING", "OTHER"]),
  email: z.string().email().optional().or(z.literal("")),
  bloodGroup: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  medicalNotes: z.string().optional(),
  medicalFiles: z.array(z.object({
    url: z.string(),
    name: z.string(),
    type: z.string(),
    uploadedAt: z.string(),
  })).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { userId, activeRole } = await getAuthContext(req);
    if (activeRole !== "PATIENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const profiles = await prisma.patient.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ relation: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json(profiles);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, activeRole } = await getAuthContext(req);
    if (activeRole !== "PATIENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    let data: z.infer<typeof FamilyMemberSchema>;
    try {
      data = FamilyMemberSchema.parse(body);
    } catch (zodErr: any) {
      const firstIssue = zodErr.issues?.[0];
      const field = firstIssue?.path?.join(".") ?? "input";
      const message = firstIssue?.message ?? "Invalid input";
      return NextResponse.json({ error: `${field}: ${message}` }, { status: 400 });
    }

    const member = await prisma.patient.create({
      data: {
        ...data,
        email: data.email || undefined,
        medicalFiles: (data.medicalFiles ?? undefined) as any,
        userId,
        createdBy: userId,
      },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
