import { getAuthContext } from "@/lib/auth";
import { assertPermission } from "@/modules/appointments/appointment.permissions";
import { updateAppointmentStatusService } from "@/modules/appointments/appointment.status.service";
import { AppointmentStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

//zod schema
const UpdateStatusSchema = z.object({
  newStatus: z.nativeEnum(AppointmentStatus), //newStatus must be one of the valid appointment statuses
  reason: z.string().optional(),
  allowOverride: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    //auth
    const { userId, activeRole } = await getAuthContext(req);

    //validate body
    const body = await req.json();
    const data = UpdateStatusSchema.parse(body);

    let roleUsed: string;
    if (data.allowOverride === true) {
      await assertPermission(userId, activeRole, "STATUS_OVERRIDE");
    } else {
      await assertPermission(userId, activeRole, "STATUS_UPDATE");
    }

    //call service to update the status
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
    return NextResponse.json(
      {
        error: error.message,
      },
      { status: 400 },
    );
  }
}
