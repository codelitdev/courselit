const GIPHY_API_KEY = process.env.GIPHY_API_KEY;

export async function GET() {
    try {
        const response = await fetch(
            `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20`,
        );
        const data = await response.json();
        return Response.json(data);
    } catch (error) {
        return Response.json({ error: "Error fetching GIFs" }, { status: 500 });
    }
}
