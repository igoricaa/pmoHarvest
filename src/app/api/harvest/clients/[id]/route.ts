import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createHarvestClient } from '@/lib/harvest';
import { getErrorMessage } from '@/lib/api-utils';
import { logError } from '@/lib/logger';
import { isAdminOrManager } from '@/lib/admin-utils';
import { validateRequest } from '@/lib/validation/validate-request';
import { clientUpdateSchema } from '@/lib/validation/harvest-schemas';
import type { UpdateClientInput } from '@/types/harvest';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const clientId = Number(id);

    const client = createHarvestClient(accessToken);
    const clientData = await client.getClient(clientId);

    return NextResponse.json(clientData);
  } catch (error) {
    logError('Failed to fetch client', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to fetch client') },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const clientId = Number(id);
    const body = await request.json();

    // Validate request body
    const validation = validateRequest(clientUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.message, errors: validation.errors },
        { status: 400 }
      );
    }

    const client = createHarvestClient(accessToken);
    const updatedClient = await client.updateClient(clientId, validation.data);

    return NextResponse.json(updatedClient);
  } catch (error) {
    logError('Failed to update client', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to update client') },
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

    const { id } = await params;
    const clientId = Number(id);

    const client = createHarvestClient(accessToken);
    await client.deleteClient(clientId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logError('Failed to delete client', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to delete client') },
      { status: 500 }
    );
  }
}
