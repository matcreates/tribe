import { NextRequest } from "next/server";
import { getBearerToken, verifyMobileToken } from "@/lib/mobileAuth";
import { getSubscribersByTribeId } from "@/lib/db";

export async function GET(request: NextRequest) {
  const token = getBearerToken(request.headers.get("authorization"));
  if (!token) return new Response("Missing token", { status: 401 });

  const { tribeId } = await verifyMobileToken(token);
  const subscribers = await getSubscribersByTribeId(tribeId);

  const body = subscribers.map((s) => s.email).join("\n");
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": "attachment; filename=tribe-subscribers.txt",
    },
  });
}
