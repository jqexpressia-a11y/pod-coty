# Ghost Arc Artifact Check Results

**Overall status:** PASS_WITH_EXTERNAL_RUNTIME_BLOCKER

| Check | Status | Severity | Evidence |
|---|---:|---|---|
| repository cloned | PASS | required | /home/ubuntu/ghost_arc_build_audit/Agentic-Arc |
| package.json present | PASS | required | name=ghost-arc version=0.1.0 |
| required npm scripts present | PASS | required | {"build": "next build", "dev": "next dev", "lint": "eslint", "postinstall": "npm run prisma:generate", "prisma:deploy": "prisma migrate deploy", "prisma:generate": "prisma generate", "prisma:migrate": "prisma migrate dev", "prisma:studio": "prisma studio", "start": "next start"} |
| package lock present | PASS | required | /home/ubuntu/ghost_arc_build_audit/Agentic-Arc/package-lock.json |
| initial npm ci exposed stale lock | PASS | fixed | Initial npm ci failed because package-lock.json was out of sync with package.json. |
| npm ci after lock repair | PASS | required | ig.ts.<br><br>Prisma schema loaded from prisma.<br>┌─────────────────────────────────────────────────────────┐<br>│  Update available 7.7.0 -> 7.8.0                        │<br>│  Run the following to update                            │<br>│    npm i --save-dev prisma@latest                       │<br>│    npm i @prisma/client@latest                          │<br>└─────────────────────────────────────────────────────────┘<br><br>✔ Generated Prisma Client (7.7.0) to ./app/generated/prisma in 75ms<br><br><br>added 1128 packages in 24s |
| production build | PASS | required | i/ai/spec<br>├ ƒ /api/ai/spec/[roomId]<br>├ ƒ /api/ai/spec/token<br>├ ƒ /api/liveblocks-auth<br>├ ƒ /api/projects<br>├ ƒ /api/projects/[projectId]<br>├ ƒ /api/projects/[projectId]/canvas<br>├ ƒ /api/projects/[projectId]/collaborators<br>├ ƒ /api/projects/[projectId]/spec<br>├ ƒ /api/projects/[projectId]/specs/[specId]/download<br>├ ƒ /editor<br>├ ƒ /editor/[roomId]<br>├ ƒ /sign-in/[[...sign-in]]<br>└ ƒ /sign-up/[[...sign-up]]<br><br><br>ƒ Proxy (Middleware)<br><br>○  (Static)   prerendered as static content<br>ƒ  (Dynamic)  server-rendered on demand |
| Next.js build artifact exists | PASS | required | .next directory generated |
| ESLint | PASS | required | > ghost-arc@0.1.0 lint<br>> eslint |
| Prisma client generated | PASS | required | /home/ubuntu/ghost_arc_build_audit/Agentic-Arc/app/generated/prisma |
| README documents required environment variables | PASS | required | all documented |
| runtime HTTP smoke test | BLOCKED | external_credentials_required | Server starts, but local HTTP pages return 500 with placeholder Clerk credentials: Publishable key not valid. |
| tracked code/config diff limited | PASS | change_control | package-lock.json |
