import { redis } from "@/lib/redis";
import { JobType,JobPayloadMap } from "./jobs.types";
import {randomUUID} from "crypto"

export async function enqueueJob<T extends JobType>(type:T,payload:JobPayloadMap[T],maxAttempts=3):Promise<void>{
    const job={
        id:randomUUID(),
        type,
        payload,
        attempts:0,
        maxAttempts,
        createdAt:new Date().toISOString()
    }
    //lpush meaning push job to queue
    await redis.lpush("hms:jobs",JSON.stringify(job))
}