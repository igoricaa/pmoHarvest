import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createHarvestClient } from '@/lib/harvest';
import { getErrorMessage } from '@/lib/api-utils';
import { logError } from '@/lib/logger';
import { validateRequest } from '@/lib/validation/validate-request';
import { expenseCreateSchema } from '@/lib/validation/harvest-schemas';
import type { CreateExpenseInput, ExpenseQueryParams } from '@/types/harvest';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user-specific Harvest token
    const { accessToken } = await auth.api.getAccessToken({
      body: { providerId: 'harvest' },
      headers: request.headers,
    });

    if (!accessToken) {
      return NextResponse.json({ error: 'No Harvest access token found' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const params: ExpenseQueryParams = {
      page: searchParams.get('page') ? Number(searchParams.get('page')) : undefined,
      per_page: searchParams.get('per_page') ? Number(searchParams.get('per_page')) : undefined,
      user_id: searchParams.get('user_id') ? Number(searchParams.get('user_id')) : undefined,
      project_id: searchParams.get('project_id')
        ? Number(searchParams.get('project_id'))
        : undefined,
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
      is_billed: searchParams.get('is_billed')
        ? searchParams.get('is_billed') === 'true'
        : undefined,
    };

    const harvestClient = createHarvestClient(accessToken);
    const expenses = await harvestClient.getExpenses(params);

    return NextResponse.json(expenses);
  } catch (error) {
    logError('Failed to fetch expenses', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to fetch expenses') },
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

    // Get user-specific Harvest token
    const { accessToken } = await auth.api.getAccessToken({
      body: { providerId: 'harvest' },
      headers: request.headers,
    });

    if (!accessToken) {
      return NextResponse.json({ error: 'No Harvest access token found' }, { status: 401 });
    }

    // Check if request contains FormData (multipart) or JSON
    const contentType = request.headers.get('content-type') || '';
    let expenseData;

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData with receipt upload
      const formData = await request.formData();
      expenseData = {
        project_id: Number(formData.get('project_id')),
        expense_category_id: Number(formData.get('expense_category_id')),
        spent_date: formData.get('spent_date') as string,
        total_cost: formData.get('total_cost') ? Number(formData.get('total_cost')) : undefined,
        notes: (formData.get('notes') as string) || undefined,
        billable: formData.get('billable') === 'true' ? true : undefined,
        receipt: formData.get('receipt') as File | undefined,
      };
    } else {
      // Handle JSON
      expenseData = await request.json();
    }

    // Validate request body (excluding receipt field for FormData)
    const { receipt, ...validatableData } = expenseData;
    const validation = validateRequest(expenseCreateSchema, validatableData);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.message, errors: validation.errors },
        { status: 400 }
      );
    }

    const harvestClient = createHarvestClient(accessToken);
    const expense = await harvestClient.createExpense({ ...validation.data, receipt });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    logError('Failed to create expense', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to create expense') },
      { status: 500 }
    );
  }
}
