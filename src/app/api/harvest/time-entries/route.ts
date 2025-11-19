import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createHarvestClient } from "@/lib/harvest";
import { getErrorMessage } from "@/lib/api-utils";
import { logError } from "@/lib/logger";
import { validateRequest } from "@/lib/validation/validate-request";
import { timeEntryCreateSchema } from "@/lib/validation/harvest-schemas";
import type { TimeEntryQueryParams } from "@/types/harvest";

export async function GET(request: NextRequest) {
	try {
		const session = await auth.api.getSession({ headers: request.headers });
		if (!session?.user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Get user-specific Harvest token
		const { accessToken } = await auth.api.getAccessToken({
			body: { providerId: "harvest" },
			headers: request.headers,
		});

		if (!accessToken) {
			return NextResponse.json(
				{ error: "No Harvest access token found" },
				{ status: 401 },
			);
		}

		const searchParams = request.nextUrl.searchParams;
		const params: TimeEntryQueryParams = {
			page: searchParams.get("page")
				? Number(searchParams.get("page"))
				: undefined,
			per_page: searchParams.get("per_page")
				? Number(searchParams.get("per_page"))
				: undefined,
			user_id: searchParams.get("user_id")
				? Number(searchParams.get("user_id"))
				: undefined,
			project_id: searchParams.get("project_id")
				? Number(searchParams.get("project_id"))
				: undefined,
			from: searchParams.get("from") || undefined,
			to: searchParams.get("to") || undefined,
			is_running: searchParams.get("is_running")
				? searchParams.get("is_running") === "true"
				: undefined,
			approval_status: searchParams.get("approval_status") as
				| "unsubmitted"
				| "submitted"
				| "approved"
				| undefined,
		};

		const harvestClient = createHarvestClient(accessToken);
		const timeEntries = await harvestClient.getTimeEntries(params);

		return NextResponse.json(timeEntries);
	} catch (error) {
		logError("Failed to fetch time entries", error);
		return NextResponse.json(
			{ error: getErrorMessage(error, "Failed to fetch time entries") },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const session = await auth.api.getSession({ headers: request.headers });
		if (!session?.user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Get user-specific Harvest token
		const { accessToken } = await auth.api.getAccessToken({
			body: { providerId: "harvest" },
			headers: request.headers,
		});

		if (!accessToken) {
			return NextResponse.json(
				{ error: "No Harvest access token found" },
				{ status: 401 },
			);
		}

		const body = await request.json();

		// Validate request body
		const validation = validateRequest(timeEntryCreateSchema, body);
		if (!validation.success) {
			return NextResponse.json(
				{ error: validation.message, errors: validation.errors },
				{ status: 400 },
			);
		}

		const harvestClient = createHarvestClient(accessToken);
		const timeEntry = await harvestClient.createTimeEntry(validation.data);

		return NextResponse.json(timeEntry, { status: 201 });
	} catch (error) {
		logError("Failed to create time entry", error);
		return NextResponse.json(
			{ error: getErrorMessage(error, "Failed to create time entry") },
			{ status: 500 },
		);
	}
}
