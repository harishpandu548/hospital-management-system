import { AppointmentStatus } from "@prisma/client";
import { assertPermission } from "./appointment.permissions";
import { prisma } from "@/lib/prisma";
import { isValidTransition } from "./appointment.state-machine";
import { enqueueJob } from "@/jobs/queue";

export interface UpdateAppointmentStatusInput{
    readonly appointmentId:string;
    readonly newStatus:AppointmentStatus;
    readonly performedBy:string; //userId
    readonly performedByRole:string;
    readonly reason?:string;
    readonly allowOverride?:boolean; //emergency switch used only by admins(like due to bugs status from completed comes to scheduled then admin need to take care of this mistakes)
}

export async function updateAppointmentStatusService(input:UpdateAppointmentStatusInput) {

    //load appointment
    const appointment=await prisma.appointment.findUnique({
        where:{id:input.appointmentId}
    })
    if(!appointment){
        throw new Error("Appointment not found")
    }
    
    const currentStatus=appointment.status;

    //final state protection bcz finals states cannot be modified
    if(
        currentStatus===AppointmentStatus.COMPLETED ||
        currentStatus===AppointmentStatus.CANCELLED ||
        currentStatus===AppointmentStatus.NO_SHOW
    ){
        throw new Error("Final states cannot be modified")
    }

    //validate transition
    if(
        !isValidTransition(currentStatus,input.newStatus) && !input.allowOverride
    ){
        throw new Error(
            `Invalid status transition from ${currentStatus} to ${input.newStatus}`
        )
    }

    //transaction
    const updated=await prisma.$transaction(async(tx:any)=>{
        //update appointment
        const updated=await tx.appointment.update({
            where:{id:appointment.id},
            data:{status:input.newStatus}
        })

        //status log
        await tx.AppointmentStatusLog.create({
            data:{
                appointmentId:appointment.id,
                oldStatus:currentStatus,
                newStatus:input.newStatus,
                changedBy:input.performedBy,
                changedByRole:input.performedByRole,
                reason:input.reason
            }
        })

        //audit log
        await tx.auditLog.create({
            data:{
                entityType:"APPOINTMENT",
                entityId:appointment.id,
                action:"STATUS_CHANGE",
                performedBy:input.performedBy
            }
        })
        return updated
    })
    //only when scheduled or else cancelled reminder is sent
    if(input.newStatus==="SCHEDULED"){
        await enqueueJob("APPOINTMENT_REMINDER",{
            appointmentId:updated.id,
            reminderType:"T_24H"
        })
        await enqueueJob("APPOINTMENT_REMINDER",{
            appointmentId:updated.id,
            reminderType:"T_2H"
        })
    }
    if(input.newStatus==="CANCELLED"){
        await enqueueJob("APPOINTMENT_CANCELLED",{
            appointmentId:appointment.id
        })
    }
    return updated
}
