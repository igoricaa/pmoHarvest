import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createHarvestClient } from '@/lib/harvest';
import { getErrorMessage } from '@/lib/api-utils';
import type { UpdateTimeEntryInput } from '@/types/harvest';

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
    const timeEntry = await harvestClient.getTimeEntry(Number(id));

    return NextResponse.json(timeEntry);
  } catch (error) {
    console.error('Error fetching time entry:', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to fetch time entry') },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const body: UpdateTimeEntryInput = await request.json();

    const harvestClient = createHarvestClient(accessToken);
    const timeEntry = await harvestClient.updateTimeEntry(Number(id), body);

    return NextResponse.json(timeEntry);
  } catch (error) {
    console.error('Error updating time entry:', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to update time entry') },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    await harvestClient.deleteTimeEntry(Number(id));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting time entry:', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to delete time entry') },
      { status: 500 },
    );
  }
}
