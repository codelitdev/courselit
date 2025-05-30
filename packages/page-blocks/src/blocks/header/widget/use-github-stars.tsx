import useSWR from "swr";

interface GitHubStarsResponse {
    stargazers_count: number;
}

async function fetchGithubStars(
    githubRepo: string,
): Promise<GitHubStarsResponse> {
    const response = await fetch(`https://api.github.com/repos/${githubRepo}`);
    if (!response.ok) {
        throw new Error("Failed to fetch stargazers count");
    }
    return response.json();
}

export function useGithubStars(githubRepo: string) {
    const { data, isLoading, error } = useSWR(
        [githubRepo],
        ([githubRepo]) => fetchGithubStars(githubRepo),
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000, // Revalidate at most once per minute
        },
    );

    return {
        stargazersCount: data?.stargazers_count ?? 0,
        isLoading,
        error: error as Error | null,
    };
}
