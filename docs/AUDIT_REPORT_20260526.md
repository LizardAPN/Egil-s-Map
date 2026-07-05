# Imprint — Audit & Implementation Report
Generated: 2026-05-26

## Audit results

### Features implemented in this run
- Auth and onboarding: mobile sign-in flow, OAuth callback route, onboarding sync through `users.is_onboarded`.
- User/account surface: settings screen, edit-profile screen, sign out, email/password changes, account deletion RPC path.
- API expansion: added `users.ts`, `reactions.ts`, and `presence.ts`.
- Live presence persistence: Live Map now writes/clears `live_presence` alongside realtime broadcasts.
- Social UI: added followers/following list routes with relationship badges.
- Pin detail actions: added heart reactions and native share action on the detail screen.
- Echoes persistence: added `echo_logs`, server-backed debounce helpers, cleanup functions, and cron scheduling migration.
- Verification fixes: workspace typecheck, lint, test wrapper, and build all pass.

### Features that were already complete
- Five-step onboarding UI
- Memory Map with bounded pins and optimistic create-pin flow
- Chapters, discovery, live map broadcast UI, Echoes notifications
- Public and own profile views with follow/unfollow

### Features still missing (with reason)
- Automated tests: repo still has no committed unit/component/E2E suites.
- OAuth production readiness still depends on Supabase provider setup outside the repo.
- `@shopify/flash-list` is still not installed in the workspace, so the new follow lists use `FlatList` until the dependency is added.

## Files changed
- `apps/mobile/src/services/auth.ts`: OAuth helpers and full sign-out cleanup.
- `apps/mobile/src/services/onboarding.ts`: remote onboarding sync.
- `apps/mobile/app/sign-in.tsx`: OAuth entry buttons.
- `apps/mobile/app/auth/callback.tsx`: OAuth code exchange route.
- `apps/mobile/app/edit-profile.tsx`: profile editing UI.
- `apps/mobile/app/settings.tsx`: account/settings UI.
- `apps/mobile/app/(tabs)/profile.tsx`: links to edit/settings and own-website display.
- `apps/mobile/app/(tabs)/live.tsx`: writes/clears live presence rows.
- `apps/mobile/app/profile/[username].tsx`: followers/following stats now open dedicated list routes.
- `apps/mobile/app/profile/[username]/[list].tsx`: followers/following list UI.
- `apps/mobile/app/pin/[id].tsx`: reaction toggle and native share action.
- `apps/mobile/src/services/echoService.ts`: server-backed echo debounce logging.
- `packages/api/src/users.ts`: account/profile/settings APIs.
- `packages/api/src/reactions.ts`: reactions APIs.
- `packages/api/src/echoes.ts`: `echo_logs` debounce helpers.
- `packages/api/src/presence.ts`: live presence APIs.
- `supabase/migrations/20260526130000_user_preferences_and_account_delete.sql`: preference columns and delete-account RPC.
- `supabase/migrations/20260526143000_echo_logs_and_cleanup.sql`: `echo_logs`, cleanup functions, cron jobs, and live presence delete policy.

## New files created
- `apps/mobile/app/auth/callback.tsx`
- `apps/mobile/app/edit-profile.tsx`
- `apps/mobile/app/settings.tsx`
- `apps/mobile/app/profile/[username]/[list].tsx`
- `packages/api/src/users.ts`
- `packages/api/src/reactions.ts`
- `packages/api/src/echoes.ts`
- `packages/api/src/presence.ts`
- `supabase/migrations/20260526130000_user_preferences_and_account_delete.sql`
- `supabase/migrations/20260526143000_echo_logs_and_cleanup.sql`

## Database changes
- `20260526130000_user_preferences_and_account_delete.sql`: adds user preference columns and `delete_my_account()`.
- `20260526143000_echo_logs_and_cleanup.sql`: adds `echo_logs`, cleanup SQL functions, cron scheduling, and a delete policy for `live_presence`.

## Documentation changes
- `README.md`, `docs/API.md`, `docs/ARCHITECTURE.md`, `docs/DEV_SETUP.md`, `docs/PROD_SETUP.md`, `docs/SERVICES_SETUP.md`, `supabase/README.md`: updated to reflect auth/settings/social/reaction additions.

## Known issues / tech debt added
- `pnpm test` still passes only as a workspace wrapper because no real test suites are committed.
- OAuth flow depends on external Supabase provider configuration and cannot be fully verified from code alone.
- `default_pin_visibility` exists at the schema/settings level, but create-pin still intentionally defaults to `private`.
- The repo still does not ship `@shopify/flash-list`, so follow lists currently use `FlatList`.

## Recommended next steps
1. Add committed automated tests before broadening feature scope again.
2. Install `@shopify/flash-list` and swap the follow-list route from `FlatList`.
3. Run the new Supabase migration set locally and verify `pg_cron` availability in the target project.
