import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createHarvestClient } from "@/lib/harvest";
import { getErrorMessage } from "@/lib/api-utils";
import { logError } from "@/lib/logger";
import { isAdminOrManager } from "@/lib/admin-utils-server";
import { validateRequest } from "@/lib/validation/validate-request";
import { projectUpdateSchema } from "@/lib/validation/harvest-schemas";

export async function PATCH(
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
		const projectId = Number(id);

		const body = await request.json();

		// Validate request body
		const validation = validateRequest(projectUpdateSchema, body);
		if (!validation.success) {
			return NextResponse.json(
				{ error: validation.message, errors: validation.errors },
				{ status: 400 },
			);
		}

		const client = createHarvestClient(accessToken);
		const project = await client.updateProject(projectId, validation.data);

		return NextResponse.json(project);
	} catch (error) {
		logError("Failed to update project", error);
		return NextResponse.json(
			{ error: getErrorMessage(error, "Failed to update project") },
			{ status: 500 },
		);
	}
}

export async function DELETE(
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
		const projectId = Number(id);

		const client = createHarvestClient(accessToken);
		await client.deleteProject(projectId);

		return NextResponse.json({ success: true }, { status: 200 });
	} catch (error) {
		logError("Failed to delete project", error);
		return NextResponse.json(
			{ error: getErrorMessage(error, "Failed to delete project") },
			{ status: 500 },
		);
	}
}
