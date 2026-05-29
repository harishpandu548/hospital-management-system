import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAppointmentIdService } from "@/modules/appointments/appointment.service";
import { NextRequest, NextResponse } from "next/server";


export async function GET(req:NextRequest, context:{params:Promise<{id:string}>}) {
    try {
        const auth=await getAuthContext(req)
        const {id}=await context.params
        const appointment=await getAppointmentIdService(id,auth)
        return NextResponse.json(appointment)
    } catch (error:any) {
        const message=error.message||"Error"
        const status=
        message==="Forbidden"?403:message==="Appointment not found"?404:401
        return NextResponse.json({error:message},{status})
    }
}

export async function PATCH(req:NextRequest, context:{params:Promise<{id:string}>}) {
    try {
        const { userId, activeRole } = await getAuthContext(req);
        const { id } = await context.params;

        if (activeRole !== 'ADMIN' && activeRole !== 'RECEPTIONIST') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { paymentStatus } = body;

        const validPaymentStatuses = ['PENDING', 'PAID', 'WAIVED'];
        if (!paymentStatus || !validPaymentStatuses.includes(paymentStatus)) {
            return NextResponse.json({ error: 'Invalid paymentStatus' }, { status: 400 });
        }

        const updated = await prisma.appointment.update({
            where: { id },
            data: { paymentStatus },
        });

        return NextResponse.json(updated);
    } catch (error:any) {
        return NextResponse.json({ error: error.message || 'Error' }, { status: 400 });
    }
}