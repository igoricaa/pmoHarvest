import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createHarvestClient } from '@/lib/harvest';
import { logError } from '@/lib/logger';
import { getErrorMessage } from '@/lib/api-utils';

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
    const categories = await harvestClient.getExpenseCategories({ is_active: true });

    return NextResponse.json(categories);
  } catch (error) {
    logError('Failed to fetch expense categories', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to fetch expense categories') },
      { status: 500 }
    );
  }
}
