export type UnsplashPhoto = {
  id: string;
  url: string;
  thumbUrl: string;
  alt?: string;
  photographer?: string;
};

export type UnsplashSearchResult = {
  configured: boolean;
  items: UnsplashPhoto[];
};

export type UnsplashClient = {
  search(query?: string): Promise<UnsplashSearchResult>;
};

type UnsplashPhotoResponse = {
  id?: unknown;
  alt_description?: unknown;
  description?: unknown;
  urls?: { regular?: unknown; small?: unknown };
  user?: { name?: unknown };
};

type UnsplashSearchResponse = {
  results?: UnsplashPhotoResponse[];
};

export class DisabledUnsplashClient implements UnsplashClient {
  async search(): Promise<UnsplashSearchResult> {
    return { configured: false, items: [] };
  }
}

export class HttpUnsplashClient implements UnsplashClient {
  constructor(
    private readonly accessKey: string,
    private readonly request: typeof fetch = fetch,
  ) {}

  async search(query?: string): Promise<UnsplashSearchResult> {
    if (!this.accessKey) return { configured: false, items: [] };
    const trimmedQuery = query?.trim() ?? "";
    if (!trimmedQuery) return { configured: true, items: [] };

    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", trimmedQuery);
    url.searchParams.set("per_page", "24");
    const response = await this.request(url, {
      headers: {
        accept: "application/json",
        authorization: `Client-ID ${this.accessKey}`,
      },
    });
    if (!response.ok) throw new Error(`unsplash_request_failed_${response.status}`);
    const body = (await response.json()) as UnsplashSearchResponse;
    return {
      configured: true,
      items: (body.results ?? []).flatMap((photo) => {
        if (
          typeof photo.id !== "string" ||
          typeof photo.urls?.regular !== "string" ||
          typeof photo.urls.small !== "string"
        ) {
          return [];
        }
        const alt =
          typeof photo.alt_description === "string"
            ? photo.alt_description
            : typeof photo.description === "string"
              ? photo.description
              : undefined;
        return [
          {
            id: photo.id,
            url: photo.urls.regular,
            thumbUrl: photo.urls.small,
            ...(alt ? { alt } : {}),
            ...(typeof photo.user?.name === "string"
              ? { photographer: photo.user.name }
              : {}),
          },
        ];
      }),
    };
  }
}

export function createUnsplashClientFromEnv(
  env: Record<string, string | undefined> = process.env,
): UnsplashClient {
  const accessKey = env.UNSPLASH_ACCESS_KEY?.trim() ?? "";
  return accessKey ? new HttpUnsplashClient(accessKey) : new DisabledUnsplashClient();
}
