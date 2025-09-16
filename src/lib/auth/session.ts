
import { getServerSession } from "next-auth/next";
import { authOptions } from "./config";
import { DatabaseQueries } from "@/lib/db/queries";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  return await DatabaseQueries.getUserByEmail(session.user.email);
}

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requireSeller() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "seller" && user.role !== "both")) {
    throw new Error("Seller access required");
  }
  return user;
}