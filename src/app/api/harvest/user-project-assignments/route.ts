import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createHarvestClient } from '@/lib/harvest';
import { getErrorMessage } from '@/lib/api-utils';
import { logError } from '@/lib/logger';

/**
 * Get User Project Assignments
 *
 * This endpoint fetches projects assigned to the authenticated user.
 * Unlike /projects endpoint (admin/manager only), this works for all users.
 *
 * Query Parameters:
 * - raw=true: Returns raw project_assignments data (for manager filtering)
 * - raw=false (default): Returns transformed projects data (backward compatible)
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

    const searchParams = request.nextUrl.searchParams;
    const raw = searchParams.get('raw');

    const harvestClient = createHarvestClient(accessToken);

    // Fetch current user's project assignments (works for all users)
    // Uses /users/me endpoint which automatically resolves to authenticated user
    const assignments = await harvestClient.getCurrentUserProjectAssignments();

    // Return raw data if requested (for manager filtering with is_project_manager flag)
    if (raw === 'true') {
      return NextResponse.json(assignments);
    }

    // Transform project_assignments response to match projects response structure
    // Harvest returns { project_assignments: [...] } but we need { projects: [...] }
    const transformedResponse = {
      projects: assignments.project_assignments?.map(pa => pa.project) || [],
      per_page: assignments.per_page,
      total_pages: assignments.total_pages,
      total_entries: assignments.total_entries,
      next_page: assignments.next_page,
      previous_page: assignments.previous_page,
      page: assignments.page,
      links: assignments.links,
    };

    return NextResponse.json(transformedResponse);
  } catch (error) {
    logError('Failed to fetch user project assignments', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to fetch project assignments') },
      { status: 500 }
    );
  }
}
