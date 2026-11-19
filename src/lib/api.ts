export type ApiError = {
  error?: string;
  message?: string;
};

const API_BASE = "/api";

async function request<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init.headers
    }
  });

  const payload = (await response.json().catch(() => ({}))) as T & ApiError;

  if (!response.ok) {
    throw new Error(
      payload.message || payload.error || `Request failed (${response.status})`
    );
  }

  return payload;
}

export const api = {
  get<T>(path: string) {
    return request<T>(path, { method: "GET" });
  },

  post<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: "POST",
      body: JSON.stringify(body ?? {})
    });
  },

  put<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: "PUT",
      body: JSON.stringify(body ?? {})
    });
  },

  delete<T>(path: string) {
    return request<T>(path, { method: "DELETE" });
  }
};
