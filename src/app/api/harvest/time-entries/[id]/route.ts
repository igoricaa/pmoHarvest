import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createHarvestClient } from '@/lib/harvest';
import { getErrorMessage } from '@/lib/api-utils';
import { logError } from '@/lib/logger';
import { validateRequest } from '@/lib/validation/validate-request';
import { timeEntryUpdateSchema } from '@/lib/validation/harvest-schemas';
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
    logError('Failed to fetch time entry', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to fetch time entry') },
      { status: 500 }
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
    const body = await request.json();

    // Validate request body
    const validation = validateRequest(timeEntryUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.message, errors: validation.errors },
        { status: 400 }
      );
    }

    const harvestClient = createHarvestClient(accessToken);
    const timeEntry = await harvestClient.updateTimeEntry(Number(id), validation.data);

    return NextResponse.json(timeEntry);
  } catch (error) {
    logError('Failed to update time entry', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to update time entry') },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    logError('Failed to delete time entry', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to delete time entry') },
      { status: 500 }
    );
  }
}
