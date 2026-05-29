import { getAuthContext } from "@/lib/auth";
import { assertPermission } from "@/modules/appointments/appointment.permissions";
import { updateAppointmentStatusService } from "@/modules/appointments/appointment.status.service";
import { AppointmentStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Per-role allowed transitions enforced server-side
const ROLE_TRANSITIONS: Record<string, Record<string, string[]>> = {
  PATIENT: {
    SCHEDULED: ["CANCELLED"],
    CREATED: ["CANCELLED"],
  },
  RECEPTIONIST: {
    CREATED: ["SCHEDULED", "CANCELLED"],
    SCHEDULED: ["CHECKED_IN", "CANCELLED", "NO_SHOW"],
    CHECKED_IN: ["IN_PROGRESS", "CANCELLED"],
  },
  DOCTOR: {
    CHECKED_IN: ["IN_PROGRESS"],
    IN_PROGRESS: ["COMPLETED"],
  },
};

const UpdateStatusSchema = z.object({
  newStatus: z.nativeEnum(AppointmentStatus),
  reason: z.string().optional(),
  allowOverride: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const { userId, activeRole } = await getAuthContext(req);

    const body = await req.json();
    const data = UpdateStatusSchema.parse(body);

    if (data.allowOverride === true) {
      await assertPermission(userId, activeRole, "STATUS_OVERRIDE");
    } else {
      await assertPermission(userId, activeRole, "STATUS_UPDATE");
    }

    // For non-admin roles, enforce role-specific transition rules
    if (activeRole !== "ADMIN" && !data.allowOverride) {
      const { prisma } = await import("@/lib/prisma");
      const appointment = await prisma.appointment.findUnique({ where: { id } });
      if (!appointment) {
        return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
      }

      const allowedFromCurrent = ROLE_TRANSITIONS[activeRole]?.[appointment.status] ?? [];
      if (!allowedFromCurrent.includes(data.newStatus)) {
        const msg = allowedFromCurrent.length === 0
          ? `Your role cannot update appointments in ${appointment.status} status.`
          : `${activeRole} can only transition ${appointment.status} to: ${allowedFromCurrent.join(", ")}. Cannot set ${data.newStatus}.`;
        return NextResponse.json({ error: msg }, { status: 403 });
      }
    }

    const updated = await updateAppointmentStatusService({
      appointmentId: id,
      newStatus: data.newStatus,
      performedBy: userId,
      performedByRole: activeRole,
      reason: data.reason,
      allowOverride: data.allowOverride,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
