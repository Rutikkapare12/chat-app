function xsrfToken(): string {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);

    return match ? decodeURIComponent(match[1]) : '';
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(url, {
        headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': xsrfToken(),
            ...(options.body instanceof FormData
                ? {}
                : { 'Content-Type': 'application/json' }),
            ...options.headers,
        },
        credentials: 'same-origin',
        ...options,
    });

    if (!response.ok) {
        const data = await response.json().catch(() => null);

        throw new Error(data?.message ?? `Request failed (${response.status})`);
    }

    return response.json();
}

export const chatApi = {
    get: <T>(url: string) => request<T>(url),

    post: <T>(url: string, body?: Record<string, unknown> | FormData) =>
        request<T>(url, {
            method: 'POST',
            body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
        }),

    patch: <T>(url: string, body: Record<string, unknown>) =>
        request<T>(url, { method: 'PATCH', body: JSON.stringify(body) }),

    delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
};