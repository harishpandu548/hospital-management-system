import "dotenv/config";
import { redis } from "@/lib/redis";

const QUEUE_KEY = "hms:jobs";
const DLQ_KEY = "hms:jobs:dead";

export async function processJob(job: any) {
  console.log("Job received:", job);
  switch (job.type) {
    case "APPOINTMENT_CREATED":
      console.log("send notification for", job.payload.appointmentId);
      break;

    case "APPOINTMENT_REMINDER":
      console.log("send Reminder", job.payload);
      break;

    case "SLOT_LOCK_CLEANUP":
      console.log("cleanup slot locks");
      break;

    default:
      console.log("Unknown Job", job);
  }
}

async function startWorker() {
  console.log("Worker Started");

  while (true) {
    const result = await redis.brpop(QUEUE_KEY, 0);
    if (!result) continue;

    const [, jobString] = result;
    const job = JSON.parse(jobString);

    try {
      await processJob(job);
    } catch (error) {
      console.error("Job Failed", error);

      //if job failed need to be retried
      job.attempts = (job.attempts ?? 0) + 1;

      if (job.attempts < job.maxAttempts) {
        console.log(`Retrying job ${job.id} (Attempt ${job.attempts})`);
        await redis.lpush(QUEUE_KEY, JSON.stringify(job));
      } else {
        console.log(`Moving job ${job.id} to Dead Letter Queue`);
        await redis.lpush(DLQ_KEY, JSON.stringify(job));
      }
    }
  }
}
startWorker();
