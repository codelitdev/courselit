import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    return auth.handler(req);
}

export async function GET(req: Request) {
    // Required: IdP-initiated flows redirect to this URL after POST
    return NextResponse.redirect(new URL("/", req.url));
}
