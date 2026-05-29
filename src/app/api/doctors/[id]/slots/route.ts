import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: doctorId } = await context.params;
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");

    if (!dateStr) {
      return NextResponse.json({ error: "date parameter required (YYYY-MM-DD)" }, { status: 400 });
    }

    // Parse as UTC midnight so slot times align with how the admin stored them
    const targetDate = new Date(dateStr + "T00:00:00.000Z");
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    const dayOfWeek = targetDate.getUTCDay(); // 0=Sun, 6=Sat
    const now = new Date();

    // Find applicable availability rules for this doctor on this day
    const rules = await prisma.doctorAvailabilityRule.findMany({
      where: {
        doctorId,
        deletedAt: null,
        dayOfWeek,
        validFrom: { lte: targetDate },
        OR: [{ validTo: null }, { validTo: { gte: targetDate } }],
      },
    });

    if (rules.length === 0) {
      return NextResponse.json([]); // No availability configured for this day
    }

    // Fetch existing non-cancelled/no-show appointments on this day for the doctor
    const nextDay = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
    const existingAppts = await prisma.appointment.findMany({
      where: {
        doctorId,
        deletedAt: null,
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        slotStart: { gte: targetDate, lt: nextDay },
      },
      select: { slotStart: true },
    });

    // Count bookings per slot
    const slotCounts: Record<string, number> = {};
    existingAppts.forEach((appt) => {
      const key = appt.slotStart.toISOString();
      slotCounts[key] = (slotCounts[key] || 0) + 1;
    });

    // Generate all slots from all rules
    const slotMap: Record<string, { start: string; end: string; startISO: string; status: "available" | "past" | "full" }> = {};

    for (const rule of rules) {
      // Extract time of day from stored UTC datetime
      const startH = rule.startTime.getUTCHours();
      const startM = rule.startTime.getUTCMinutes();
      const endH = rule.endTime.getUTCHours();
      const endM = rule.endTime.getUTCMinutes();

      const ruleStart = new Date(targetDate);
      ruleStart.setUTCHours(startH, startM, 0, 0);

      const ruleEnd = new Date(targetDate);
      ruleEnd.setUTCHours(endH, endM, 0, 0);

      let current = new Date(ruleStart);

      while (current < ruleEnd) {
        const slotEnd = new Date(current.getTime() + rule.slotDurationMinutes * 60_000);
        if (slotEnd > ruleEnd) break;

        const startISO = current.toISOString();
        const count = slotCounts[startISO] || 0;

        let status: "available" | "past" | "full" = "available";
        if (current <= now) status = "past";
        else if (count >= rule.maxPatientsPerSlot) status = "full";

        // Only add if not already present (first rule wins on overlap)
        if (!slotMap[startISO]) {
          slotMap[startISO] = {
            startISO,
            start: startISO,
            end: slotEnd.toISOString(),
            status,
          };
        }

        current = slotEnd;
      }
    }

    const sorted = Object.values(slotMap).sort((a, b) =>
      a.startISO.localeCompare(b.startISO)
    );

    return NextResponse.json(sorted);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
