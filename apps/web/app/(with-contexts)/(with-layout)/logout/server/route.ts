import { signOut } from "@/auth";

export async function GET() {
    await signOut();
    return Response.json({ message: "Logged out" });
}
