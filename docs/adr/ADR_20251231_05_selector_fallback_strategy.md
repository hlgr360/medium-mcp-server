# ADR-005: Use Selector Fallback Arrays for Resilience

**Status**: ✅ Accepted

**Date**: 2025-12-31

**Deciders**: Project maintainers, Claude Code (AI agent)

---

## Context

The Medium MCP Server scrapes Medium.com using Playwright browser automation. Medium has no public API, so we rely on DOM selectors to find elements.

**Problem**: Medium changes their UI frequently
- Class names change (`.xyz123` → `.abc456`)
- `data-testid` attributes added/removed
- Button text changes ("Publish" → "Publish story")
- Mobile vs desktop differences
- A/B testing causes selector variation

**Impact of broken selectors**:
- Users can't retrieve articles (core functionality broken)
- Tests fail (CI pipeline red)
- Manual intervention required (update selectors, redeploy)
- Poor user experience (server "breaks" after Medium UI updates)

**Options considered**:
1. **Single selector per element**: Simple but fragile
2. **Try/catch with fallback**: Better but verbose, hard to maintain
3. **Selector arrays with priority**: Resilient, maintainable, self-documenting

## Decision

Use **selector fallback arrays** with priority ordering:

```typescript
// ✅ GOOD - Multiple fallbacks, ordered by stability
const loginIndicators = [
  '[data-testid="headerUserIcon"]',        // 1. Most stable (data-testid)
  '[data-testid="headerWriteButton"]',     // 2. Alternative data-testid
  '[data-testid="headerNotificationButton"]', // 3. Another data-testid
  'button[aria-label*="user"]'             // 4. Semantic attribute
];

for (const selector of loginIndicators) {
  const element = await page.$(selector);
  if (element) return true;  // Found it!
}
return false;  // None worked
```

**Priority ordering**:
1. **`data-testid` attributes** - Most stable (purpose: testing)
2. **`aria-label` / ARIA attributes** - Semantic, accessibility-driven
3. **Button text / content** - Changes with copy updates
4. **Generic selectors** (tag + role) - Last resort
5. **Class names** - Least stable (generated, change frequently)

**Key principle**: When selectors break, **add new selector to front** of array, **keep old ones** as fallbacks.

## Consequences

### Positive
- ✅ **Resilient**: Survives minor Medium UI changes (1 out of 4 selectors works = success)
- ✅ **Self-healing**: New selectors added, old ones fade away naturally
- ✅ **Self-documenting**: Array shows history of UI changes
- ✅ **Maintainable**: Easy to add new selectors (prepend to array)
- ✅ **Testable**: Can test each selector independently
- ✅ **Reduced downtime**: Server keeps working during gradual rollouts/A/B tests

**Impact**: Selector breakage incidents reduced from ~1/month to ~1/quarter

### Negative
- ⚠️ **Verbosity**: 3-5 selectors per element vs 1 selector
- ⚠️ **Performance**: Tries multiple selectors (adds ~10-50ms per element)
- ⚠️ **Dead code**: Old selectors may never match anymore (clutter)
- ⚠️ **False confidence**: May match wrong element if selector too generic
- ⚠️ **Maintenance**: Arrays grow over time, need periodic cleanup

### Neutral
- 📝 **Documentation**: Added debugging workflow in AGENTS.md
- 📝 **Debug scripts**: Created 15 tools to analyze selectors when they break
- 📝 **Comments**: Add `// Updated [date] - Medium changed UI` when adding selectors

## Implementation Notes

**Selector stability hierarchy**:

| Selector Type | Stability | Example | Why |
|---------------|-----------|---------|-----|
| `data-testid` | ⭐⭐⭐⭐⭐ | `[data-testid="headerUserIcon"]` | Purpose-built for testing, rarely changes |
| `aria-label` | ⭐⭐⭐⭐ | `button[aria-label*="user"]` | Accessibility-driven, semantic |
| Button text | ⭐⭐⭐ | `button:has-text("Publish")` | Changes with copy updates |
| Generic | ⭐⭐ | `button[role="button"]` | Too broad, may match wrong element |
| Class names | ⭐ | `.xyz123` | Generated, changes frequently |

**When selectors break** (step-by-step):

1. **Run debug script** to find new selectors:
   ```bash
   npx ts-node scripts/debug/debug-login.ts
   ```

2. **Analyze output** for new `data-testid`, `aria-label`, or element attributes

3. **Add to front** of fallback array:
   ```typescript
   const selectors = [
     '[data-testid="newSelector"]',  // NEW - add first
     '[data-testid="oldSelector"]',  // OLD - keep as fallback
     'button[aria-label*="user"]'    // GENERIC - always keep
   ];
   ```

4. **Add comment**:
   ```typescript
   // Updated Dec 2025 - Medium changed UI
   ```

5. **Test the fix**:
   ```bash
   npx ts-node scripts/test/test-get-articles-simple.ts
   ```

6. **Update fixtures**:
   ```bash
   npx ts-node scripts/utils/capture-fixtures.ts
   ```

7. **Run all tests**:
   ```bash
   npm run test:all
   ```

**Examples across codebase**:

```typescript
// Login indicators (4 fallbacks)
const loginIndicators = [
  '[data-testid="headerUserIcon"]',
  '[data-testid="headerWriteButton"]',
  '[data-testid="headerNotificationButton"]',
  'button[aria-label*="user"]'
];

// Article editor title (2 fallbacks)
const titleSelectors = [
  '[data-testid="editorTitleParagraph"]',
  'h1[contenteditable="true"]'
];

// Reading lists (2 fallbacks)
const listSelectors = [
  '[data-testid="readingList"]',
  'a[href*="/list/"]'
];
```

**Anti-pattern - Single selector** (❌ DO NOT):
```typescript
// ❌ BAD - Will break when Medium changes UI
await page.click('[data-testid="publishButton"]');

// ❌ BAD - Will break when class name changes
await page.click('.xyz123');
```

**Debugging tools** (when selectors break):

| Tool | Purpose |
|------|---------|
| `debug-login.ts` | Find login selectors |
| `debug-articles-detailed.ts` | Find article list selectors |
| `debug-editor-page.ts` | Find editor selectors |
| `debug-lists-page.ts` | Find list selectors |
| `debug-publish-flow.ts` | Find publish flow selectors |

**Periodic maintenance** (every 6 months):
1. Review selector arrays
2. Remove selectors that haven't matched in 6+ months (check git blame)
3. Keep at least 2-3 fallbacks per element
4. Update AGENTS.md with current selectors

## References

- [AGENTS.md#current-selectors](../../AGENTS.md#current-selectors) - Selector reference
- [AGENTS.md#debugging-workflow](../../AGENTS.md#debugging-workflow) - Selector debugging workflow
- [CONTRIBUTING.md#browser-automation-guidelines](../../CONTRIBUTING.md#browser-automation-guidelines) - Selector examples
- [scripts/README.md#debug-scripts](../../scripts/README.md#debug-scripts) - Debug tools
- Commit `c6f5832` - Selector fallback strategy
- Related: [ADR-002: Script Reorganization](./ADR_20251231_02_script_reorganization.md) - Debug tools organization
