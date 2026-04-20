import { Prisma } from "@prisma/client";

export type FilterCondition = {
  field: string;
  operator: string;
  value?: unknown;
};

export type SmartViewFilters = {
  match: "all" | "any";
  conditions: FilterCondition[];
};

/**
 * Translate a smart-view filter config into a Prisma `where` clause for Leads.
 */
export function buildLeadWhere(filters: SmartViewFilters): Prisma.LeadWhereInput {
  if (!filters.conditions?.length) return {};

  const clauses = filters.conditions
    .map(conditionToLeadClause)
    .filter((c): c is Prisma.LeadWhereInput => c !== null);

  if (clauses.length === 0) return {};
  if (clauses.length === 1) return clauses[0]!;
  return filters.match === "any" ? { OR: clauses } : { AND: clauses };
}

function conditionToLeadClause(cond: FilterCondition): Prisma.LeadWhereInput | null {
  const { field, operator, value } = cond;

  // Standard columns
  if (field === "name") return textClause("name", operator, value);
  if (field === "status") return enumClause("status", operator, value);
  if (field === "source") return enumClause("source", operator, value);
  if (field === "url") return textClause("url", operator, value);
  if (field === "description") return textClause("description", operator, value);
  if (field === "address") return textClause("address", operator, value);
  if (field === "createdAt") return dateClause("createdAt", operator, value);
  if (field === "updatedAt") return dateClause("updatedAt", operator, value);
  if (field === "hasOpenTasks") return hasOpenTasksClause(operator, value);
  if (field === "hasOverdueTasks") return hasOverdueTasksClause(operator, value);

  // Custom data fields (customData.someKey)
  if (field.startsWith("customData.")) {
    const key = field.slice("customData.".length);
    return customDataClause(key, operator, value);
  }

  return null;
}

function textClause(
  col: string,
  operator: string,
  value: unknown,
): Prisma.LeadWhereInput | null {
  const str = String(value ?? "");
  switch (operator) {
    case "eq":
      return { [col]: { equals: str, mode: "insensitive" } };
    case "neq":
      return { NOT: { [col]: { equals: str, mode: "insensitive" } } };
    case "contains":
      return { [col]: { contains: str, mode: "insensitive" } };
    case "not_contains":
      return { NOT: { [col]: { contains: str, mode: "insensitive" } } };
    case "starts_with":
      return { [col]: { startsWith: str, mode: "insensitive" } };
    case "ends_with":
      return { [col]: { endsWith: str, mode: "insensitive" } };
    case "present":
      return { NOT: { [col]: null } };
    case "not_present":
      return { [col]: null };
    default:
      return null;
  }
}

function enumClause(
  col: string,
  operator: string,
  value: unknown,
): Prisma.LeadWhereInput | null {
  const str = String(value ?? "");
  switch (operator) {
    case "eq":
      return { [col]: str };
    case "neq":
      return { NOT: { [col]: str } };
    default:
      return null;
  }
}

function dateClause(
  col: string,
  operator: string,
  value: unknown,
): Prisma.LeadWhereInput | null {
  const str = String(value ?? "");
  const d = new Date(str);
  if (isNaN(d.getTime())) return null;
  switch (operator) {
    case "eq":
      // Same day: gte start of day, lt next day
      const start = new Date(d);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return { [col]: { gte: start, lt: end } };
    case "gt":
      return { [col]: { gt: d } };
    case "lt":
      return { [col]: { lt: d } };
    case "gte":
      return { [col]: { gte: d } };
    case "lte":
      return { [col]: { lte: d } };
    default:
      return null;
  }
}

function customDataClause(
  key: string,
  operator: string,
  value: unknown,
): Prisma.LeadWhereInput | null {
  // Prisma JSON path filtering for PostgreSQL
  const path = [key];
  switch (operator) {
    case "eq":
      return {
        customData: { path, equals: value as Prisma.InputJsonValue },
      };
    case "neq":
      return {
        NOT: { customData: { path, equals: value as Prisma.InputJsonValue } },
      };
    case "contains":
      return {
        customData: { path, string_contains: String(value ?? "") },
      };
    case "not_contains":
      return {
        NOT: { customData: { path, string_contains: String(value ?? "") } },
      };
    case "present":
      // Key exists and is not null — Prisma doesn't have a direct "key exists"
      // filter for JSON, so we check NOT equals null as a proxy.
      return {
        NOT: { customData: { path, equals: Prisma.DbNull } },
      };
    case "not_present":
      // Either the key is null or doesn't exist. We treat this as: the value
      // at that path equals Prisma.JsonNull OR the whole customData doesn't
      // contain the key. Using JsonNull as a best-effort match.
      return {
        OR: [
          { customData: { path, equals: Prisma.JsonNull } },
          { customData: { path, equals: Prisma.DbNull } },
          // Also match empty string as "not present"
          { customData: { path, equals: "" } },
        ],
      };
    default:
      return null;
  }
}

/**
 * "Has open tasks" — true if the lead has at least one incomplete task.
 */
function hasOpenTasksClause(
  operator: string,
  value: unknown,
): Prisma.LeadWhereInput | null {
  const wantTrue = operator === "eq" ? isTruthy(value) : operator === "neq" ? !isTruthy(value) : null;
  if (wantTrue === null) return null;
  const cond: Prisma.LeadWhereInput = {
    activities: { some: { type: "TASK", completedAt: null } },
  };
  return wantTrue ? cond : { NOT: cond };
}

/**
 * "Has overdue tasks" — true if the lead has at least one incomplete task
 * whose due date is in the past.
 */
function hasOverdueTasksClause(
  operator: string,
  value: unknown,
): Prisma.LeadWhereInput | null {
  const wantTrue = operator === "eq" ? isTruthy(value) : operator === "neq" ? !isTruthy(value) : null;
  if (wantTrue === null) return null;
  const cond: Prisma.LeadWhereInput = {
    activities: {
      some: {
        type: "TASK",
        completedAt: null,
        dueAt: { lt: new Date() },
      },
    },
  };
  return wantTrue ? cond : { NOT: cond };
}

function isTruthy(v: unknown): boolean {
  if (v === true) return true;
  if (typeof v === "string") return v === "yes" || v === "true" || v === "1";
  return false;
}
