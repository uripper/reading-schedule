# ISSUE-063: Create emergency exits for things like deleting books

**Type:** tech-debt
**Priority:** P3
**Labels:** `ui`, `desktop`

Problem:

Books can be removed from the library with the click of a button, but there is no confirmation dialog or undo mechanism. This can lead to accidental data loss and a poor user experience.

Expected:

There should be a confirmation dialog before deleting a book, and an option to undo the deletion for a short period of time.

Definition of done:

- Add a confirmation dialog when the user attempts to delete a book.
- Implement an undo mechanism that allows the user to restore a deleted book within a reasonable timeframe (e.g., 5 seconds).
- Ensure that the UI clearly communicates the deletion and undo options to the user.
- Test the new functionality to confirm that it works as expected and does not introduce any regressions.
