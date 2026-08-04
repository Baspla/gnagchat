import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../../db";
import { genericOAuth } from "better-auth/plugins/generic-oauth";
import { env } from "../../env";
import { UserService } from "../user/service";

const userService = UserService;

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "sqlite",
	}),
	user: {
		additionalFields: {
			groups: {
				type: "string",
				default: "[]",
			},
		}
	},
	databaseHooks: {
		user: {
			create: {
				after: async (user) => {
					console.log("New user created:", user);
					await userService.upsertUserAsSystem({
						id: user.id,
						name: user.name,
						email: user.email,
						emailVerified: user.emailVerified,
						image: user.image,
					}).catch(e => {
						console.error("Error upserting user:", e);
					});
					//logging
				}
			}
		},
		session: {
			create: {
				after: async (session) => {
					console.log("New session created:", session);
					//logging
				}
			},
			delete: {
				after: async (session) => {
					console.log("Session deleted:", session);
					//logging
				}
			}
		}
	},
	/*hooks: {
		after: createAuthMiddleware(async (ctx) => {
			if (ctx.path.startsWith("/sign-up")) {
				console.log("Auth context after hook:", ctx);
			}
			ctx.context.newSession
		})
	},*/
	plugins: [genericOAuth({
		config: [
			{
				providerId: env.OAUTH_PROVIDER_ID,
				clientId: env.OAUTH_CLIENT_ID!,
				clientSecret: env.OAUTH_CLIENT_SECRET!,
				discoveryUrl: env.OAUTH_DISCOVERY_URL!,
				// We need this awfulness since basePath and baseURL mess things up when proxied.
				redirectURI: `${env.BETTER_AUTH_URL}/api/betterauth/auth/oauth2/callback/${env.OAUTH_PROVIDER_ID}`,
				scopes: ["openid", "profile", "email", "groups"],
				overrideUserInfo: true,
				mapProfileToUser: async (profile: unknown) => {
					//console.log("OAuth profile:", profile);
					const oauthProfile = (profile ?? {}) as Record<string, unknown>;
					const email = typeof oauthProfile.email === "string" ? oauthProfile.email : "";
					const fallbackName = email.includes("@") ? email.split("@")[0] : "user";
					const user = {
						name:
							typeof oauthProfile.display_name === "string"
								? oauthProfile.display_name
								: typeof oauthProfile.preferred_username === "string"
									? oauthProfile.preferred_username
									: typeof oauthProfile.name === "string"
										? oauthProfile.name
										: fallbackName,
						email,
						image: typeof oauthProfile.picture === "string" ? oauthProfile.picture : undefined,
						emailVerified: Boolean(oauthProfile.email_verified),
						groups: JSON.stringify(Array.isArray(oauthProfile.groups) ? oauthProfile.groups : []),
					};
					//console.log("Mapped user:", user);
					return user;
				},
			},
		],
	}),
	],
	baseURL: env.BETTER_AUTH_URL,
	basePath: "/auth",
	trustedOrigins: [env.BETTER_AUTH_URL, env.API_URL_INTERNAL],
});

