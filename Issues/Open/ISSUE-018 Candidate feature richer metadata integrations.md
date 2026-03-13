# ISSUE-018: Candidate feature - richer metadata integrations

**Type:** enhancement  
**Priority:** P1  
**Labels:** `enhancement`, `desktop`, `ux`

Problem:

Metadata ingestion is centered on Open Library only. That leaves obvious lookup gaps in the Library flow, including cases where widely known books still cannot be found.

Expected:

Additional providers and fallback behavior improve lookup coverage and metadata quality so users can still add books when Open Library misses or weakly ranks them.

Definition of done:

- Define provider abstraction and fallback order.
- Add provider-specific tests and failure handling.
- Audit concrete false-negative cases in the current Library flow, including `Lost Lambs` by Madeline Cash.
- If the primary provider misses a likely result, fall back to an alternate provider or a broader secondary lookup strategy.
- Keep the add-book flow actionable even when all providers fail by showing a clear user-facing fallback message instead of a dead-end result list.
