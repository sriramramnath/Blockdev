Assumptions and prerequisites

You have coderabbit installed and available in your PATH.

You are working in a local clone or working directory.

You will not create any commits as part of this workflow. All changes remain in working files only.

This file documents the manual workflow. Automations are optional but must respect the "no commit" rule.

Goals

Obtain an actionable code review from coderabbit.

Apply fixes locally in the working tree.

Re-run coderabbit --plain until it reports no issues.

Avoid committing or pushing any code at any step.

Workflow

Prepare your working directory.

Make your edits locally in files in your working directory.

Do not stage or commit anything.

Run the reviewer:

coderabbit --plain

Read the review output carefully. coderabbit --plain prints a list of issues and suggested fixes.

Apply fixes locally

Edit files in your working directory to address each item reported by coderabbit.

Keep changes local. Do not run git add or git commit if you want to follow the strict no commit policy.

Re-run the reviewer

coderabbit --plain

Repeat steps 3 to 5 until coderabbit reports no remaining issues.

Optional: Export a patch without committing

If you need to share the final changes with someone else without committing, create a patch file.

Example (create a patch from the working tree, without committing):

git diff > my-changes.patch

Alternative (create a patch from committed changes):

git format-patch -1 HEAD

Note: creating a patch file does not require committing code. If you prefer another export method, use that instead.

Troubleshooting

If coderabbit fails to run, check your installation and PATH.

If coderabbit reports false positives, collect the output and follow the tool's guidelines for suppressing or explaining the case. Keep changes local.

Safety and etiquette

This workflow intentionally avoids commits. If an organizational policy requires commits to record work, follow that policy separately. This document describes an uncommitted, iterative review loop only.

Do not push local changes to remote branches as part of this process.

Closing

Keep iterating until coderabbit --plain reports no issues. That is your signal you are done.

Created to follow the rule: do not commit code; run coderabbit --plain, fix issues, and repeat until clean.

