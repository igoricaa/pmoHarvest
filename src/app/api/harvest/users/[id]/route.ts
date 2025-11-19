import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createHarvestClient } from "@/lib/harvest";
import { getErrorMessage } from "@/lib/api-utils";
import { logError } from "@/lib/logger";
import { isAdmin } from "@/lib/admin-utils";
import { validateRequest } from "@/lib/validation/validate-request";
import { userUpdateSchema } from "@/lib/validation/harvest-schemas";

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const session = await auth.api.getSession({ headers: request.headers });
		if (!session?.user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Only administrators can update users
		if (!isAdmin(session)) {
			return NextResponse.json(
				{ error: "Forbidden - Admin access required" },
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
		const userId = Number(id);
		const body = await request.json();

		// Validate request body
		const validation = validateRequest(userUpdateSchema, body);
		if (!validation.success) {
			return NextResponse.json(
				{ error: validation.message, errors: validation.errors },
				{ status: 400 },
			);
		}

		const client = createHarvestClient(accessToken);
		const user = await client.updateUser(userId, validation.data);

		return NextResponse.json(user);
	} catch (error) {
		logError("Failed to update user", error);
		return NextResponse.json(
			{ error: getErrorMessage(error, "Failed to update user") },
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

		// Only administrators can delete users
		if (!isAdmin(session)) {
			return NextResponse.json(
				{ error: "Forbidden - Admin access required" },
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
		const userId = Number(id);

		const client = createHarvestClient(accessToken);
		await client.deleteUser(userId);

		return NextResponse.json({ success: true }, { status: 200 });
	} catch (error) {
		logError("Failed to delete user", error);
		return NextResponse.json(
			{ error: getErrorMessage(error, "Failed to delete user") },
			{ status: 500 },
		);
	}
}
