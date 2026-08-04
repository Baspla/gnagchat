import { api } from '$lib/api';

export type UserInfo = {
    id: string;
    name: string;
    image: string | null;
};

class UserCache {
    private cache = $state<Map<string, UserInfo>>(new Map());
    private pending = new Map<string, Promise<UserInfo | null>>();

    async getUser(userId: string): Promise<UserInfo | null> {
        // Return from cache if available
        const cached = this.cache.get(userId);
        if (cached) return cached;

        // Avoid duplicate requests for the same user
        const pending = this.pending.get(userId);
        if (pending) return pending;

        const promise = this.fetchUser(userId);
        this.pending.set(userId, promise);
        const result = await promise;
        this.pending.delete(userId);
        return result;
    }

    private async fetchUser(userId: string): Promise<UserInfo | null> {
        try {
            const response = await api.users({ id: userId }).get();
            if (response.error || !response.data) {
                console.error(`[UserCache] Failed to fetch user ${userId}:`, response.error);
                return null;
            }
            const userData = response.data as UserInfo;
            this.cache.set(userId, userData);
            return userData;
        } catch (e) {
            console.error(`[UserCache] Error fetching user ${userId}:`, e);
            return null;
        }
    }

    getCached(userId: string): UserInfo | undefined {
        return this.cache.get(userId);
    }
}

export const userCache = new UserCache();