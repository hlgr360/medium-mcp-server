# Scripts Directory

Development and debugging scripts for Medium MCP Server.

## Directory Structure

```
scripts/
├── README.md          # This file
├── debug/             # Debugging tools (15 scripts)
├── test/              # Manual test scripts (16 scripts)
└── utils/             # Utilities (2 scripts)
```

## Quick Reference

### Debug Scripts (When Medium UI Changes)

Use these when selectors break after Medium UI updates.

| Issue | Script | Output |
|-------|--------|--------|
| Login detection broken | `debug/debug-login.ts` | `.debug/screenshots/debug-login.png` |
| Article retrieval failing | `debug/debug-articles-detailed.ts` | DOM structure analysis |
| Editor not loading | `debug/debug-editor-wait.ts` | Contenteditable detection |
| Publish flow issues | `debug/debug-publish-flow.ts` | All editor elements |
| Reading lists broken | `debug/debug-lists-page.ts` | List element analysis + JSON |
| Single list navigation | `debug/debug-single-list.ts` | URL validation |

**All debug scripts**:
- `debug/debug-all-article-states.ts` - Test all tab URLs
- `debug/debug-articles.ts` - Quick DOM analysis
- `debug/debug-articles-detailed.ts` - Deep DOM structure
- `debug/debug-editor-page.ts` - Editor page selectors
- `debug/debug-editor-wait.ts` - Editor wait strategies
- `debug/debug-lists-page.ts` - Lists page structure
- `debug/debug-login.ts` - Login page selectors
- `debug/debug-publish-flow.ts` - Complete publish workflow
- `debug/debug-publish-modal.ts` - Publish modal elements
- `debug/debug-published-articles.ts` - Published tab focus
- `debug/debug-single-list.ts` - Individual list navigation
- `debug/debug-tab-detection.ts` - Tab element detection
- `debug/debug-tab-navigation.ts` - Tab click testing
- `debug/debug-table-structure.ts` - Table cell analysis
- `debug/debug-wait-for-table-update.ts` - Table update timing

**Usage**: `npx ts-node scripts/debug/debug-login.ts`

**Output**: All screenshots and JSON go to `.debug/` directory

---

### Test Scripts (Manual Validation)

Use these to manually test functionality after changes.

| Purpose | Script |
|---------|--------|
| Quick article retrieval test | `test/test-get-articles-simple.ts` |
| Complete article flow | `test/test-full-article-flow.ts` |
| Login flow validation | `test/test-login-flow.ts` |
| Session persistence | `test/test-session-flow.ts` |
| Publish draft article | `test/test-publish-article.ts` |
| Publish without tags | `test/test-publish-no-tags.ts` |
| Feed retrieval | `test/test-feed-all.ts` |
| Reading lists | `test/test-get-lists.ts` |
| List articles | `test/test-list-articles.ts` |
| MCP tool simulation | `test/test-mcp-simulation.ts` |

**All test scripts**:
- `test/test-all-articles.ts` - All article states
- `test/test-article-flow.ts` - Article workflow
- `test/test-direct-articles.ts` - Direct article access
- `test/test-feed-all.ts` - Feed categories
- `test/test-full-article-flow.ts` - Complete flow
- `test/test-get-articles.ts` - Article retrieval
- `test/test-get-articles-simple.ts` - Quick test
- `test/test-get-lists.ts` - Reading lists
- `test/test-list-articles.ts` - List article retrieval
- `test/test-login-flow.ts` - Login validation
- `test/test-login.ts` - Basic login
- `test/test-mcp-simulation.ts` - MCP tool testing
- `test/test-optimized-login.ts` - Login optimization
- `test/test-publish-article.ts` - Publish with tags
- `test/test-publish-no-tags.ts` - Publish without tags
- `test/test-session-flow.ts` - Session management

**Usage**: `npx ts-node scripts/test/test-login-flow.ts`

---

### Utility Scripts

| Purpose | Script | Usage |
|---------|--------|-------|
| Capture HTML fixtures | `utils/capture-fixtures.ts` | `npx ts-node scripts/utils/capture-fixtures.ts` |
| Setup test session | `utils/setup-test-session.ts` | Auto-run by Playwright globalSetup |

**utils/capture-fixtures.ts**:
- Captures HTML snapshots from Medium for fixture-based testing
- Requires valid Medium session
- Saves to `tests/fixtures/`
- Run after fixing selectors or when fixtures become stale

**utils/setup-test-session.ts**:
- Playwright globalSetup script
- Ensures valid Medium session before E2E tests
- Opens browser for login only if session missing/expired
- Creates `medium-session.json`

---

## Output Locations

**Debug artifacts** (gitignored):
- Screenshots: `.debug/screenshots/*.png`
- JSON analysis: `.debug/analysis/*.json`

**Test fixtures** (gitignored):
- HTML snapshots: `tests/fixtures/*.html`

**Session files** (gitignored):
- Main session: `medium-session.json`
- Test session: `medium-session.test.json`

**Clean up**: `rm -rf .debug/`

---

## Debugging Workflow

**When Medium UI changes break tests**:

1. **Identify affected feature** (login, articles, lists, feed, etc.)
2. **Run corresponding debug script** from table above
3. **Analyze output** in `.debug/screenshots/` and `.debug/analysis/`
4. **Update selectors** in `src/browser-client.ts` (add to beginning of fallback arrays)
5. **Update fixtures**: `npx ts-node scripts/utils/capture-fixtures.ts`
6. **Run tests**: `npm run test:all`

See [CLAUDE.md](../CLAUDE.md) debugging workflow section for complete details.

---

## See Also

- [CLAUDE.md](../CLAUDE.md) - Complete project guide with debugging workflow
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines
- [ARCHITECTURE.md](../ARCHITECTURE.md) - Technical architecture
