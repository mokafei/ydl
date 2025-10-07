const API_BASE_URL = process.env.REACT_APP_API_BASE_URL ?? "http://127.0.0.1:8000";

export async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`请求失败: ${response.status} ${response.statusText} - ${text}`);
  }

  return response.json() as Promise<T>;
}
