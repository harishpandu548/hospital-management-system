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

    const [patients, doctors] = await Promise.all([
      prisma.patient.findMany({
        where: { userId: { in: performerIds } },
        select: { userId: true, firstName: true, lastName: true },
      }),
      prisma.doctor.findMany({
        where: { userId: { in: performerIds } },
        select: { userId: true, fullname: true },
      }),
    ]);

    const patientByUser = Object.fromEntries(
      patients.map((p) => [p.userId, `${p.firstName} ${p.lastName}`])
    );
    const doctorByUser = Object.fromEntries(
      doctors.map((d) => [d.userId, d.fullname])
    );

    const resolvePerformer = (uid: string) =>
      patientByUser[uid] || doctorByUser[uid] || uid.slice(0, 12) + "…";

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
          : a.id.slice(0, 12) + "…",
      ])
    );
    const doctorEntityMap = Object.fromEntries(
      (doctorEntities as any[]).map((d) => [d.id, `Dr. ${d.fullname}`])
    );
    const patientEntityMap = Object.fromEntries(
      (patientEntities as any[]).map((p) => [p.id, `${p.firstName} ${p.lastName}`])
    );

    const resolveEntity = (entityType: string, entityId: string) => {
      if (entityType === "APPOINTMENT") return apptMap[entityId] || entityId.slice(0, 12) + "…";
      if (entityType === "DOCTOR") return doctorEntityMap[entityId] || entityId.slice(0, 12) + "…";
      if (entityType === "PATIENT") return patientEntityMap[entityId] || entityId.slice(0, 12) + "…";
      return entityId.slice(0, 12) + "…";
    };

    const enriched = logs.map((log) => ({
      ...log,
      performedByName: resolvePerformer(log.performedBy),
      entityName: resolveEntity(log.entityType, log.entityId),
    }));

    return NextResponse.json(enriched);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
}
