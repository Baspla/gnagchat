import type { Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

type SessionResponse = {
	session?: App.Locals['session'];
	user?: App.Locals['user'];
};

export const handle: Handle = async ({ event, resolve }) => {
	const backendBaseUrl = env.VITE_API_URL_INTERNAL ?? 'http://localhost:3000';
	const sessionEndpoint = `${backendBaseUrl}/betterauth/auth/get-session`;

	// Ensure locals are always defined, even when no valid session exists.
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
		console.error('Failed to populate session in event.locals', error);
	}

	return resolve(event);
};

/*
/** @type {import('@sveltejs/kit').HandleServerError} */
/*
export function handleError({ error, event }) {
    // This WILL print to your terminal stdout in production
    console.error('--- PRODUCTION ERROR CAUGHT ---');
    console.error(error); 
    console.error('--------------------------------');
	return 
    return {
        message: 'Something went wrong, but we logged it!'
    };
}*/