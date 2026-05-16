# AGENTS.md

## Cursor Cloud specific instructions

This is a client-only React/Vite/TypeScript SPA with no backend, database, or external services.

### Commands

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Dev server | `npm run dev` (Vite on port 5173) |
| Lint | `npm run lint` |
| Build | `npm run build` (tsc + vite build) |

### Notes

- The dev server starts near-instantly (~170ms) with no external dependencies.
- All data (listings, users, admin credentials) is mocked client-side; there is no API to configure.
- Demo admin credentials are in `README.md` and hardcoded in `src/App.tsx`.
- No environment variables or `.env` files are needed.
- Node.js 22+ and npm are required (lockfile uses npm).
