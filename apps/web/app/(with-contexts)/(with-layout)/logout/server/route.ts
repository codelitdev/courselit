import { signOut } from "@/lib/auth";

export async function GET() {
    await signOut();
    return Response.json({ message: "Logged out" });
}
