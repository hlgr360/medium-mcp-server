# ADR_20260101_01: Session Persistence After Browser Operations

**Date:** 2026-01-01
**Status:** Accepted
**Deciders:** Development Team
**Related:** Session Management, Browser Automation

---

## Context

The Medium MCP server uses Playwright to automate browser interactions with Medium.com. Authentication is handled via session persistence - cookies and localStorage are saved to `medium-session.json` after a user logs in manually.

Previously, the session was **only saved after login** (`ensureLoggedIn()`). This created a potential issue:

1. Medium may update cookies during normal operations (CSRF tokens, session refreshes, tracking cookies)
2. These updates were not being captured in the session file
3. Over time, the session could become stale, leading to authentication failures
4. The global test setup performs a one-time login, but subsequent test runs wouldn't capture any session updates

## Decision

**We will save the session after every successful browser operation.**

Specifically, `saveSession()` is now called after:
- `getUserArticles()` - After fetching user's articles
- `getArticleContent()` - After fetching article content
- `publishArticle()` - After publishing/saving drafts
- `searchMediumArticles()` - After search completes
- `getFeed()` - After fetching feed articles
- `getLists()` - After fetching reading lists
- `getListArticles()` - After fetching list articles

## Rationale

### Why Save After Every Operation?

1. **Cookie Freshness**: Medium's backend may rotate cookies, update CSRF tokens, or refresh session metadata during any interaction. Capturing these updates ensures the session stays valid.

2. **Test Suite Reliability**: The global setup script (`setup-test-session.ts`) runs once before all tests. If cookies expire during the test run, subsequent tests would fail. Continuous session updates prevent this.

3. **Long-Running Sessions**: Users may keep the MCP server running for extended periods. Without session updates, cookies could expire, requiring manual re-authentication.

4. **Minimal Overhead**: The `saveSession()` operation is fast (simple JSON write) and doesn't significantly impact performance.

### Alternative Approaches Considered

1. **Save only on specific operations** (e.g., only after authenticated operations)
   - Rejected: Too complex to determine which operations might trigger cookie updates
   - Risk of missing updates from unexpected sources

2. **Save on a timer** (e.g., every 5 minutes)
   - Rejected: Wasteful if no browser operations occur
   - Could miss critical updates if timer interval is too long

3. **Save only if cookies changed** (diff detection)
   - Considered but deferred: Adds complexity without clear benefit
   - Current approach is simpler and safer

## Consequences

### Positive

- ✅ **Session stays fresh**: Cookies are always up-to-date with Medium's backend
- ✅ **Improved reliability**: Reduces authentication failures in long-running sessions
- ✅ **Better test stability**: Test suite can run for extended periods without re-authentication
- ✅ **Transparent to users**: Session updates happen automatically

### Negative

- ⚠️ **Minor I/O overhead**: Each operation writes to disk (typically <100ms)
- ⚠️ **Potential race conditions**: If multiple operations run concurrently, session file could be written multiple times
  - Mitigation: Tests run serially (`workers: 1` in `playwright.config.ts`)
  - MCP server operations are typically sequential (request-response pattern)

### Neutral

- 📝 **Session file updates frequently**: More writes to `medium-session.json`, but this is expected behavior
- 📝 **Test verification**: New test added to verify session updates work correctly

## Implementation Details

### Code Changes

1. **browser-client.ts**: Added `await this.saveSession()` after each successful operation
2. **session-management.spec.ts**: Added test `should update session file after successful browser operation`
3. **Documentation**: Updated test comments to clarify session persistence behavior

### Test Coverage

- ✅ **Session creation after login** (manual test, skipped by default)
  - Test: `should create and persist session file after successful manual login`
  - Requires: `MANUAL_LOGIN_TEST=true`
  - Purpose: Foundation test for initial session creation

- ✅ **Session updates after browser operations** (automated test)
  - Test: `should update session file after successful browser operation`
  - Uses: Fake session + real browser operation (`searchMediumArticles`)
  - Verifies: Session file automatically updated without manual login
  - Key improvement: Tests the actual auto-save behavior in isolation

- ✅ **Session validation** (existing tests)
  - Validates cookie expiry detection
  - Tests pre-validation without browser launch
  - Tests corrupted session handling

- ✅ **Expired cookie detection** (existing tests)
  - Ensures stale sessions are detected and rejected

## Monitoring

No additional monitoring required. Existing session logs already show:
```
💾 Session saved for future use
📅 Session valid until: 2026-12-31T23:59:59.000Z
📊 Saved 15 cookies and 3 localStorage origins
```

## Rollback Plan

If session persistence causes issues:
1. Remove `await this.saveSession()` calls from operation methods
2. Revert to login-only session saving
3. Keep the new test as a regression guard

## Related ADRs

- None (this is the first ADR specifically addressing session persistence)

## References

- Playwright Storage State: https://playwright.dev/docs/auth#reuse-authentication-state
- Medium API (unofficial): Community-documented behavior around cookie management
- Test Setup: `scripts/utils/setup-test-session.ts`
- Browser Client: `src/browser-client.ts`
