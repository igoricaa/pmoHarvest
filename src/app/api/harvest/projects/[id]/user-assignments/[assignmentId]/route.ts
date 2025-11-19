import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createHarvestClient } from "@/lib/harvest";
import { getErrorMessage } from "@/lib/api-utils";
import { logError } from "@/lib/logger";
import { isAdminOrManager } from "@/lib/admin-utils-server";
import { validateRequest } from "@/lib/validation/validate-request";
import { userAssignmentUpdateSchema } from "@/lib/validation/harvest-schemas";

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; assignmentId: string }> },
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

		const { id, assignmentId } = await params;
		const projectId = parseInt(id, 10);
		const assignmentIdNum = parseInt(assignmentId, 10);

		if (isNaN(projectId) || isNaN(assignmentIdNum)) {
			return NextResponse.json(
				{ error: "Invalid project ID or assignment ID" },
				{ status: 400 },
			);
		}

		const body = await request.json();

		console.log("Received body:", body); // Add this
		console.log("Budget in body:", body.budget); // Add this

		// Validate request body
		const validation = validateRequest(userAssignmentUpdateSchema, body);

		console.log("Validation result:", validation); // Add this
		if (!validation.success) {
			return NextResponse.json(
				{ error: validation.message, errors: validation.errors },
				{ status: 400 },
			);
		}

		console.log("Validated data:", validation.data); // Add this

		const client = createHarvestClient(accessToken);
		const assignment = await client.updateUserAssignment(
			projectId,
			assignmentIdNum,
			validation.data,
		);

		return NextResponse.json(assignment);
	} catch (error) {
		logError("Failed to update user assignment", error);
		return NextResponse.json(
			{ error: getErrorMessage(error, "Failed to update user assignment") },
			{ status: 500 },
		);
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; assignmentId: string }> },
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

		const { id, assignmentId } = await params;
		const projectId = parseInt(id, 10);
		const assignmentIdNum = parseInt(assignmentId, 10);

		if (isNaN(projectId) || isNaN(assignmentIdNum)) {
			return NextResponse.json(
				{ error: "Invalid project ID or assignment ID" },
				{ status: 400 },
			);
		}

		const client = createHarvestClient(accessToken);
		await client.deleteUserAssignment(projectId, assignmentIdNum);

		return new NextResponse(null, { status: 204 });
	} catch (error) {
		logError("Failed to delete user assignment", error);
		return NextResponse.json(
			{ error: getErrorMessage(error, "Failed to delete user assignment") },
			{ status: 500 },
		);
	}
}
