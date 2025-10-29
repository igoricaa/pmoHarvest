/**
 * Custom type definitions for Better Auth with Harvest integration
 */

import type { Session as BetterAuthSession } from 'better-auth/types';

/**
 * Harvest-specific permissions structure
 */
export interface HarvestPermissions {
  timeEntries: string[];
  expenses: string[];
  projects: string[];
  users: string[];
  reports: string[];
}

/**
 * Extended user type with Harvest-specific fields
 */
export interface HarvestUser {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Harvest-specific fields
  firstName?: string;
  lastName?: string;
  harvestUserId?: number;
  accessRoles?: string[];
  harvestRoles?: string[];
  primaryRole?: string;
  isContractor?: boolean;
  weeklyCapacity?: number;
  defaultHourlyRate?: number;
  costRate?: number;
  permissions?: HarvestPermissions;
}

/**
 * Extended session type with Harvest user data
 */
export interface Session {
  user: HarvestUser;
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
    updatedAt: Date;
  };
}
