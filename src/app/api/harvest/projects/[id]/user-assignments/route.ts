import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createHarvestClient } from "@/lib/harvest";
import { getErrorMessage } from "@/lib/api-utils";
import { logError } from "@/lib/logger";
import { isAdminOrManager } from "@/lib/admin-utils-server";
import { validateRequest } from "@/lib/validation/validate-request";
import { userAssignmentCreateSchema } from "@/lib/validation/harvest-schemas";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const session = await auth.api.getSession({ headers: request.headers });
		if (!session?.user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Admin or Manager access required
		if (!isAdminOrManager(session)) {
			return NextResponse.json(
				{ error: "Forbidden - Admin or Manager access required" },
				{ status: 403 },
			);
		}

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

		const { id } = await params;
		const projectId = parseInt(id, 10);

		if (isNaN(projectId)) {
			return NextResponse.json(
				{ error: "Invalid project ID" },
				{ status: 400 },
			);
		}

		const searchParams = request.nextUrl.searchParams;
		const isActive = searchParams.get("is_active");
		const page = searchParams.get("page");
		const perPage = searchParams.get("per_page");

		const queryParams: {
			is_active?: boolean;
			page?: number;
			per_page?: number;
		} = {};

		if (isActive !== null) {
			queryParams.is_active = isActive === "true";
		}
		if (page) {
			queryParams.page = parseInt(page, 10);
		}
		if (perPage) {
			queryParams.per_page = parseInt(perPage, 10);
		}

		const client = createHarvestClient(accessToken);
		const assignments = await client.getProjectUserAssignments(
			projectId,
			queryParams,
		);

		return NextResponse.json(assignments);
	} catch (error) {
		logError("Failed to fetch user assignments", error);
		return NextResponse.json(
			{ error: getErrorMessage(error, "Failed to fetch user assignments") },
			{ status: 500 },
		);
	}
}

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const session = await auth.api.getSession({ headers: request.headers });
		if (!session?.user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Admin or Manager access required
		if (!isAdminOrManager(session)) {
			return NextResponse.json(
				{ error: "Forbidden - Admin or Manager access required" },
				{ status: 403 },
			);
		}

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

		const { id } = await params;
		const projectId = parseInt(id, 10);

		if (isNaN(projectId)) {
			return NextResponse.json(
				{ error: "Invalid project ID" },
				{ status: 400 },
			);
		}

		const body = await request.json();

		// Validate request body
		const validation = validateRequest(userAssignmentCreateSchema, body);
		if (!validation.success) {
			return NextResponse.json(
				{ error: validation.message, errors: validation.errors },
				{ status: 400 },
			);
		}

		const client = createHarvestClient(accessToken);
		const assignment = await client.createUserAssignment(
			projectId,
			validation.data,
		);

		return NextResponse.json(assignment, { status: 201 });
	} catch (error) {
		logError("Failed to create user assignment", error);
		return NextResponse.json(
			{ error: getErrorMessage(error, "Failed to create user assignment") },
			{ status: 500 },
		);
	}
}
