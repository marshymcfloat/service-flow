import { NextResponse, connection } from "next/server";
import { sendFlowReminders } from "@/lib/services/flow-reminders";

export async function GET(request: Request) {
  await connection();
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return new NextResponse("Unauthorized", {
        status: 401,
        headers: { "WWW-Authenticate": "Basic realm='Secure Area'" },
      });
    }

    const [scheme, encoded] = authHeader.split(" ");

    if (scheme !== "Basic" || !encoded) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const decoded = Buffer.from(encoded, "base64").toString();
    const [user, pass] = decoded.split(":");

    const validUser = process.env.CRON_USER || "admin";
    const validPass = process.env.CRON_PASSWORD;

    if (!validPass || user !== validUser || pass !== validPass) {
      console.error("Invalid cron credentials");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const results = await sendFlowReminders();

    return NextResponse.json(results);
  } catch (error) {
    console.error("Cron error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
