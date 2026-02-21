# ISSUE-016: Candidate feature - multi-device sync

**Type:** enhancement  
**Priority:** P3  
**Labels:** `enhancement`, `desktop`, `planner`

Problem:

State is local-only; no sync across devices.

Expected:

Opt-in sync model for books, settings, schedule completions, and sessions.

Definition of done:

- Draft architecture and conflict-resolution approach.
- Define security/privacy requirements before implementation.

Blockers:

- Need to evaluate backend options (e.g. Firebase, custom API) and choose one before proceeding with design.
- Probably need something cheap and easy to prototype with before committing to a full solution. Not sure how this can continue if it requires a backend that needs to be paid for, but it may fit into free tier if I have low usage, and high usage may mean I can get investors for the project, so I think it's worth exploring options and trying to get something working in a prototype form.
