export async function searchFetcher<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Search is unavailable. Please try again.");
  return response.json();
}
