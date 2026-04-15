import { NextResponse } from "next/server";
import { enqueueJob } from "@/jobs/queue";

export async function GET() {
  await enqueueJob("SLOT_LOCK_CLEANUP", {});
  return NextResponse.json({ message: "Dummy job enqueued" });
}
