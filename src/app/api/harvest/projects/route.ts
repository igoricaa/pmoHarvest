import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createHarvestClient } from '@/lib/harvest';
import { getErrorMessage } from '@/lib/api-utils';
import { logError } from '@/lib/logger';
import { isAdminOrManager } from '@/lib/admin-utils';
import { validateRequest } from '@/lib/validation/validate-request';
import { projectCreateSchema } from '@/lib/validation/harvest-schemas';
import type { CreateProjectInput } from '@/types/harvest';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accessToken } = await auth.api.getAccessToken({
      body: { providerId: 'harvest' },
      headers: request.headers,
    });

    if (!accessToken) {
      return NextResponse.json({ error: 'No Harvest access token found' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const isActive = searchParams.get('is_active');

    const harvestClient = createHarvestClient(accessToken);
    const projects = await harvestClient.getProjects({
      is_active: isActive ? isActive === 'true' : true, // Default to active projects only
    });

    return NextResponse.json(projects);
  } catch (error) {
    logError('Failed to fetch projects', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to fetch projects') },
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

    // Admin or Manager access required
    if (!isAdminOrManager(session)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin or Manager access required' },
        { status: 403 }
      );
    }

    const { accessToken } = await auth.api.getAccessToken({
      body: { providerId: 'harvest' },
      headers: request.headers,
    });

    if (!accessToken) {
      return NextResponse.json({ error: 'No Harvest access token found' }, { status: 401 });
    }

    const body = await request.json();

    // Validate request body
    const validation = validateRequest(projectCreateSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.message, errors: validation.errors },
        { status: 400 }
      );
    }

    const client = createHarvestClient(accessToken);
    const project = await client.createProject(validation.data);

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    logError('Failed to create project', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to create project') },
      { status: 500 }
    );
  }
}
