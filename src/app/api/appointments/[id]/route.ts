import { getAuthContext } from "@/lib/auth";
import { getAppointmentIdService } from "@/modules/appointments/appointment.service";
import { NextRequest, NextResponse } from "next/server";


export async function GET(req:NextRequest,{params}:{params:{id:string}}) {
    try {
        //this does is find who is calling this api and returns {userId and roles}
        const auth=await getAuthContext(req)
        //get appointment with this id from url and check if this user can view it
        const appointment=await getAppointmentIdService(params.id,auth)

        return NextResponse.json(appointment)
        
    } catch (error:any) {
        const message=error.message||"Error"
        const status=
        message==="Forbidden"?403:message==="Appointment not found"?404:401
        return NextResponse.json({error:message},{status})       
    }
}