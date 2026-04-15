import { NextRequest } from "next/server";
import { prisma } from "./prisma";
import { verifyToken } from "@/lib/jwt";

export interface AuthContext {
  readonly userId: string;
  readonly activeRole: string;
}

function getTokenFromHeader(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");

  if (!authHeader) return null;

  const [type, token] = authHeader.split(" ");

  if (type !== "Bearer" || !token) return null;

  return token;
}

export async function getAuthContext(
  req: NextRequest
): Promise<AuthContext> {

  const token = getTokenFromHeader(req);

  if (!token) {
    throw new Error("Unauthorized");
  }

  // decode JWT
  const { userId, activeRole } = verifyToken(token);

  // validate activeRole still belongs to user
  const roleExists = await prisma.userRole.findFirst({
    where: {
      userId,
      role: {
        name: activeRole
      }
    }
  });

  if (!roleExists) {
    throw new Error("Unauthorized: invalid role context");
  }

  return { userId, activeRole };
}
