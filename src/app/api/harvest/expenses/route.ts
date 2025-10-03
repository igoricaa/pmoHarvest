import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createHarvestClient } from '@/lib/harvest';
import { getErrorMessage } from '@/lib/api-utils';
import type { CreateExpenseInput, ExpenseQueryParams } from '@/types/harvest';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const params: ExpenseQueryParams = {
      page: searchParams.get('page') ? Number(searchParams.get('page')) : undefined,
      per_page: searchParams.get('per_page') ? Number(searchParams.get('per_page')) : undefined,
      user_id: searchParams.get('user_id') ? Number(searchParams.get('user_id')) : undefined,
      project_id: searchParams.get('project_id') ? Number(searchParams.get('project_id')) : undefined,
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
      is_billed: searchParams.get('is_billed') ? searchParams.get('is_billed') === 'true' : undefined,
    };

    const harvestClient = createHarvestClient();
    const expenses = await harvestClient.getExpenses(params);

    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to fetch expenses') },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateExpenseInput = await request.json();

    const harvestClient = createHarvestClient();
    const expense = await harvestClient.createExpense(body);

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to create expense') },
      { status: 500 },
    );
  }
}
