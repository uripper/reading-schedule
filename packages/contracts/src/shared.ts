import { z } from "zod";
import type { JsonValue } from "./types_subfolders/types_core.js";

type ZodIssue = z.core.$ZodIssue;
const JSON_PRIMITIVE_SCHEMA = z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
]);

export const JSON_VALUE_SCHEMA: z.ZodType<JsonValue> = z.lazy(() =>
    z.union([
        JSON_PRIMITIVE_SCHEMA,
        z.array(JSON_VALUE_SCHEMA),
        z.record(z.string(), JSON_VALUE_SCHEMA),
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
