import { AuthManager, LoginUserSummary } from './AuthManager';
import { HttpClient } from './HttpClient';

export interface UserProfileUpdateRequest {
    nickname: string;
    avatarUrl: string;
}

export interface UserProfileUpdateResponse {
    user?: LoginUserSummary;
    nickname?: string;
    avatarUrl?: string;
}

export class UserProfileApi {
    public static async updateProfile(profile: UserProfileUpdateRequest): Promise<LoginUserSummary | null> {
        const response = await HttpClient.put<UserProfileUpdateResponse | LoginUserSummary>(
            '/api/wx/profile',
            profile,
            AuthManager.getToken(),
        );
        const user = (response as UserProfileUpdateResponse).user ?? response as LoginUserSummary;
        return AuthManager.updateStoredUser({
            nickname: user.nickname ?? profile.nickname,
            avatarUrl: user.avatarUrl ?? profile.avatarUrl,
        });
    }
}
