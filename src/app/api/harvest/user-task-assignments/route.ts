import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createHarvestClient } from '@/lib/harvest';
import { getErrorMessage } from '@/lib/api-utils';

/**
 * Get User Task Assignments for a Specific Project
 *
 * This endpoint fetches task assignments for a specific project assigned to the authenticated user.
 * Unlike /projects/{id}/task_assignments (admin/manager only), this works for all users.
 *
 * Query params:
 * - projectId: The project ID to get tasks for
 */
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

    // Get projectId from query params
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId query parameter is required' }, { status: 400 });
    }

    const harvestClient = createHarvestClient(accessToken);

    // Fetch task assignments for the specified project
    const taskAssignments = await harvestClient.getCurrentUserTaskAssignments(Number(projectId));

    return NextResponse.json(taskAssignments);
  } catch (error) {
    console.error('Error fetching user task assignments:', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to fetch task assignments') },
      { status: 500 }
    );
  }
}
