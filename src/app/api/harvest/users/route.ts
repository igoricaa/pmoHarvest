import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createHarvestClient } from '@/lib/harvest';
import { getErrorMessage } from '@/lib/api-utils';
import { logError } from '@/lib/logger';
import { isAdmin } from '@/lib/admin-utils';
import type { CreateUserInput } from '@/types/harvest';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only administrators can list users
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { accessToken } = await auth.api.getAccessToken({
      body: { providerId: 'harvest' },
      headers: request.headers,
    });

    if (!accessToken) {
      return NextResponse.json({ error: 'No Harvest access token found' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const params = {
      is_active: searchParams.get('is_active')
        ? searchParams.get('is_active') === 'true'
        : undefined,
      page: searchParams.get('page') ? Number(searchParams.get('page')) : undefined,
      per_page: searchParams.get('per_page') ? Number(searchParams.get('per_page')) : undefined,
    };

    const client = createHarvestClient(accessToken);
    const users = await client.getUsers(params);

    return NextResponse.json(users);
  } catch (error) {
    logError('Failed to fetch users', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to fetch users') },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only administrators can create users
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { accessToken } = await auth.api.getAccessToken({
      body: { providerId: 'harvest' },
      headers: request.headers,
    });

    if (!accessToken) {
      return NextResponse.json({ error: 'No Harvest access token found' }, { status: 401 });
    }

    const body: CreateUserInput = await request.json();

    const client = createHarvestClient(accessToken);
    const user = await client.createUser(body);

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    logError('Failed to create user', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to create user') },
      { status: 500 }
    );
  }
}
