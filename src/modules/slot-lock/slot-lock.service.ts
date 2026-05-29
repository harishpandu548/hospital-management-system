import { redis } from "@/lib/redis"
import { createSlotLock, findActiveSlotLock } from "./slot-lock.repository"

//lock lives only for 30 sec
const LOCK_TTL_SECONDS= 30

export async function acquireSlotLock(params:{
    doctorId:string,
    appointmentDate:Date,
    slotStart:Date,
    slotEnd:Date,
    lockedBy:string
}):Promise<void> {
    // redis lock key creation(meaning it creates a unique name for this slot)->so doctor+time=unique slot we are dng this bcz redis keys must be unique
    const lockKey=`slot-lock:${params.doctorId}:${params.slotStart.toISOString()}`

    //create this key only if it does not already exists
    const redisLock=await redis.set(
        lockKey,
        params.lockedBy,
        { ex: LOCK_TTL_SECONDS, nx: true }
    )

    if(!redisLock){
        throw new Error("Slot is temporarily locked")
    }

    const existingDbLock=await findActiveSlotLock(
        params.doctorId,
        params.appointmentDate,
        params.slotStart,
        params.slotEnd
    )
    if(existingDbLock){
        throw new Error("Slot already booked or locked")
    }
    await createSlotLock({
        doctorId:params.doctorId,
        appointmentDate:params.appointmentDate,
        slotStart:params.slotStart,
        slotEnd:params.slotEnd,
        lockedBy:params.lockedBy,
        lockExpiresAt:new Date(
            Date.now()+LOCK_TTL_SECONDS*1000
        )
    })
}