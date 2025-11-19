import { z } from "zod";

// ============================================================================
// Time Entry Schemas
// ============================================================================

export const timeEntryCreateSchema = z.object({
	project_id: z
		.number()
		.int()
		.positive("Project ID must be a positive integer"),
	task_id: z.number().int().positive("Task ID must be a positive integer"),
	spent_date: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (expected YYYY-MM-DD)"),
	hours: z
		.number()
		.positive("Hours must be positive")
		.max(24, "Hours cannot exceed 24")
		.refine((val) => Number.isFinite(val), "Hours must be a valid number"),
	notes: z.string().max(5000, "Notes cannot exceed 5000 characters").optional(),
});

export const timeEntryUpdateSchema = z.object({
	project_id: z.number().int().positive().optional(),
	task_id: z.number().int().positive().optional(),
	spent_date: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional(),
	hours: z.number().positive().max(24).optional(),
	notes: z.string().max(5000).optional(),
});

// ============================================================================
// Expense Schemas
// ============================================================================

export const expenseCreateSchema = z.object({
	project_id: z
		.number()
		.int()
		.positive("Project ID must be a positive integer"),
	expense_category_id: z
		.number()
		.int()
		.positive("Category ID must be a positive integer"),
	spent_date: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (expected YYYY-MM-DD)"),
	total_cost: z.number().positive("Total cost must be positive"),
	units: z.number().int().positive().optional(),
	notes: z.string().max(5000, "Notes cannot exceed 5000 characters").optional(),
	// Receipt handled separately via form data
});

export const expenseUpdateSchema = z.object({
	project_id: z.number().int().positive().optional(),
	expense_category_id: z.number().int().positive().optional(),
	spent_date: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional(),
	total_cost: z.number().positive().optional(),
	units: z.number().int().positive().optional(),
	notes: z.string().max(5000).optional(),
});

// ============================================================================
// Project Schemas (Admin)
// ============================================================================

export const projectCreateSchema = z.object({
	client_id: z.number().int().positive("Client ID must be a positive integer"),
	name: z
		.string()
		.min(1, "Project name is required")
		.max(255, "Name cannot exceed 255 characters"),
	code: z
		.string()
		.min(1, "Project code is required")
		.max(50, "Code cannot exceed 50 characters"),
	is_billable: z.boolean().default(true),
	bill_by: z.enum(["Project", "Tasks", "People", "None"]).default("Project"),
	budget_by: z
		.enum(["project", "project_cost", "task", "task_fees", "person", "none"])
		.default("none"),
	budget: z.number().positive().optional(),
	cost_budget: z.number().positive().optional(),
	starts_on: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional(),
	ends_on: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional(),
	is_active: z.boolean().default(true),
});

export const projectUpdateSchema = z.object({
	client_id: z.number().int().positive().optional(),
	name: z.string().min(1).max(255).optional(),
	code: z.string().min(1).max(50).optional(),
	is_billable: z.boolean().optional(),
	bill_by: z.enum(["Project", "Tasks", "People", "None"]).optional(),
	budget_by: z
		.enum(["project", "project_cost", "task", "task_fees", "person", "none"])
		.optional(),
	budget: z.number().positive().optional(),
	cost_budget: z.number().positive().optional(),
	starts_on: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional(),
	ends_on: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional(),
	is_active: z.boolean().optional(),
});

// ============================================================================
// User Schemas (Admin)
// ============================================================================

export const userUpdateSchema = z.object({
	first_name: z.string().min(1).max(100).optional(),
	last_name: z.string().min(1).max(100).optional(),
	email: z.string().email("Invalid email address").optional(),
	telephone: z.string().max(50).optional(),
	timezone: z.string().optional(),
	has_access_to_all_future_projects: z.boolean().optional(),
	is_contractor: z.boolean().optional(),
	is_active: z.boolean().optional(),
	weekly_capacity: z.number().int().min(0).optional(),
	default_hourly_rate: z.number().positive().optional(),
	cost_rate: z.number().positive().optional(),
	roles: z.array(z.string()).optional(),
	access_roles: z.array(z.string()).optional(),
});

// ============================================================================
// Client Schemas (Admin)
// ============================================================================

export const clientCreateSchema = z.object({
	name: z
		.string()
		.min(1, "Client name is required")
		.max(255, "Name cannot exceed 255 characters"),
	is_active: z.boolean().default(true),
	address: z.string().max(500).optional(),
	currency: z.string().length(3, "Currency must be a 3-letter code").optional(), // ISO 4217
});

export const clientUpdateSchema = z.object({
	name: z.string().min(1).max(255).optional(),
	is_active: z.boolean().optional(),
	address: z.string().max(500).optional(),
	currency: z.string().length(3).optional(),
});

// ============================================================================
// User Assignment Schemas (Admin)
// ============================================================================

export const userAssignmentCreateSchema = z.object({
	user_id: z.number().int().positive("User ID must be a positive integer"),
	is_project_manager: z.boolean().default(false),
	use_default_rates: z.boolean().default(true),
	hourly_rate: z.number().positive().optional(),
	budget: z.number().positive().optional(),
});

export const userAssignmentUpdateSchema = z.object({
	is_project_manager: z.boolean().optional(),
	use_default_rates: z.boolean().optional(),
	hourly_rate: z.number().positive().optional(),
	budget: z.number().positive().optional(),
	is_active: z.boolean().optional(),
});
