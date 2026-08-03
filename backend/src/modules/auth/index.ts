import { Modules } from "$shared/constants"
import Elysia from "elysia"
import { auth } from "./service"

export const authMiddleware = new Elysia({ name: Modules.AUTH })
	.mount('/api/betterauth', auth.handler) // With just 'api/betterauth' it will result in the mounted path to be 'h/...' since it cuts a hard number of chars.
	.macro({
		auth: {
			async resolve({ status, request: { headers } }) {
				const session = await auth.api.getSession({
					headers
				})

				if (!session) return status(401)

				return {
					user: session.user,
					session: session.session
				}
			}
		},
		groups: (groups: string[]) => (
			{
				resolve: async ({ status, request: { headers } }) => {
					const session = await auth.api.getSession({
						headers
					})

					if (!session) return status(401)

					const userGroups = JSON.parse(session.user.groups || "[]") as string[];

					const hasGroup = groups.some(group => userGroups.includes(group))

					if (!hasGroup) return status(403)

					return {
						user: session.user,
						session: session.session
					}
				}
			}
		)

	})