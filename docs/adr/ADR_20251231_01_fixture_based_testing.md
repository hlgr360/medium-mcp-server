# ADR-001: Use Fixture-Based Testing for HTML Parsers

**Status**: ✅ Accepted

**Date**: 2025-12-31

**Deciders**: Project maintainers, Claude Code (AI agent)

---

## Context

The Medium MCP Server uses browser automation to scrape HTML from Medium's website. We extract data from HTML using parsing logic in `tests/parsers/`.

**Testing challenges**:
- E2E tests are slow (~30s per test) due to full browser automation
- E2E tests require valid Medium login session
- Mocked HTML tests don't catch real-world DOM structure changes
- Medium's UI changes frequently, breaking selectors
- Need fast, deterministic tests for parser logic

**Options considered**:
1. **E2E only**: Comprehensive but slow (~6 min for 56 tests)
2. **Mocked HTML**: Fast but diverges from reality
3. **Fixture-based**: Captured real HTML snapshots for fast, realistic tests

## Decision

Implement **fixture-based testing** using captured HTML snapshots:

1. Extract parser logic into standalone modules in `tests/parsers/`
2. Capture real Medium HTML pages as fixtures in `tests/fixtures/`
3. Test parsers against fixtures using linkedom (DOM in Node.js)
4. Auto-capture fixtures if missing via `tests/helpers/ensure-fixtures.ts`
5. Utility script `scripts/utils/capture-fixtures.ts` to refresh snapshots

**Key principle**: Fixtures represent "ground truth" of Medium's HTML at a point in time.

## Consequences

### Positive
- ✅ **Fast**: ~100ms per test vs 30s E2E (300x faster)
- ✅ **Deterministic**: Same HTML every run, no flakiness
- ✅ **No login required**: Fixtures captured once, reused by all developers
- ✅ **Easy edge cases**: Can manually edit fixtures to test paywall, empty states
- ✅ **CI-friendly**: No browser needed, runs in CI without Medium session
- ✅ **Parser isolation**: Tests parsing logic independently from browser automation

**Impact**: Added 31 fixture-based tests, total test time still ~6 min (E2E dominates)

### Negative
- ⚠️ **Maintenance**: Fixtures go stale when Medium changes UI
- ⚠️ **Storage**: HTML fixtures are large (~50-500 KB each), gitignored
- ⚠️ **Setup burden**: New developers must run `capture-fixtures.ts` once
- ⚠️ **False confidence**: Passing fixture tests don't guarantee live Medium works
- ⚠️ **Privacy concern**: Fixtures may contain personal data (article titles, list names)

### Neutral
- 📝 **Documentation**: Added `tests/fixtures/README.md` to explain usage
- 📝 **Helper**: `ensure-fixtures.ts` auto-captures if missing, reducing friction
- 📝 **Update trigger**: Fixture tests fail → signal to update fixtures → re-capture

## Implementation Notes

**Fixture capture workflow**:
```bash
# 1. Login to Medium (creates session)
npm test  # Playwright globalSetup handles this

# 2. Capture fresh HTML snapshots
npx ts-node scripts/utils/capture-fixtures.ts

# 3. Run fixture tests
npm run test:unit -- tests/integration/
```

**Fixture file locations**:
- `tests/fixtures/article-list.html` - Article list page HTML
- `tests/fixtures/article-content.html` - Single article HTML
- `tests/fixtures/feed.html` - Feed page HTML
- `tests/fixtures/lists.html` - Reading lists page HTML

**When to update fixtures**:
- After fixing selectors due to Medium UI changes
- When E2E tests fail but fixture tests pass (stale fixtures)
- When adding tests for new edge cases
- Every 3-6 months as preventive maintenance

**Privacy consideration**: For public repos, use test account or add `tests/fixtures/` to `.gitignore`.

## References

- [tests/fixtures/README.md](../../tests/fixtures/README.md) - Fixture usage guide
- [docs/conventions/TESTING.md](../conventions/TESTING.md) - Multi-layer testing strategy
- Commit `c6f5832` - Initial fixture-based testing implementation
- Related: [ADR-004: Semantic Logging](./ADR_20251231_04_semantic_logging.md) - Fixtures enable quiet test runs
