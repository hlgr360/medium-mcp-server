# Test Fixtures

This directory contains HTML snapshots captured from Medium pages for use in integration tests.

## Purpose

Fixtures allow integration tests to run:
- **Fast** - No browser startup or network requests (~100ms vs 30 seconds)
- **Deterministic** - Fixtures don't change between test runs
- **Offline** - No internet connection required
- **Account-independent** - No Medium login needed to run tests

## Capturing Fixtures

**First-time setup:**

1. Login to Medium to create a session file:
   ```bash
   # Use the MCP tool or run the server and login
   ```

2. Run the fixture capture script:
   ```bash
   npx ts-node scripts/capture-fixtures.ts
   ```

This will save HTML snapshots from your account:
- `user-articles-page.html` - Your articles with tabs
- `user-articles-empty.html` - Empty articles page (generated)
- `reading-lists-page.html` - Your reading lists
- `reading-lists-empty.html` - Empty lists page (generated)
- `article-content-public.html` - Public article content
- `feed-featured.html` - Featured feed articles

## When to Update Fixtures

Update fixtures when:
1. **Medium changes their UI** - Selectors break, tests fail
2. **Adding new test cases** - Need HTML for edge cases
3. **Fixtures become stale** - Current fixtures >6 months old

## Fixture File Naming Convention

- `{feature}-{variant}.html` - e.g., `user-articles-empty.html`
- Feature: `user-articles`, `reading-lists`, `article-content`, `feed`
- Variant: `page`, `empty`, `public`, `paywalled`, etc.

## Using Fixtures in Tests

```typescript
import { readFileSync } from 'fs';
import { join } from 'path';
import { ArticleParser } from '../parsers/article-parser';

const html = readFileSync(join(__dirname, '..', 'fixtures', 'user-articles-page.html'), 'utf-8');
const articles = ArticleParser.extractArticlesFromTable(html, 'draft');
expect(articles.length).toBeGreaterThan(0);
```

## Privacy Note

⚠️ **Fixture HTML files are gitignored** - They contain personal data (article titles, list names, etc.)

**What this means:**
- Fixtures are **not** included in the repository
- Each developer must capture their own fixtures locally
- Use `npx ts-node scripts/capture-fixtures.ts` to generate them
- Your personal data stays on your machine only

**For CI/CD:** You can create fixtures from a test Medium account with generic content if needed.

## Manual Fixture Creation

You can also create fixtures manually for edge cases:

```html
<!-- tests/fixtures/user-articles-special-case.html -->
<!DOCTYPE html>
<html>
<head><title>Medium - Your Stories</title></head>
<body>
  <table>
    <tbody>
      <tr>
        <td>
          <h2>Test Article with Special Characters: "Quotes" & Symbols</h2>
          <a href="https://medium.com/p/abc123">Link</a>
        </td>
      </tr>
    </tbody>
  </table>
</body>
</html>
```

Then use it in tests:
```typescript
const html = readFileSync('tests/fixtures/user-articles-special-case.html', 'utf-8');
```

## Fixture vs E2E Tests

| Aspect | Fixture Tests | E2E Tests |
|--------|---------------|-----------|
| Speed | ~100ms | ~30s |
| Requires login | No | Yes |
| Tests navigation | No | Yes |
| Tests parsing | Yes | Yes |
| Brittle to UI changes | Yes | Yes |
| Good for | Edge cases, logic | Smoke tests, flows |

**Best practice:** Use both!
- Integration tests (fixtures) for comprehensive parsing logic coverage
- E2E tests for critical user flows and smoke testing
