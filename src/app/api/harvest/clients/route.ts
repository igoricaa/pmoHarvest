import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createHarvestClient } from "@/lib/harvest";
import { getErrorMessage } from "@/lib/api-utils";
import { logError } from "@/lib/logger";
import { isAdmin } from "@/lib/admin-utils";
import { validateRequest } from "@/lib/validation/validate-request";
import { clientCreateSchema } from "@/lib/validation/harvest-schemas";

export async function GET(request: NextRequest) {
	try {
		const session = await auth.api.getSession({ headers: request.headers });
		if (!session?.user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Admin access required
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

		// Parse query parameters
		const searchParams = request.nextUrl.searchParams;
		const params = {
			is_active: searchParams.get("is_active")
				? searchParams.get("is_active") === "true"
				: undefined,
			updated_since: searchParams.get("updated_since") || undefined,
			page: searchParams.get("page")
				? Number(searchParams.get("page"))
				: undefined,
			per_page: searchParams.get("per_page")
				? Number(searchParams.get("per_page"))
				: undefined,
		};

		const client = createHarvestClient(accessToken);
		const clients = await client.getClients(params);

		return NextResponse.json(clients);
	} catch (error) {
		logError("Failed to fetch clients", error);
		return NextResponse.json(
			{ error: getErrorMessage(error, "Failed to fetch clients") },
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

		// Admin access required
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

		const body = await request.json();

		// Validate request body
		const validation = validateRequest(clientCreateSchema, body);
		if (!validation.success) {
			return NextResponse.json(
				{ error: validation.message, errors: validation.errors },
				{ status: 400 },
			);
		}

		const client = createHarvestClient(accessToken);
		const newClient = await client.createClient(validation.data);

		return NextResponse.json(newClient, { status: 201 });
	} catch (error) {
		logError("Failed to create client", error);
		return NextResponse.json(
			{ error: getErrorMessage(error, "Failed to create client") },
			{ status: 500 },
		);
	}
}
