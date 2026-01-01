# Contributing to Medium MCP Server

Thank you for your interest in contributing to Medium MCP Server! This project helps developers interact with Medium through browser automation since Medium's API is no longer available for new users.

**For AI Agents**: This guide is designed for both human and AI contributors (like Claude Code). Follow the conventions strictly and reference the detailed documentation in `docs/best-practices/`.

---

## 📚 Universal Best Practices

**Before contributing, read these universal guidelines:**

- 📘 **[Pull Request Best Practices](./docs/best-practices/PULL_REQUESTS.md)** - PR workflow, Definition of Done, review checklist
- 📘 **[Testing Best Practices](./docs/best-practices/TESTING.md)** - Testing strategy and coverage
- 📘 **[TypeScript Best Practices](./docs/best-practices/TYPESCRIPT.md)** - Type safety and strict mode
- 📘 **[Logging Best Practices](./docs/best-practices/LOGGING.md)** - Semantic logging with Logger class
- 📘 **[Documentation Best Practices](./docs/best-practices/DOCUMENTATION.md)** - Where and how to document

**This CONTRIBUTING.md focuses on Medium MCP Server specifics.**

---

## 🚨 Mandatory PR Policy

**ALL code changes MUST go through pull requests. No direct commits to `main`.**

See [Pull Request Best Practices](./docs/best-practices/PULL_REQUESTS.md) for complete workflow.

---

## 🤝 How to Contribute

### Reporting Issues

- **Bug Reports**: Use GitHub Issues with detailed reproduction steps, error logs, and environment details
- **Feature Requests**: Describe the use case and expected behavior, assess fragility risks (see AGENTS.md)
- **Questions**: Check existing issues and AGENTS.md first, then open a discussion

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/jackyckma/medium-mcp-server.git
   cd medium-mcp-server
   ```

2. **Install Dependencies**
   ```bash
   npm install
   npx playwright install chromium
   ```

3. **Build and Test**
   ```bash
   npm run build
   npm run test:all  # Runs all 103 unit + 56 E2E tests
   ```

4. **Setup Test Session** (first time only)
   ```bash
   npm test  # Playwright's globalSetup will prompt for login
   # Log in to Medium in the visible browser
   # Session saved to medium-session.json
   # All subsequent runs are headless
   ```

---

## 🎯 Medium MCP Server Specifics

### Before You Start

- Check existing issues and PRs to avoid duplication
- For major changes, open an issue first to discuss the approach
- **Read AGENTS.md thoroughly** - contains essential project context and patterns
- Review relevant best practices in `docs/best-practices/`
- **AI Agents**: Always use EnterPlanMode for non-trivial changes before implementing

### Development Conventions

This project follows standardized best practices documented in `docs/best-practices/`:

- **Logging**: Use Logger class (TRACE, DEBUG, INFO, WARN, ERROR), never `console.log`
- **TypeScript**: Strict mode, zero `any` types, explicit return types
- **Testing**: Multi-layered (unit → integration → E2E), ~47% overall coverage (appropriate for browser automation)

### Browser Automation Guidelines (Playwright + Medium)

**Selector Strategy** (Critical for Maintenance):

```typescript
// ✅ GOOD - Multiple fallbacks, prefer data-testid
const selectors = [
  '[data-testid="stableSelector"]',  // Most stable
  '[aria-label="descriptive"]',       // Semantic fallback
  'button.generic-class'              // Last resort
];

// ❌ BAD - Single selector, no fallbacks
await page.click('.xyz123');  // Generated class, will break
```

**When Selectors Break** (Medium UI changes):

1. Use debug scripts in `scripts/debug/` to analyze new UI
2. Add new selectors to **BEGINNING** of fallback arrays (don't replace old ones)
3. Update fixtures: `npx ts-node scripts/utils/capture-fixtures.ts`
4. Document change: `// Updated [date] - Medium changed UI`
5. Run tests to verify: `npm run test:all`

### Testing This Project

**Test Organization**:
- `src/__tests__/unit/` - Pure logic (29 tests)
- `src/__tests__/integration/` - Mocked browser methods (53 tests)
- `tests/integration/` - Fixture-based parser tests (31 tests)
- `tests/*.spec.ts` - E2E Playwright tests (56 tests)

**Project-Specific Requirements**:
- Requires Medium session: `npm run login-to-medium` (first time)
- Test with headless: `npm test`
- Test with visible browser: `npm run test:headed`
- Update fixtures after selector changes: `npx ts-node scripts/utils/capture-fixtures.ts`

**Coverage Expectations**:
- Core logic (validation, session): >80%
- Browser automation (selectors): 30-40% (mocking provides little value)
- Overall: ~47% (acceptable for this project type)

See [Testing Best Practices](./docs/best-practices/TESTING.md) for universal testing guidelines.

### Fragility Assessment (Before Implementing)

**AI agents MUST assess risk before implementing new features:**

| Risk | Indicators | Action |
|------|-----------|--------|
| 🔴 High | Modal popups, generated classes (`.xyz123`), multi-step flows | **Warn user**, suggest alternatives |
| 🟡 Medium | No `data-testid`, button text only, mobile/desktop differences | Implement with extensive fallbacks |
| 🟢 Low | Stable `data-testid`, consistent DOM structure | Safe to implement |

**Example Warning**:
> ⚠️ This feature requires interacting with a modal popup that uses generated class names. Medium frequently changes these, so this implementation may break within weeks. Consider if the value justifies the maintenance cost.

### Medium-Specific Considerations

**Browser Automation Challenges**:
- Medium updates UI frequently (selectors break monthly)
- Anti-automation detection (Cloudflare, bot detection)
- Session management across login methods (email vs Google OAuth)
- Rate limiting (respectful usage required)
- Mobile vs desktop UI differences

**Testing with Medium**:
- Use a **test Medium account** for development (not personal account)
- Be respectful of Medium's servers (add delays between operations)
- Don't spam or create excessive test content
- Test with different article types (draft, published, unlisted, paywalled)
- Test session persistence and expiry scenarios

**Login Preferences**:
- ✅ **Recommended**: Email/password login (best session persistence)
- ⚠️ **Avoid**: Google OAuth (session persistence issues)

---

## ✅ Definition of Done

See [Pull Request Best Practices - Definition of Done](./docs/best-practices/PULL_REQUESTS.md#-definition-of-done) for complete checklist.

**Medium MCP Server additions**:

### Documentation (Project-Specific)
- [ ] **AGENTS.md** updated if selectors, tools, or workflows changed
- [ ] **README.md** updated if user-facing behavior changed
- [ ] **ARCHITECTURE.md** updated if technical implementation changed
- [ ] **CHANGELOG.md** entry added in `[Unreleased]` section
- [ ] **ADR** created if architectural decision made
- [ ] **Fixtures** updated if parsers changed: `npx ts-node scripts/utils/capture-fixtures.ts`

### Testing (Project-Specific)
- [ ] All 103 unit tests pass
- [ ] All 56 E2E tests pass
- [ ] New tests follow project organization (unit/integration/E2E)
- [ ] Fixtures updated if HTML parsing changed
- [ ] Tests work in both headless and headed modes

---

## 🔍 PR Review Process

See [Pull Request Best Practices - PR Review Checklist](./docs/best-practices/PULL_REQUESTS.md#-pr-review-checklist) for complete checklist.

### Project-Specific Review Items

**For Browser Automation Changes**:
- [ ] Selectors use fallback strategy (multiple selectors per element)
- [ ] Selectors prefer `data-testid` > `aria-label` > classes
- [ ] Old selectors kept as fallbacks (not replaced)
- [ ] Change documented with date comment
- [ ] Tested in both headless and headed modes

**For Selector Updates**:
- [ ] Debug script output included showing new selectors
- [ ] Fixtures re-captured and committed
- [ ] Fixture tests pass with new HTML
- [ ] E2E tests pass with live Medium site

**For Session Changes**:
- [ ] Session file structure maintained (cookies + origins)
- [ ] Session validation still works
- [ ] Headless/visible mode logic correct
- [ ] Login flow tested manually

---

## 🎯 Common Contribution Areas

**High Impact** (Prioritize These):
- **Selector Updates**: When Medium changes their UI (use `scripts/debug/debug-*.ts`)
- **Fixture Updates**: After selector fixes (`scripts/utils/capture-fixtures.ts`)
- **Error Handling**: Better error messages with actionable context
- **Test Coverage**: Add missing unit/integration tests
- **Documentation**: Update AGENTS.md with new selectors/patterns

**Medium Impact**:
- **Performance**: Reduce browser launch overhead
- **Session Management**: Better cookie validation
- **Logging**: More granular DEBUG/TRACE messages
- **Type Safety**: Eliminate remaining edge cases

**Feature Ideas** (Assess Fragility First):
- ✅ Support for Medium publications (stable selectors)
- ✅ Article analytics retrieval (if `data-testid` available)
- ⚠️ Bulk operations (rate limiting concerns)
- ⚠️ Article editing (complex editor UI)
- 🔴 Comment management (unstable modal UI)

---

## 💬 Getting Help

**Stuck on Something?**
- **Read AGENTS.md first** - contains debugging workflows and debug scripts
- Check `docs/best-practices/` for logging, testing, TypeScript, PR workflow
- Look at existing code for patterns (e.g., similar tool implementations)
- Run debug scripts in `scripts/debug/` to understand selector issues
- Open a draft PR with questions and context
- Ask in GitHub Discussions with error logs and reproduction steps

**Communication**:
- Be respectful and constructive
- Provide full context (what you tried, error messages, environment)
- Share error logs and reproduction steps
- Include relevant debug script output
- Be patient with review feedback
- **AI Agents**: Include planning context and fragility assessments

---

## 📋 Quick Reference

### Essential Commands

```bash
# Development
npm run build                    # Build TypeScript
npm run test:unit                # Jest unit tests
npm run test:headed              # Playwright E2E (visible browser)
npm test                         # Playwright E2E (headless)
npm run test:all                 # All tests

# Medium Session
npm run login-to-medium          # Manual login (creates session)
rm medium-session.json           # Force re-login

# Debugging
npx ts-node scripts/debug/debug-selectors.ts     # Check selectors
npx ts-node scripts/debug/debug-my-articles.ts   # Debug article scraping
npx ts-node scripts/utils/capture-fixtures.ts    # Update test fixtures

# Testing Specific Features
npx ts-node scripts/test/test-get-articles-simple.ts   # Test article retrieval
npx ts-node scripts/test/test-session-flow.ts          # Test session management
```

### File Locations

- **Session file**: `medium-session.json` (gitignored)
- **Test session**: `medium-session.test.json` (cleaned up after tests)
- **Fixtures**: `tests/fixtures/*.html`
- **Debug scripts**: `scripts/debug/`
- **Test scripts**: `scripts/test/`
- **Best practices**: `docs/best-practices/`
- **ADRs**: `docs/adr/`

### Key Documentation

- **[AGENTS.md](./AGENTS.md)** - Developer guide, debugging workflows, selectors
- **[README.md](./README.md)** - User-facing features and setup
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical implementation details
- **[docs/best-practices/](./docs/best-practices/)** - Universal guidelines

---

## 🙏 Thank You

**Thank you for contributing to Medium MCP Server!**

Your contributions help make AI-powered content publishing more accessible to developers worldwide while navigating the challenges of browser automation.

**For AI Agents**:
- Follow this guide strictly
- Reference AGENTS.md for project context
- Read [Pull Request Best Practices](./docs/best-practices/PULL_REQUESTS.md) for workflow
- Read [docs/best-practices/DOCUMENTATION.md](./docs/best-practices/DOCUMENTATION.md) for documentation structure
- Use EnterPlanMode for planning
- Include fragility assessments
- Generate comprehensive tests
- **ALWAYS review documentation** during PR creation and review

**Maintainers**: This project welcomes contributions from both human developers and AI agents. Please review AI-generated PRs with the same rigor, checking for test coverage, convention adherence, appropriate fragility assessments, and **complete documentation updates**.
