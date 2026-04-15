import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {

  //seed roles
  const roles = ["PATIENT", "DOCTOR", "RECEPTIONIST", "ADMIN"];

  await prisma.role.createMany({
    data: roles.map((name) => ({ name })),
    skipDuplicates: true,
  });

  console.log("Roles seeded");

  //seed permissions
  const permissions = [
    "APPOINTMENT_CREATE",
    "STATUS_UPDATE",
    "STATUS_OVERRIDE",
    "AVAILABILITY_MANAGE",
    "PATIENT_CREATE",
    "AUDIT_VIEW",
    "ROLE_ASSIGN",
    "USER_CREATE",
    "DOCTOR_CREATE"
  ];

  await prisma.permission.createMany({
    data: permissions.map((code) => ({ code })),
    skipDuplicates: true,
  });

  console.log("Permissions seeded");

//map role to permissions
  const roleRecords = await prisma.role.findMany();
  const permissionRecords = await prisma.permission.findMany();

  const roleMap = Object.fromEntries(
    roleRecords.map((r) => [r.name, r])
  );

  const permissionMap = Object.fromEntries(
    permissionRecords.map((p) => [p.code, p])
  );

  // define role-permission mapping
  const rolePermissions: Record<string, string[]> = {
    ADMIN: permissions, // ADMIN gets all permissions

    RECEPTIONIST: [
      "APPOINTMENT_CREATE",
      "STATUS_UPDATE",
      "PATIENT_CREATE",
      "AVAILABILITY_MANAGE",
      "DOCTOR_CREATE"
    ],

    DOCTOR: [
      "STATUS_UPDATE",
      "AUDIT_VIEW",
    ],

    PATIENT: [
      "APPOINTMENT_CREATE",
    ],
  };

  for (const [roleName, permissionCodes] of Object.entries(rolePermissions)) {
    const role = roleMap[roleName];

    for (const code of permissionCodes) {
      const permission = permissionMap[code];

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }

  console.log("Role-Permission mappings seeded");

//seed default admin user
  const adminPhone = process.env.ADMIN_PHONE!;
  const adminPassword = process.env.ADMIN_PASSWORD!

  if (!adminPhone || !adminPassword) {
    throw new Error("ADMIN_PHONE or ADMIN_PASSWORD not set in .env");
  }

  const existingAdmin = await prisma.user.findUnique({
    where: { phone: adminPhone },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const adminUser = await prisma.user.create({
      data: {
        phone: adminPhone,
        password: hashedPassword,
      },
    });

    await prisma.userRole.create({
      data: {
        userId: adminUser.id,
        roleId: roleMap["ADMIN"].id,
      },
    });

    console.log("default ADMIN user created");
  } else {
    console.log("default ADMIN already exists");
  }

  console.log("Seed completed successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
