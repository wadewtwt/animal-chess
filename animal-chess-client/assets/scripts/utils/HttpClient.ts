import { NetworkManager } from './NetworkManager';

export class HttpError extends Error {
    public readonly status: number;
    public readonly payload: any;

    constructor(status: number, message: string, payload?: any) {
        super(message);
        this.status = status;
        this.payload = payload;
    }
}

export class HttpClient {
    public static async get<T>(path: string, token?: string): Promise<T> {
        return this.request<T>('GET', path, undefined, token);
    }

    public static async post<T>(path: string, body?: unknown, token?: string): Promise<T> {
        return this.request<T>('POST', path, body, token);
    }

    public static async put<T>(path: string, body?: unknown, token?: string): Promise<T> {
        return this.request<T>('PUT', path, body, token);
    }

    public static async request<T>(method: 'GET' | 'POST' | 'PUT', path: string, body?: unknown, token?: string): Promise<T> {
        const url = this.resolveUrl(path);
        const wxObj = (globalThis as any).wx;

        if (wxObj && typeof wxObj.request === 'function') {
            return this.requestByWechat<T>(wxObj, url, method, body, token);
        }

        return this.requestByFetch<T>(url, method, body, token);
    }

    private static resolveUrl(path: string): string {
        if (/^https?:\/\//.test(path)) {
            return path;
        }
        return `${NetworkManager.getInstance().getHttpBaseUrl()}${path}`;
    }

    private static async requestByFetch<T>(url: string, method: 'GET' | 'POST' | 'PUT', body?: unknown, token?: string): Promise<T> {
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: body === undefined ? undefined : JSON.stringify(body),
        });

        const text = await response.text();
        const payload = text ? this.safeParse(text) : null;
        if (!response.ok) {
            throw new HttpError(response.status, this.extractMessage(payload, response.statusText), payload);
        }

        return payload as T;
    }

    private static requestByWechat<T>(wxObj: any, url: string, method: 'GET' | 'POST' | 'PUT', body?: unknown, token?: string): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            wxObj.request({
                url,
                method,
                data: body,
                header: {
                    'content-type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                success: (response: any) => {
                    const payload = response.data;
                    if (response.statusCode >= 200 && response.statusCode < 300) {
                        resolve(payload as T);
                        return;
                    }
                    reject(new HttpError(response.statusCode, this.extractMessage(payload, 'request failed'), payload));
                },
                fail: (error: any) => {
                    reject(error);
                },
            });
        });
    }

    private static safeParse(text: string): any {
        try {
            return JSON.parse(text);
        } catch {
            return text;
        }
    }

    private static extractMessage(payload: any, fallback: string): string {
        if (payload && typeof payload === 'object' && typeof payload.error === 'string') {
            return payload.error;
        }
        if (typeof payload === 'string' && payload.trim()) {
            return payload;
        }
        return fallback;
    }
}
