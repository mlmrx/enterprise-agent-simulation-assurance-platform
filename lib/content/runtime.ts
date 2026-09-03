const publishedRoot =
  "https://raw.githubusercontent.com/mlmrx/enterprise-agent-simulation-assurance-platform/main/content";

export async function publishedContent<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${publishedRoot}/${path}`, {
      next: { revalidate: 900 },
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(2_500),
    });
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}
