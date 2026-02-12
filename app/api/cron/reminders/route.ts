import { NextResponse, connection } from "next/server";
import { sendBookingReminders } from "@/lib/services/reminders";
import {
  isCronAuthorized,
  unauthorizedCronResponse,
} from "@/lib/security/cron-auth";

export async function GET(request: Request) {
  await connection();
  try {
    if (!isCronAuthorized(request)) {
      console.error("Invalid cron credentials");
      return unauthorizedCronResponse();
    }

    const results = await sendBookingReminders();

    return NextResponse.json(results);
  } catch (error) {
    console.error("Cron error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
