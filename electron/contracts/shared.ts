import { type ZodIssue, z } from "zod";
import { type JsonValue } from "../types/types.js";

const JSON_PRIMITIVE_SCHEMA = z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
]);

export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
    z.union([
        JSON_PRIMITIVE_SCHEMA,
        z.array(JsonValueSchema),
        z.record(z.string(), JsonValueSchema),
    ]),
);

function issuePathText(issue: Pick<ZodIssue, "path">): string {
    if (issue.path.length === 0) {
        return "root";
    }
    return issue.path.join(".");
}

function formatIssues(issues: readonly ZodIssue[]): string {
    return issues
        .map((issue) => `${issuePathText(issue)}: ${issue.message}`)
        .join("; ");
}

export function schemaErrorMessage(
    context: string,
    issues: readonly ZodIssue[],
): string {
    const ISSUE_TEXT = formatIssues(issues);
    if (!ISSUE_TEXT) {
        return `${context} validation failed.`;
    }
    return `${context} validation failed: ${ISSUE_TEXT}`;
}
