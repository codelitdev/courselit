import { isAllowedGifUrl } from "@courselit/api-contract";

export type Gif = {
  id: string;
  url: string;
  previewUrl: string;
  title: string;
  width: number | null;
  height: number | null;
};

export type GifSearchResult = {
  configured: boolean;
  items: Gif[];
};

/** Searches GIFs, or lists trending GIFs when the query is empty. */
export type GifClient = {
  search(query?: string): Promise<GifSearchResult>;
};

type GiphyRendition = { url?: unknown; width?: unknown; height?: unknown };

type GiphyGifResponse = {
  id?: unknown;
  title?: unknown;
  images?: {
    fixed_height?: GiphyRendition;
    fixed_width_small?: GiphyRendition;
    fixed_height_small?: GiphyRendition;
  };
};

type GiphyListResponse = {
  data?: GiphyGifResponse[];
};

const GIPHY_RESULT_LIMIT = "20";
function dimension(value: unknown): number | null {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) && parsed > 0
    ? parsed
    : null;
}

export class DisabledGifClient implements GifClient {
  async search(): Promise<GifSearchResult> {
    return { configured: false, items: [] };
  }
}

export class HttpGiphyClient implements GifClient {
  constructor(
    private readonly apiKey: string,
    private readonly request: typeof fetch = fetch,
  ) {}

  async search(query?: string): Promise<GifSearchResult> {
    if (!this.apiKey) return { configured: false, items: [] };
    const trimmedQuery = query?.trim() ?? "";
    const url = new URL(
      trimmedQuery
        ? "https://api.giphy.com/v1/gifs/search"
        : "https://api.giphy.com/v1/gifs/trending",
    );
    url.searchParams.set("api_key", this.apiKey);
    url.searchParams.set("limit", GIPHY_RESULT_LIMIT);
    url.searchParams.set("rating", "pg-13");
    if (trimmedQuery) url.searchParams.set("q", trimmedQuery);
    const response = await this.request(url, {
      headers: { accept: "application/json" },
    });
    if (!response.ok) throw new Error(`giphy_request_failed_${response.status}`);
    const body = (await response.json()) as GiphyListResponse;
    return {
      configured: true,
      items: (body.data ?? []).flatMap((gif) => {
        const full = gif.images?.fixed_height;
        const preview =
          gif.images?.fixed_width_small ?? gif.images?.fixed_height_small ?? full;
        if (
          typeof gif.id !== "string" ||
          typeof full?.url !== "string" ||
          !isAllowedGifUrl(full.url)
        ) {
          return [];
        }
        const previewUrl =
          typeof preview?.url === "string" && isAllowedGifUrl(preview.url)
            ? preview.url
            : full.url;
        return [
          {
            id: gif.id,
            url: full.url,
            previewUrl,
            title:
              typeof gif.title === "string" && gif.title.trim() ? gif.title : "GIF",
            width: dimension(full.width),
            height: dimension(full.height),
          },
        ];
      }),
    };
  }
}

export function createGifClientFromEnv(
  env: Record<string, string | undefined> = process.env,
): GifClient {
  const apiKey = env.GIPHY_API_KEY?.trim() ?? "";
  return apiKey ? new HttpGiphyClient(apiKey) : new DisabledGifClient();
}
