import { sys } from 'cc';
import { HttpClient } from './HttpClient';

export interface LoginUserSummary {
    id: number;
    appName?: string;
    openId: string;
    unionId?: string;
    nickname?: string;
    avatarUrl?: string;
}

interface WxLoginRequest {
    app_name: string;
    code: string;
    nickname?: string;
    avatarUrl?: string;
}

interface WxLoginResponse {
    token: string;
    user: LoginUserSummary;
}

export class AuthManager {
    private static readonly TOKEN_KEY = 'animal_chess_auth_token';
    private static readonly USER_KEY = 'animal_chess_auth_user';
    private static readonly APP_NAME = 'animal_chess';
    private static loginPromise: Promise<LoginUserSummary> | null = null;

    public static isWechatSupported(): boolean {
        const wxObj = (globalThis as any).wx;
        return !!wxObj && typeof wxObj.login === 'function';
    }

    public static getToken(): string {
        return sys.localStorage.getItem(this.TOKEN_KEY) || '';
    }

    public static getStoredUser(): LoginUserSummary | null {
        const raw = sys.localStorage.getItem(this.USER_KEY);
        if (!raw) {
            return null;
        }

        try {
            return JSON.parse(raw) as LoginUserSummary;
        } catch {
            return null;
        }
    }

    public static updateStoredUser(user: Partial<LoginUserSummary>): LoginUserSummary | null {
        const current = this.getStoredUser();
        if (!current) {
            return null;
        }
        const updated = { ...current, ...user };
        sys.localStorage.setItem(this.USER_KEY, JSON.stringify(updated));
        return updated;
    }

    public static clear(): void {
        sys.localStorage.removeItem(this.TOKEN_KEY);
        sys.localStorage.removeItem(this.USER_KEY);
    }

    public static async ensureLogin(forceRefresh: boolean = false, userInfo?: { nickname?: string; avatarUrl?: string }): Promise<LoginUserSummary> {
        if (!forceRefresh) {
            const token = this.getToken();
            const user = this.getStoredUser();
            if (token && user) {
                return user;
            }
        }

        if (this.loginPromise) {
            return this.loginPromise;
        }

        this.loginPromise = this.login(forceRefresh, userInfo);
        try {
            return await this.loginPromise;
        } finally {
            this.loginPromise = null;
        }
    }

    private static async login(forceRefresh: boolean, userInfo?: { nickname?: string; avatarUrl?: string }): Promise<LoginUserSummary> {

        const code = await this.requestWechatCode();
        const requestBody: WxLoginRequest = {
            app_name: this.APP_NAME,
            code,
            ...(userInfo?.nickname ? { nickname: userInfo.nickname } : {}),
            ...(userInfo?.avatarUrl ? { avatarUrl: userInfo.avatarUrl } : {}),
        };
        const response = await HttpClient.post<WxLoginResponse>('/api/wx/login', requestBody);
        sys.localStorage.setItem(this.TOKEN_KEY, response.token);
        sys.localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
        return response.user;
    }

    private static requestWechatCode(): Promise<string> {
        if (!this.isWechatSupported()) {
            return Promise.reject(new Error('当前环境不支持微信登录'));
        }
        const wxObj = (globalThis as any).wx;

        return new Promise<string>((resolve, reject) => {
            wxObj.login({
                success: (loginRes: any) => {
                    if (loginRes && loginRes.code) {
                        resolve(loginRes.code);
                        return;
                    }
                    reject(new Error('微信登录未返回有效 code'));
                },
                fail: (error: any) => reject(error),
            });
        });
    }
}
