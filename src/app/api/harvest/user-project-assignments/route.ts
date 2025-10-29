import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createHarvestClient } from '@/lib/harvest';
import { getErrorMessage } from '@/lib/api-utils';

/**
 * Get User Project Assignments
 *
 * This endpoint fetches projects assigned to the authenticated user.
 * Unlike /projects endpoint (admin/manager only), this works for all users.
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

    const harvestClient = createHarvestClient(accessToken);

    // Fetch current user's project assignments (works for all users)
    // Uses /users/me endpoint which automatically resolves to authenticated user
    const assignments = await harvestClient.getCurrentUserProjectAssignments();

    // Transform project_assignments response to match projects response structure
    // Harvest returns { project_assignments: [...] } but we need { projects: [...] }
    const transformedResponse = {
      projects: (assignments as any).project_assignments?.map((pa: any) => pa.project) || [],
      per_page: (assignments as any).per_page,
      total_pages: (assignments as any).total_pages,
      total_entries: (assignments as any).total_entries,
      next_page: (assignments as any).next_page,
      previous_page: (assignments as any).previous_page,
      page: (assignments as any).page,
      links: (assignments as any).links,
    };

    return NextResponse.json(transformedResponse);
  } catch (error) {
    console.error('Error fetching user project assignments:', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to fetch project assignments') },
      { status: 500 }
    );
  }
}
