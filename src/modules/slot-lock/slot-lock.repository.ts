import { prisma } from "@/lib/prisma";

export interface SlotLockInput{
    readonly doctorId:string;
    readonly appointmentDate:Date;
    readonly slotStart:Date;
    readonly slotEnd:Date;
    readonly lockedBy:string;
    readonly lockExpiresAt:Date;
}

//talks to db and saves data there
export async function createSlotLock(
    data:SlotLockInput
):Promise<void> {
    await prisma.appointmentSlotLock.create({
        data
    })
}

//checks if there are any active locks
export async function findActiveSlotLock(
    doctorId:string,
    appointmentDate:Date,
    slotStart:Date,
    slotEnd:Date,
) {
    return prisma.appointmentSlotLock.findFirst({
        where:{
            doctorId,
            appointmentDate,
            slotStart,
            slotEnd,
            lockExpiresAt:{
                gt:new Date()
            }
        }
    })
    
}