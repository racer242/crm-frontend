<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:current-project-agent-rules -->

Backward compatibility: ignore it.
When adding new functionality, add configurable params to `.env` if needed. Update startup banner when adding new `.env` params.
Each iteration must be completed with the following actions: if changes were made to the program code, update the `README.md` file, update appropriate document in "doc" folder, update the `CHANGELOG.md` file, commit the changes to Git with a short English message in one line using "git add .". Use the --no-pager option for viewing git commands. Run the build only if you are asked to.

<!-- END:current-project-agent-rules -->
