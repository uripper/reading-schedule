# ISSUE-036: Make changing planned minutes not be open by default

**Type:** enhancement
**Priority:** P1
**Labels:** `enhancement`, `ux`, `desktop`

Problem:

Being able to change the planned minutes on the Schedule tab are open by default. Instead, the user should have to explicitly choose to modify them, by clicking a pencil icon or similar. This will reduce clutter and make it more visually appealing. We should also consider making the planned minutes larger in text, under "Complete session" to make it more prominent and usable. This will still take up less space than the current open input field, and will be more intuitive to use.

Expected:

The planned minutes input is not open by default, and the user has to click a pencil icon or similar to modify it. The planned minutes are larger in text and more prominent under "Complete session".

Definition of done:

- Implement a pencil icon or similar to allow the user to modify the planned minutes.
- Make the planned minutes larger in text and more prominent under "Complete session".
- Add tests to ensure the planned minutes input is not open by default and can be modified by clicking the pencil icon.
