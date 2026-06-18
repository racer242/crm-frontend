<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:current-project-agent-rules -->

Backward compatibility: ignore it.
When adding new functionality, add configurable params to `.env` if needed. Update startup banner when adding new `.env` params.
Each iteration must be completed with the following actions: if changes were made to the program code, a clean build of the project is required (without errors and warnings), then updating the `README.md` file, updating the `CHANGELOG.md` file, committing the changes to Git with a message in English. Use the --no-pager option for viewing git commands. Always make a global commit by using git add . first. Run build by command: set CI=true&& set NEXT_TELEMETRY_DISABLED=1&& npm run build && timeout /t 3 /nobreak

<!-- END:current-project-agent-rules -->
