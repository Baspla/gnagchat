import type { Handle, HandleServerError } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { authClient } from '$lib/auth-client';
import { svelteKitHandler } from 'better-auth/svelte-kit';

type SessionResponse = {
	session?: App.Locals['session'];
	user?: App.Locals['user'];
};

export const handle: Handle = async ({ event, resolve }) => {
	const backendBaseUrl = env.GNAGCHAT_API_URL_INTERNAL ?? 'http://localhost:3000';
	const sessionEndpoint = `${backendBaseUrl}/betterauth/auth/get-session`;

	event.locals.session = null;
	event.locals.user = null;

	try {
		const response = await event.fetch(sessionEndpoint, {
			headers: {
				cookie: event.request.headers.get('cookie') ?? '',
			},
		});

		if (response.ok) {
			const session = (await response.json()) as SessionResponse | null;
			if (session?.session && session.user) {
				event.locals.session = session.session;
				event.locals.user = session.user;
			}
		}
	} catch (error) {
		// Session population failure is not critical — the app handles missing sessions
	}

	return resolve(event);
};

/** Global server-side error handler — logs to stdout */
export const handleError: HandleServerError = ({ error, event }) => {
	console.error(`[server-error] ${event.request.method} ${event.url.pathname}`, error);
	return {
		message: 'An unexpected error occurred',
	};
};
