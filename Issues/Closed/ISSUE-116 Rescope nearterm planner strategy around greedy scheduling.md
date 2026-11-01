# ISSUE-116: Re-scope near-term planner strategy around greedy scheduling

**Type:** tech-debt
**Priority:** P1
**Labels:** `tech-debt`, `planner`, `docs`, `desktop`

Problem:

Current planner work still invests in solver profiles and CP-SAT fallback paths even though greedy scheduling appears to be the only approach consistently producing workable plans in practice. That makes the roadmap and settings surface more ambitious than current delivery reality.

Expected:

Near-term planner scope should be explicitly greedy-first, with any non-greedy experimentation clearly deprioritized, hidden, or documented as experimental until it can reliably outperform or complement greedy scheduling.

Definition of done:

- Decide and document whether CP-SAT and other non-greedy planner work stays experimental, stays internal, or is removed from near-term roadmap and user-facing settings.
- Align planner defaults, settings copy, and documentation with a greedy-first strategy.
- Re-scope dependent roadmap items so advanced solver work is not implied as near-term unless it has clear success criteria.
- Keep any retained non-greedy path behind explicit opt-in language and clear fallback behavior.
- Add or update tests and docs wherever planner selection behavior changes.

Context:

- `ROADMAP.md`
- `src/reading_plan/planning/solve.py`
- `src/reading_plan/planning/greedy.py`
- `electron/renderer/settings/config.ts`
- `electron/renderer/settings/config_fields.ts`
- `Issues/Open/ISSUE-027 Epic Personalization and ML Foundation.md`
- `Issues/Open/ISSUE-104 Restore Python ty typecheck parity for OR Tools.md`
