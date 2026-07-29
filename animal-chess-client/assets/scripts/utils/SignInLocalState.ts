export interface SignInStorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}

const LOCAL_SIGNED_DATE_KEY = 'animal_chess_last_signed_date';

export function buildLocalDateText(now: Date = new Date()): string {
    const year = now.getFullYear();
    const month = leftPadTwo(now.getMonth() + 1);
    const day = leftPadTwo(now.getDate());
    return `${year}-${month}-${day}`;
}

export function hasSignedTodayLocally(storage: SignInStorageLike, userId: number | Date, now: Date = new Date()): boolean {
    if (userId instanceof Date) {
        now = userId;
        userId = 0;
    }
    return storage.getItem(buildUserScopedSignInStorageKey(LOCAL_SIGNED_DATE_KEY, userId)) === buildLocalDateText(now);
}

export function markSignedTodayLocally(storage: SignInStorageLike, userId: number | Date, now: Date = new Date()): void {
    if (userId instanceof Date) {
        now = userId;
        userId = 0;
    }
    storage.setItem(buildUserScopedSignInStorageKey(LOCAL_SIGNED_DATE_KEY, userId), buildLocalDateText(now));
}

export function shouldAutoPopupSignIn(signedToday: boolean, storage: SignInStorageLike, userId: number | Date, now: Date = new Date()): boolean {
    if (signedToday) {
        return false;
    }

    return !hasSignedTodayLocally(storage, userId, now);
}

export function buildUserScopedSignInStorageKey(baseKey: string, userId: number): string {
    return `${baseKey}_${userId}`;
}

function leftPadTwo(value: number): string {
    return value < 10 ? `0${value}` : `${value}`;
}
