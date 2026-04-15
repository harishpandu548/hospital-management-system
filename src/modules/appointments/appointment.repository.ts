import { AppointmentStatus, PaymentStatus } from "@prisma/client"
import { PrismaClient } from "@prisma/client";

//create appointment
export async function createAppointment(
    tx:PrismaClient,data:{
        patientId:string,
        doctorId:string,
        appointmentDate:Date,
        slotStart:Date,
        slotEnd:Date,
        createdBy:string,
    }
) {
    //insert a new row into the appointments table using the transaction client.if transaction later fails this insert is undone
    return tx.appointment.create({
        data:{
            ...data,
            status:AppointmentStatus.CREATED,
            paymentStatus:PaymentStatus.PENDING
        }
    })
}

//find appointments for based on "where"
export async function findAppointments(tx:PrismaClient,where:any) {
    return tx.appointment.findMany({
        where:where,
        orderBy:{
            appointmentDate:"desc"
        },
        include:{
            patient:true,
            doctor:true,
        }
    })
}

//getting single appointment by its id
export async function findAppointmentById(tx:PrismaClient,id:string) {
    return tx.appointment.findFirst({
        where:{
            id,
            deletedAt:null,
        },
        include:{
            patient:{
                select:{
                    id:true,
                    firstName:true,
                    lastName:true,
                    phone:true,
                    userId:true,
                }
            },
            doctor:{
                select:{
                    id:true,
                    fullname:true,
                    specialization:true,
                    userId:true,
                }
            },
            statusLogs:{
                orderBy:{changedAt:"asc"}
            }
        }
    })
}