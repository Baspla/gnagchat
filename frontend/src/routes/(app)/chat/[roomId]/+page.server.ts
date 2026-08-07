import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { roomId } = params;

	if (!locals.user) {
		throw error(401, 'Nicht angemeldet');
	}

	return {
		roomId,
		user: locals.user,
	};
};