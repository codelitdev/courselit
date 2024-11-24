import { type NextRequest } from "next/server";

const GIPHY_API_KEY = process.env.GIPHY_API_KEY;

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const q = searchParams.get("q");

    if (!q) {
        return Response.json(
            { error: "Query parameter is required" },
            { status: 400 },
        );
    }

    try {
        const response = await fetch(
            `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(q as string)}&limit=20`,
        );
        const data = await response.json();
        return Response.json(data);
    } catch (error) {
        return Response.json({ error: "Error fetching GIFs" }, { status: 500 });
    }
}
