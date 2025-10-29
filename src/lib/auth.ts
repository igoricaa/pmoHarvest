import { betterAuth } from 'better-auth';
import { genericOAuth } from 'better-auth/plugins';
import { customSession } from 'better-auth/plugins';
import { Pool } from 'pg';

// Initialize PostgreSQL connection (Neon or other Postgres provider)
// This only stores OAuth tokens and sessions, NOT user data (that's in Harvest)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const auth = betterAuth({
  database: pool,

  // Base URL for your app
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

  // Trust proxy headers (for production behind reverse proxy)
  trustedOrigins: process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : [],

  // Advanced cookie configuration for production
  advanced: {
    cookiePrefix: 'better-auth',
    useSecureCookies: process.env.NODE_ENV === 'production',
    defaultCookieAttributes: {
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      path: '/',
    },
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },

  // User schema with Harvest-specific fields
  user: {
    additionalFields: {
      firstName: {
        type: 'string',
        required: false,
      },
      lastName: {
        type: 'string',
        required: false,
      },
      harvestUserId: {
        type: 'number',
        required: false,
      },
      harvestRoles: {
        type: 'string',
        required: false,
      },
      accessRoles: {
        type: 'string', // JSON string of array ['administrator', 'manager', 'member']
        required: false,
      },
      isContractor: {
        type: 'boolean',
        required: false,
        defaultValue: false,
      },
      weeklyCapacity: {
        type: 'number',
        required: false,
      },
      defaultHourlyRate: {
        type: 'number',
        required: false,
      },
      costRate: {
        type: 'number',
        required: false,
      },
    },
  },

  plugins: [
    // Harvest OAuth provider
    genericOAuth({
      config: [
        {
          providerId: 'harvest',
          clientId: process.env.HARVEST_OAUTH_CLIENT_ID!,
          clientSecret: process.env.HARVEST_OAUTH_CLIENT_SECRET!,
          authorizationUrl: 'https://id.getharvest.com/oauth2/authorize',
          tokenUrl: 'https://id.getharvest.com/api/v2/oauth2/token',
          userInfoUrl: 'https://api.harvestapp.com/v2/users/me',
          // Harvest doesn't use explicit scopes - access is determined by user permissions in the account
          scopes: [],
          // Request offline access to ensure refresh token is issued
          accessType: 'offline',
          // Ensure consent prompt to get refresh token every time
          prompt: 'consent',

          // Custom function to fetch user info from Harvest
          getUserInfo: async tokens => {
            const response = await fetch('https://api.harvestapp.com/v2/users/me', {
              headers: {
                Authorization: `Bearer ${tokens.accessToken}`,
                'Harvest-Account-Id': process.env.HARVEST_ACCOUNT_ID!,
                'User-Agent': 'PMO Harvest Portal (auth)',
              },
            });

            if (!response.ok) {
              throw new Error('Failed to fetch user info from Harvest');
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
          mapProfileToUser: profile => {
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
            } as any;
          },
        },
      ],
    }),

    // Custom session to add Harvest roles and permissions
    customSession(async ({ user, session }) => {
      // Parse access roles from JSON string
      const userWithFields = user as typeof user & {
        accessRoles?: string;
        harvestRoles?: string;
      };

      const accessRoles: string[] = userWithFields.accessRoles
        ? JSON.parse(userWithFields.accessRoles)
        : [];
      const harvestRoles: string[] = userWithFields.harvestRoles
        ? JSON.parse(userWithFields.harvestRoles)
        : [];

      // Determine primary role
      const primaryRole: string = accessRoles[0] || 'member';

      // Define permissions based on Harvest access roles
      const permissions = getPermissionsForRole(primaryRole);

      return {
        user: {
          ...user,
          harvestUserId: (user as any).harvestUserId, // Explicitly include for TypeScript
          accessRoles,
          harvestRoles,
          primaryRole,
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
  permissions.timeEntries = ['create', 'read', 'update', 'delete'];
  permissions.expenses = ['create', 'read', 'update', 'delete'];
  permissions.projects = ['read'];
  permissions.reports = ['read'];

  // Manager permissions (inherit member + additional)
  if (role === 'manager') {
    permissions.expenses.push('approve');
    permissions.projects.push('manage');
    permissions.users.push('read');
    permissions.reports.push('export');
  }

  // Administrator permissions (full access)
  if (role === 'administrator') {
    permissions.timeEntries = ['create', 'read', 'update', 'delete'];
    permissions.expenses = ['create', 'read', 'update', 'delete', 'approve'];
    permissions.projects = ['read', 'manage'];
    permissions.users = ['read', 'manage'];
    permissions.reports = ['read', 'export'];
  }

  return permissions;
}
