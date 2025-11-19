import { betterAuth } from "better-auth";
import { genericOAuth } from "better-auth/plugins";
import { customSession } from "better-auth/plugins";
import { Pool } from "pg";

// Initialize PostgreSQL connection (Neon or other Postgres provider)
// This only stores OAuth tokens and sessions, NOT user data (that's in Harvest)
const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
});

export const auth = betterAuth({
	database: pool,
	baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
	trustedOrigins: process.env.NEXT_PUBLIC_APP_URL
		? [process.env.NEXT_PUBLIC_APP_URL]
		: [],
	advanced: {
		cookiePrefix: "better-auth",
		useSecureCookies: process.env.NODE_ENV === "production",
		defaultCookieAttributes: {
			sameSite: "lax",
			secure: process.env.NODE_ENV === "production",
			httpOnly: true,
			path: "/",
		},
	},
	redirect: {
		success: "/dashboard",
		error: "/auth-error",
	},
	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		updateAge: 60 * 60 * 24, // 24 hours
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60, // 5 minutes
		},
	},
	user: {
		additionalFields: {
			firstName: {
				type: "string",
				required: false,
			},
			lastName: {
				type: "string",
				required: false,
			},
			harvestUserId: {
				type: "number",
				required: false,
			},
			harvestRoles: {
				type: "string",
				required: false,
			},
			accessRoles: {
				type: "string", // JSON string of array ['administrator', 'manager', 'member']
				required: false,
			},
			isContractor: {
				type: "boolean",
				required: false,
				defaultValue: false,
			},
			weeklyCapacity: {
				type: "number",
				required: false,
			},
			defaultHourlyRate: {
				type: "number",
				required: false,
			},
			costRate: {
				type: "number",
				required: false,
			},
		},
	},

	plugins: [
		// Harvest OAuth provider
		genericOAuth({
			config: [
				{
					providerId: "harvest",
					clientId: process.env.HARVEST_OAUTH_CLIENT_ID!,
					clientSecret: process.env.HARVEST_OAUTH_CLIENT_SECRET!,
					authorizationUrl: "https://id.getharvest.com/oauth2/authorize",
					tokenUrl: "https://id.getharvest.com/api/v2/oauth2/token",
					userInfoUrl: "https://api.harvestapp.com/v2/users/me",
					// Harvest doesn't use explicit scopes - access is determined by user permissions in the account
					scopes: [],
					// Request offline access to ensure refresh token is issued
					accessType: "offline",
					// Ensure consent prompt to get refresh token every time
					prompt: "consent",

					// Custom function to fetch user info from Harvest
					getUserInfo: async (tokens) => {
						const response = await fetch(
							"https://api.harvestapp.com/v2/users/me",
							{
								headers: {
									Authorization: `Bearer ${tokens.accessToken}`,
									"Harvest-Account-Id": process.env.HARVEST_ACCOUNT_ID!,
									"User-Agent": "PMO Harvest Portal (auth)",
								},
							},
						);

						if (!response.ok) {
							throw new Error("Failed to fetch user info from Harvest");
						}

						const profile = await response.json();

						return {
							id: profile.id.toString(),
							name: `${profile.first_name} ${profile.last_name}`,
							email: profile.email,
							image: profile.avatar_url,
							emailVerified: true,
							data: profile, // Store full profile for mapProfileToUser
						};
					},

					// Map Harvest profile to custom user fields
					mapProfileToUser: (user) => {
						// IMPORTANT: user is the wrapper object from getUserInfo's return
						// The actual Harvest profile is in user.data
						const profile = user.data;

						// Better Auth expects this to return Record<string, any> for additionalFields
						return {
							firstName: profile.first_name,
							lastName: profile.last_name,
							harvestUserId: profile.id,
							harvestRoles: JSON.stringify(profile.roles || []),
							accessRoles: JSON.stringify(profile.access_roles || []),
							isContractor: profile.is_contractor || false,
							weeklyCapacity: profile.weekly_capacity,
							defaultHourlyRate: profile.default_hourly_rate,
							costRate: profile.cost_rate,
						} as Record<string, unknown>;
					},
				},
			],
		}),

		// Custom session to add Harvest roles and permissions
		// IMPORTANT: This fetches fresh user data from Harvest API on every session request
		// to ensure permissions are always up-to-date (leverages 5min cookie cache)
		customSession(async ({ user, session }) => {
			// Type assertion for user fields stored in database
			const userWithFields = user as typeof user & {
				accessRoles?: string;
				harvestRoles?: string;
				firstName?: string;
				lastName?: string;
				harvestUserId?: number;
				isContractor?: boolean;
				weeklyCapacity?: number;
				defaultHourlyRate?: number;
				costRate?: number;
			};

			// Initialize with database values (fallback)
			let accessRoles: string[] = userWithFields.accessRoles
				? JSON.parse(userWithFields.accessRoles)
				: [];
			let harvestRoles: string[] = userWithFields.harvestRoles
				? JSON.parse(userWithFields.harvestRoles)
				: [];
			let firstName = userWithFields.firstName;
			let lastName = userWithFields.lastName;
			let isContractor = userWithFields.isContractor;
			let weeklyCapacity = userWithFields.weeklyCapacity;
			let defaultHourlyRate = userWithFields.defaultHourlyRate;
			let costRate = userWithFields.costRate;

			// Try to fetch fresh data from Harvest API
			try {
				// Get user's Harvest access token from account table using direct SQL query
				const accountResult = await pool.query(
					'SELECT "accessToken" FROM account WHERE "userId" = $1 AND "providerId" = $2 LIMIT 1',
					[user.id, "harvest"],
				);

				const accessToken = accountResult.rows[0]?.accessToken;

				if (accessToken) {
					// Fetch current user data from Harvest API
					const response = await fetch(
						"https://api.harvestapp.com/v2/users/me",
						{
							headers: {
								Authorization: `Bearer ${accessToken}`,
								"Harvest-Account-Id": process.env.HARVEST_ACCOUNT_ID!,
								"User-Agent": "PMO Harvest Portal (session)",
							},
						},
					);

					if (response.ok) {
						const profile = await response.json();

						// Parse fresh roles from Harvest
						const freshAccessRoles = profile.access_roles || [];
						const freshHarvestRoles = profile.roles || [];

						// Check if roles have changed
						const rolesChanged =
							JSON.stringify(freshAccessRoles) !==
								JSON.stringify(accessRoles) ||
							JSON.stringify(freshHarvestRoles) !==
								JSON.stringify(harvestRoles);

						// Update local variables with fresh data
						accessRoles = freshAccessRoles;
						harvestRoles = freshHarvestRoles;
						firstName = profile.first_name;
						lastName = profile.last_name;
						isContractor = profile.is_contractor || false;
						weeklyCapacity = profile.weekly_capacity;
						defaultHourlyRate = profile.default_hourly_rate;
						costRate = profile.cost_rate;

						// Update database if roles changed (async, don't block session return)
						if (rolesChanged) {
							pool
								.query(
									`UPDATE "user" SET
                    "accessRoles" = $1,
                    "harvestRoles" = $2,
                    "firstName" = $3,
                    "lastName" = $4,
                    "isContractor" = $5,
                    "weeklyCapacity" = $6,
                    "defaultHourlyRate" = $7,
                    "costRate" = $8,
                    "updatedAt" = NOW()
                  WHERE id = $9`,
									[
										JSON.stringify(freshAccessRoles),
										JSON.stringify(freshHarvestRoles),
										profile.first_name,
										profile.last_name,
										profile.is_contractor || false,
										profile.weekly_capacity,
										profile.default_hourly_rate,
										profile.cost_rate,
										user.id,
									],
								)
								.catch((err: unknown) => {
									console.error(
										"Failed to update user with fresh Harvest data:",
										err,
									);
								});
						}
					}
					// If fetch fails (401, 403, network error), fall back to database values
				}
			} catch (error) {
				// Log error but don't fail the session - use database values as fallback
				console.error(
					"Error fetching fresh Harvest data in customSession:",
					error,
				);
			}

			// Determine primary role from fresh/fallback data
			const primaryRole: string = accessRoles[0] || "member";

			// Define permissions based on Harvest access roles
			const permissions = getPermissionsForRole(primaryRole);

			return {
				user: {
					...user,
					firstName,
					lastName,
					harvestUserId: userWithFields.harvestUserId,
					accessRoles,
					harvestRoles,
					primaryRole,
					isContractor,
					weeklyCapacity,
					defaultHourlyRate,
					costRate,
					permissions,
				},
				session,
			};
		}),
	],
});

// Helper function to map Harvest roles to permissions
function getPermissionsForRole(role: string) {
	const permissions = {
		timeEntries: [] as string[],
		expenses: [] as string[],
		projects: [] as string[],
		users: [] as string[],
		reports: [] as string[],
	};

	// Member (Consultant) permissions
	permissions.timeEntries = ["create", "read", "update", "delete"];
	permissions.expenses = ["create", "read", "update", "delete"];
	permissions.projects = ["read"];
	permissions.reports = ["read"];

	// Manager permissions (inherit member + additional)
	if (role === "manager") {
		permissions.expenses.push("approve");
		permissions.projects.push("manage");
		permissions.users.push("read");
		permissions.reports.push("export");
	}

	// Administrator permissions (full access)
	if (role === "administrator") {
		permissions.timeEntries = ["create", "read", "update", "delete"];
		permissions.expenses = ["create", "read", "update", "delete", "approve"];
		permissions.projects = ["read", "manage"];
		permissions.users = ["read", "manage"];
		permissions.reports = ["read", "export"];
	}

	return permissions;
}
