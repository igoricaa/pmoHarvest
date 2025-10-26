import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createHarvestClient } from '@/lib/harvest';
import { getErrorMessage } from '@/lib/api-utils';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params;
    const harvestClient = createHarvestClient(accessToken);
    const taskAssignments = await harvestClient.getTaskAssignments(Number(id), {
      is_active: true,
    });

    return NextResponse.json(taskAssignments);
  } catch (error) {
    console.error('Error fetching task assignments:', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to fetch task assignments') },
      { status: 500 },
    );
  }
}
