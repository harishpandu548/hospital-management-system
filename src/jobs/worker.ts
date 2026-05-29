import "dotenv/config";
import { redis } from "@/lib/redis";

const QUEUE_KEY = "hms:jobs";
const DLQ_KEY = "hms:jobs:dead";
const POLL_INTERVAL_MS = 1000;

export async function processJob(job: any) {
  console.log("Job received:", job);
  switch (job.type) {
    case "APPOINTMENT_CREATED":
      console.log("Notification queued for appointment:", job.payload.appointmentId);
      break;

    case "APPOINTMENT_REMINDER":
      console.log("Reminder queued:", job.payload.reminderType, "for appointment:", job.payload.appointmentId);
      break;

    case "SLOT_LOCK_CLEANUP":
      console.log("Slot lock cleanup triggered");
      break;

    case "APPOINTMENT_CANCELLED":
      console.log("Cancellation notification queued for appointment:", job.payload.appointmentId);
      break;

    default:
      console.log("Unknown job type:", job.type);
  }
}

async function startWorker() {
  console.log("Worker started — polling Upstash Redis queue:", QUEUE_KEY);

  while (true) {
    try {
      const raw = await redis.rpop(QUEUE_KEY);

      if (!raw) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        continue;
      }

      const job = typeof raw === "string" ? JSON.parse(raw) : raw;

      try {
        await processJob(job);
      } catch (error) {
        console.error("Job failed:", error);

        job.attempts = (job.attempts ?? 0) + 1;

        if (job.attempts < job.maxAttempts) {
          console.log(`Retrying job ${job.id} (attempt ${job.attempts})`);
          await redis.lpush(QUEUE_KEY, JSON.stringify(job));
        } else {
          console.log(`Job ${job.id} exceeded max attempts — moving to DLQ`);
          await redis.lpush(DLQ_KEY, JSON.stringify(job));
        }
      }
    } catch (err) {
      console.error("Worker poll error:", err);
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS * 5));
    }
  }
}

startWorker();
