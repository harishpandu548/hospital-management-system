import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoogleGenAI, Type } from "@google/genai";

// Cache doctors list to avoid querying every time in chat
let doctorsCache: { id: string, name: string, spec: string }[] | null = null;

export async function POST(req: NextRequest) {
  try {
    const { userId, activeRole } = await getAuthContext(req);
    if (activeRole !== "PATIENT") {
      return NextResponse.json({ error: "Only patients can use the AI Assistant" }, { status: 403 });
    }

    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        response: "The Gemini API key is not configured. Please ask the administrator to set GEMINI_API_KEY in the environment."
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Ensure we have a list of doctors for the AI
    if (!doctorsCache) {
      const docs = await prisma.doctor.findMany({
        where: { isActive: true, deletedAt: null },
        select: { id: true, fullname: true, specialization: true }
      });
      doctorsCache = docs.map(d => ({ id: d.id, name: d.fullname, spec: d.specialization }));
    }

    const doctorsListText = doctorsCache.map(d => `- Dr. ${d.name} (${d.spec})`).join('\n');

    // Find the patient's primary profile with appointments
    const patientProfile = await prisma.patient.findFirst({
      where: { userId, relation: "SELF", deletedAt: null },
      include: {
        appointments: {
          where: { deletedAt: null },
          include: { doctor: { select: { fullname: true, specialization: true } } },
          orderBy: { appointmentDate: 'asc' }
        }
      }
    });
    
    if (!patientProfile) {
      return NextResponse.json({
        response: "Please complete your patient profile in the portal before using the booking assistant."
      });
    }

    // Prepare patient context for RAG
    const now = new Date();
    const upcomingAppointments = patientProfile.appointments.filter(a => a.appointmentDate > now);
    const pastAppointments = patientProfile.appointments.filter(a => a.appointmentDate <= now);

    let patientContext = `Patient Name: ${patientProfile.firstName} ${patientProfile.lastName}\n`;
    patientContext += `Age/DOB: ${patientProfile.dateOfBirth.toISOString().split('T')[0]}\n`;
    
    if (upcomingAppointments.length > 0) {
      patientContext += `Upcoming Appointments:\n`;
      upcomingAppointments.forEach(a => {
        patientContext += `- ${new Date(a.appointmentDate).toLocaleString()} with Dr. ${a.doctor.fullname} (${a.doctor.specialization}). Status: ${a.status}\n`;
      });
    } else {
      patientContext += `Upcoming Appointments: None\n`;
    }

const systemInstruction = `You are a helpful, professional medical receptionist and Clinical Triage Assistant for our Hospital Management System.
You can help patients book appointments and answer questions about their schedule.

--- CLINICAL TRIAGE RULES ---
If a patient mentions symptoms (e.g. "my stomach hurts", "I have a headache"):
1. Act as a Triage Nurse. Do NOT immediately book an appointment or list doctors.
2. Ask 1 or 2 brief follow-up questions to understand the severity and duration of the symptoms.
3. Based on their response, recommend the most appropriate specialist from the AVAILABLE DOCTORS list.
4. If symptoms sound like a severe medical emergency (e.g., chest pain, severe bleeding, difficulty breathing), immediately advise them to call emergency services or visit the nearest ER.

--- AVAILABLE DOCTORS ---
${doctorsListText}

--- PATIENT DATA CONTEXT ---
Use this real-time data to answer questions like "when is my next appointment?":
${patientContext}
---------------------------

If the patient explicitly asks to book an appointment and you know the doctor, date, and time, use the 'book_appointment' tool.
Make sure you have all required parameters before calling the tool.
Current System Date/Time: ${now.toLocaleString()}`;

    // Format history for Gemini
    const contents = messages.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }]
    }));

    // Start a chat session
    const chat = ai.chats.create({
      model: "gemini-3.6-flash",
      config: {
        systemInstruction,
        temperature: 0.2,
        tools: [{
          functionDeclarations: [{
            name: "book_appointment",
            description: "Books a consultation appointment with a specific doctor for a given date and time.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                doctorName: {
                  type: Type.STRING,
                  description: "The name of the doctor (e.g. 'Ayeesha')"
                },
                date: {
                  type: Type.STRING,
                  description: "The date of the appointment in YYYY-MM-DD format"
                },
                time: {
                  type: Type.STRING,
                  description: "The time of the appointment in HH:MM format (24-hour)"
                }
              },
              required: ["doctorName", "date", "time"]
            }
          }]
        }]
      }
    });

    // Send the latest message (the last one in the array)
    const userMessage = contents.pop();
    let response;
    
    if (!userMessage) {
      return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
    }

    try {
      response = await chat.sendMessage({
        message: userMessage.parts[0].text
      });
    } catch (e: any) {
      console.error("Gemini API Error:", e);
      return NextResponse.json({ response: "I encountered an error connecting to my brain. Please try again later." });
    }

    // Check if the model called a function
    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      if (call.name === 'book_appointment') {
        const { doctorName, date, time } = call.args as any;
        
        // Find the doctor
        const docNameLower = doctorName.toLowerCase().replace('dr. ', '');
        const doctor = doctorsCache.find(d => d.name.toLowerCase().includes(docNameLower));
        
        if (!doctor) {
          // Send result back to model so it can apologize
          const followup = await chat.sendMessage({
            message: [{
              functionResponse: {
                name: call.name,
                response: { error: `Doctor matching ${doctorName} not found.` }
              }
            }]
          });
          return NextResponse.json({ response: followup.text });
        }

        try {
          // Create the date object
          const appointmentDate = new Date(`${date}T${time}:00`);
          const slotEnd = new Date(appointmentDate.getTime() + 30 * 60000); // +30 mins

          // Use the existing POST /api/appointments endpoint to ensure validation
          const bookingReq = await fetch(`${req.nextUrl.origin}/api/appointments`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": req.headers.get("authorization") || ""
            },
            body: JSON.stringify({
              doctorId: doctor.id,
              patientId: patientProfile.id,
              appointmentDate: appointmentDate.toISOString(),
              slotStart: appointmentDate.toISOString(),
              slotEnd: slotEnd.toISOString(),
            })
          });

          const bookingRes = await bookingReq.json();

          if (!bookingReq.ok) {
            const failFollowup = await chat.sendMessage({
              message: [{
                functionResponse: {
                  name: call.name,
                  response: { error: bookingRes.error || "Failed to save appointment" }
                }
              }]
            });
            return NextResponse.json({ response: failFollowup.text });
          }

          // Feed success back to Gemini
          const successFollowup = await chat.sendMessage({
            message: [{
              functionResponse: {
                name: call.name,
                response: { 
                  success: true, 
                  message: `Successfully booked appointment with Dr. ${doctor.name} on ${date} at ${time}. Appointment ID is ${bookingRes.id}.` 
                }
              }
            }]
          });

          return NextResponse.json({ 
            response: successFollowup.text, 
            isBookingSuccess: true, 
            bookedDetails: { doctorName: doctor.name, date, time }
          });

        } catch (dbErr: any) {
          const failFollowup = await chat.sendMessage({
            message: [{
              functionResponse: {
                name: call.name,
                response: { error: "Failed to save appointment in database: " + dbErr.message }
              }
            }]
          });
          return NextResponse.json({ response: failFollowup.text });
        }
      }
    }

    // Standard text response
    return NextResponse.json({ response: response.text });
    
  } catch (error: any) {
    console.error("[POST /api/ai/chat] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
