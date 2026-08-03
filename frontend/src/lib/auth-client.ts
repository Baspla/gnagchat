import { createAuthClient } from "better-auth/svelte";
import { env } from '$env/dynamic/public';

export const authClient = createAuthClient({
    baseURL: `${env.PUBLIC_BETTER_AUTH_URL||"PUBLIC_BETTER_AUTH_URL was not set this will cause issues"}/api/betterauth/auth`,
});