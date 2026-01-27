import { SignJWT, jwtVerify } from "jose";

export type MobileTokenPayload = {
  userId: string;
  tribeId: string;
  email: string;
  name?: string | null;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function signMobileToken(payload: MobileTokenPayload) {
  // 30 days
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

export async function verifyMobileToken(token: string): Promise<MobileTokenPayload> {
  const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
  const p = payload as Partial<MobileTokenPayload>;
  if (!p.userId || !p.tribeId || !p.email) throw new Error("Invalid token");
  return {
    userId: p.userId,
    tribeId: p.tribeId,
    email: p.email,
    name: p.name ?? null,
  };
}

export function getBearerToken(authHeader: string | null) {
  if (!authHeader) return null;
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}
