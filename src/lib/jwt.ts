import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;
console.log("JWT_SECRET:", JWT_SECRET);

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET not defined");
}

export interface JwtPayload {
  userId: string;
  activeRole: string;
}

export function signToken(userId: string, activeRole: string): string {
  return jwt.sign(
    { userId, activeRole },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
}

export function verifyToken(token: string): JwtPayload {
  console.log("Verifying token:", token);

  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    throw new Error("UNAUTHORIZED");
  }
}
