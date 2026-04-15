import { prisma } from "@/lib/prisma";

//these are only all the allowed permissions
export type PermissionCode =
  | "APPOINTMENT_CREATE"
  | "STATUS_UPDATE"
  | "STATUS_OVERRIDE"
  | "AVAILABILITY_MANAGE"
  | "PATIENT_CREATE"
  | "AUDIT_VIEW"
  | "ROLE_ASSIGN"
  | "USER_CREATE"
  | "DOCTOR_CREATE";

export async function assertPermission(
  userId: string,
  activeRole:string,
  requiredPermission: PermissionCode,
): Promise<void> {
  const role = await prisma.role.findFirst({
    where: {
      name:activeRole,
      users: {
        some:{userId}
      },
      permissions:{
        some:{
          permission:{
            code:requiredPermission
          }
        }
      }
    },
  });

  if (!role) {
    throw new Error("FORBIDDEN: Missing required permission");
  }

}

