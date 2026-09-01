import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { assertPermission } from "@/modules/appointments/appointment.permissions";

export async function GET(req: NextRequest) {
  try {
    const { userId, activeRole } = await getAuthContext(req);
    await assertPermission(userId, activeRole, "AUDIT_VIEW");

    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    if (logs.length === 0) return NextResponse.json([]);

    // ── Resolve performer names ──────────────────────────────────────────────
    const performerIds = [...new Set(logs.map((l) => l.performedBy).filter(Boolean))];

    const [patients, doctors, users] = await Promise.all([
      prisma.patient.findMany({
        where: { userId: { in: performerIds } },
        select: { userId: true, firstName: true, lastName: true },
      }),
      prisma.doctor.findMany({
        where: { userId: { in: performerIds } },
        select: { userId: true, fullname: true },
      }),
      prisma.user.findMany({
        where: { id: { in: performerIds } },
        select: { id: true, email: true, phone: true },
      }),
    ]);

    const patientByUser = Object.fromEntries(
      patients.map((p) => [p.userId, `${p.firstName} ${p.lastName}`])
    );
    const doctorByUser = Object.fromEntries(
      doctors.map((d) => [d.userId, d.fullname])
    );
    const userById = Object.fromEntries(
      users.map((u) => [u.id, u.email?.split('@')[0] || u.phone])
    );

    const resolvePerformer = (uid: string) =>
      patientByUser[uid] || doctorByUser[uid] || userById[uid] || "System";

    // ── Resolve entity names by type ─────────────────────────────────────────
    const apptIds = logs.filter((l) => l.entityType === "APPOINTMENT").map((l) => l.entityId);
    const doctorEntityIds = logs.filter((l) => l.entityType === "DOCTOR").map((l) => l.entityId);
    const patientEntityIds = logs.filter((l) => l.entityType === "PATIENT").map((l) => l.entityId);

    const [apptEntities, doctorEntities, patientEntities] = await Promise.all([
      apptIds.length > 0
        ? prisma.appointment.findMany({
            where: { id: { in: apptIds } },
            select: {
              id: true,
              patient: { select: { firstName: true, lastName: true } },
              doctor: { select: { fullname: true } },
            },
          })
        : [],
      doctorEntityIds.length > 0
        ? prisma.doctor.findMany({
            where: { id: { in: doctorEntityIds } },
            select: { id: true, fullname: true },
          })
        : [],
      patientEntityIds.length > 0
        ? prisma.patient.findMany({
            where: { id: { in: patientEntityIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : [],
    ]);

    const apptMap = Object.fromEntries(
      (apptEntities as any[]).map((a) => [
        a.id,
        a.patient
          ? `${a.patient.firstName} ${a.patient.lastName}${a.doctor ? ` → Dr. ${a.doctor.fullname}` : ""}`
          : "",
      ])
    );
    const doctorEntityMap = Object.fromEntries(
      (doctorEntities as any[]).map((d) => [d.id, `Dr. ${d.fullname}`])
    );
    const patientEntityMap = Object.fromEntries(
      (patientEntities as any[]).map((p) => [p.id, `${p.firstName} ${p.lastName}`])
    );

    const resolveEntity = (entityType: string, entityId: string) => {
      if (entityType === "APPOINTMENT") return apptMap[entityId] || "";
      if (entityType === "DOCTOR") return doctorEntityMap[entityId] || "";
      if (entityType === "PATIENT") return patientEntityMap[entityId] || "";
      return "";
    };

    const enriched = logs.map((log) => {
      const eName = resolveEntity(log.entityType, log.entityId);
      let actionText = log.action;
      if (log.action === 'CREATE' && log.entityType === 'APPOINTMENT') actionText = 'Booked appointment';
      else if (log.action === 'CREATE' && log.entityType === 'PATIENT') actionText = 'Registered new patient';
      else if (log.action === 'CREATE' && log.entityType === 'DOCTOR') actionText = 'Added new doctor';
      else if (log.action === 'STATUS CHANGE') actionText = 'Updated appointment status';
      else if (log.action === 'APPOINTMENT CANCELLED') actionText = 'Cancelled appointment';
      else if (log.action === 'USER_LOGIN') actionText = 'Logged into the system';
      else if (log.action === 'CREATE_VIDEO_CALL') actionText = 'Started a video consultation';

      return {
        ...log,
        performedByName: resolvePerformer(log.performedBy),
        entityName: eName,
        action: actionText
      };
    });

    return NextResponse.json(enriched);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
}
