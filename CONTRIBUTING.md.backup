# Contributing to Medium MCP Server

Thank you for your interest in contributing to Medium MCP Server! This project helps developers interact with Medium through browser automation since Medium's API is no longer available for new users.

**For AI Agents**: This guide is designed for both human and AI contributors (like Claude Code). Follow the conventions strictly and reference the detailed documentation in `docs/best-practices/` for logging, testing, and TypeScript best practices.

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
   npm run test:all  # Runs all 149 tests (Jest + Playwright)
   ```

4. **Setup Test Session** (first time only)
   ```bash
   npm test  # Playwright's globalSetup will prompt for login
   # Log in to Medium in the visible browser
   # Session saved to medium-session.json
   # All subsequent runs are headless
   ```

### Code Contributions

#### Before You Start
- Check existing issues and PRs to avoid duplication
- For major changes, open an issue first to discuss the approach
- **Read AGENTS.md thoroughly** - contains essential project context and patterns
- Review relevant best practices in `docs/best-practices/` (Logging, Testing, TypeScript)
- **AI Agents**: Always use EnterPlanMode for non-trivial changes before implementing

#### Development Conventions

This project follows standardized best practices documented in `docs/best-practices/`:

📘 **[Logging Best Practices](./docs/best-practices/LOGGING.md)** - REQUIRED READING
- Use custom Logger class with semantic log levels (TRACE, DEBUG, INFO, WARN, ERROR)
- All logs to stderr (MCP protocol safety)
- Automatic test suppression (no `if (!testing)` checks needed)
- **Example**: `logger.info('Operation started')` not `console.log`

📘 **[Testing Best Practices](./docs/best-practices/TESTING.md)** - REQUIRED READING
- Multi-layered: Unit (Jest) → Integration (Jest + fixtures) → E2E (Playwright)
- Fixture-based testing for parsers (fast, deterministic)
- Coverage philosophy: 47% overall is appropriate for browser automation
- See test organization in AGENTS.md

📘 **[TypeScript Best Practices](./docs/best-practices/TYPESCRIPT.md)** - REQUIRED READING
- Strict mode enabled
- Zero `any` types (use `unknown` and type guards)
- Explicit return types for public APIs
- Type-safe validation with Zod

#### Browser Automation Guidelines (Playwright)

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

**When Selectors Break**:
1. Use debug scripts in `scripts/` (see AGENTS.md reference section)
2. Add new selectors to BEGINNING of fallback arrays (don't replace)
3. Update fixtures: `npx ts-node scripts/utils/capture-fixtures.ts`
4. Document change with comment: `// Updated [date] - Medium changed UI`

**Testing Browser Code**:
- Test with both headless and headed modes: `npm run test:headed`
- Verify session persistence works
- Test timeout handling and error recovery
- Check that MCP tools return proper JSON responses

#### Testing Requirements

**REQUIRED for All Changes**:
- ✅ Unit tests for pure logic (validation, parsing)
- ✅ Integration tests (mocks or fixtures) for browser methods
- ✅ E2E tests for critical user flows
- ✅ All tests pass: `npm run test:all`

**Fixture-Based Testing** (for parsers):
```bash
# After fixing selectors or adding parsing logic:
npx ts-node scripts/utils/capture-fixtures.ts  # Update snapshots
npm run test:unit -- tests/integration/  # Run fixture tests
```

**Test Organization**:
- `src/__tests__/unit/` - Pure logic (29 tests)
- `src/__tests__/integration/` - Mocked browser methods (53 tests)
- `tests/integration/` - Fixture-based parser tests (31 tests)
- `tests/*.spec.ts` - E2E Playwright tests (56 tests)

**Coverage Expectations**:
- Core logic (validation, session): >80%
- Browser automation (selectors): 30-40% (appropriate - mocking provides little value)
- Overall: ~47% (acceptable for this project type)

#### Code Style
- TypeScript strict mode (no `any`, no implicit types)
- 2-space indentation
- Semicolons required
- Use async/await over Promises
- Descriptive names (no abbreviations except common ones like `url`, `id`)
- **AI Agents**: Follow existing patterns exactly, avoid over-engineering

### Git Workflow & Branch Strategy

**⚠️ MANDATORY: Never commit directly to `main` branch**

All changes must go through feature branches and pull requests.

**Branch naming conventions**:
```bash
feature/description      # New features
fix/description          # Bug fixes
refactor/description     # Code refactoring
docs/description         # Documentation changes
test/description         # Test additions
chore/description        # Maintenance

# Examples:
feature/add-publications-support
fix/session-validation-timeout
refactor/extract-list-parser
docs/add-common-pitfalls
test/add-list-parser-fixtures
chore/update-playwright
```

**Why**: Protects main branch, enables code review, maintains clean history

### Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write clean, well-documented code
   - Follow best practices in `docs/best-practices/`
   - Add/update tests (unit + integration + E2E)
   - Update fixtures if changing parsers: `npx ts-node scripts/utils/capture-fixtures.ts`
   - Update AGENTS.md if adding new selectors or tools
   - Update README if adding new user-facing features

3. **Test Thoroughly**
   ```bash
   npm run build                    # Must pass
   npm run test:unit                # All Jest tests
   npm run test:headed              # Visual verification
   npm test                         # All E2E tests
   npm run test:all                 # Complete suite (149 tests)

   # Test scripts for manual validation
   npx ts-node scripts/test/test-get-articles-simple.ts
   ```

4. **Commit with Conventional Commits**
   ```bash
   git commit -m "feat: add article tagging support"
   git commit -m "fix: handle Medium login timeout gracefully"
   git commit -m "docs: update installation instructions"
   git commit -m "test: add fixture tests for article parser"
   git commit -m "refactor: extract parsing logic to parsers/"
   ```

   **Format**: `type(scope): description`
   - Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `perf`
   - Keep first line under 72 characters
   - Add detailed explanation in body if needed

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   - Use the GitHub PR template
   - Describe what you changed and **why**
   - Include test results (all 149 tests passing)
   - Include screenshots for UI-related changes
   - Reference related issues (`Fixes #123`)
   - Note any breaking changes
   - **AI Agents**: Include planning context from EnterPlanMode

### ✅ Pre-Commit Checklist

**Before every commit, verify**:

#### Code Quality
- [ ] All files added to git (`git add .` or selective add)
- [ ] No untracked files that should be committed (`git status`)
- [ ] Code follows project style (matches existing code)
- [ ] No commented-out code (remove or add explanation)
- [ ] No debug statements (`console.log`, `debugger`)
- [ ] TypeScript compiles without errors (`npx tsc --noEmit`)

#### Testing
- [ ] All unit tests pass (`npm run test:unit`)
- [ ] All E2E tests pass (`npm test`)
- [ ] **Zero warnings** in test output (see [Testing Best Practices](./docs/best-practices/TESTING.md))
- [ ] New tests added for changes
- [ ] Fixtures updated if parsers changed (`npx ts-node scripts/utils/capture-fixtures.ts`)

#### Documentation
- [ ] Code comments updated if behavior changed
- [ ] README updated if setup/usage changed
- [ ] **CHANGELOG.md updated** with entry in `[Unreleased]` section
- [ ] AGENTS.md updated if selectors or tools changed
- [ ] ADR created if architectural decision made

#### Security & Performance
- [ ] No hardcoded secrets or credentials
- [ ] No obvious performance regressions
- [ ] Error handling implemented
- [ ] Input validation added for external data

### ✅ Pull Request Checklist

**Before opening PR, verify**:

#### Branch & Commits
- [ ] Branch created from `main` (not old feature branch)
- [ ] Branch name follows convention (`feature/`, `fix/`, etc.)
- [ ] All commits have clear, descriptive messages
- [ ] Commits follow [Conventional Commits](https://www.conventionalcommits.org/) format
- [ ] No "fix typo" or "WIP" commits (squash if needed)

#### Requirements
- [ ] All user requirements addressed
- [ ] All acceptance criteria met
- [ ] Breaking changes documented in CHANGELOG.md with migration guide
- [ ] Related issues referenced (`Fixes #123`, `Relates to #456`)

#### Testing
- [ ] All 149 tests pass locally
- [ ] Manual testing completed for changed functionality
- [ ] Test results included in PR description
- [ ] No flaky tests introduced

#### Documentation
- [ ] PR description complete with:
  - **Summary** of changes (what)
  - **Rationale** (why)
  - **Test results** confirmation
  - **Breaking changes** (if any)
  - **Screenshots** (for UI changes)
- [ ] All documentation updated (README, AGENTS.md, CONTRIBUTING.md)
- [ ] CHANGELOG.md has entry in `[Unreleased]`

#### Code Review
- [ ] Self-review completed (read your own diff)
- [ ] No merge conflicts with main
- [ ] Ready for review (not draft)
- [ ] CI/CD pipeline will pass (if applicable)

**For AI Agents**: Include planning context and decision rationale in PR description

## 🤖 AI-Specific Contribution Guidelines

**For Claude Code and Other AI Agents**:

### Planning Workflow (CRITICAL)
1. **Always use EnterPlanMode** for non-trivial changes (see AGENTS.md examples)
2. **Read before editing**: Use Read tool on target files, understand existing patterns
3. **Search comprehensively**: Use Task tool with Explore agent for codebase exploration
4. **Plan before implementing**: Identify affected files, selectors, tests
5. **Use AskUserQuestion**: Clarify ambiguous requirements before coding

### Code Generation Guidelines
- ✅ **DO**: Follow existing patterns exactly (check similar files)
- ✅ **DO**: Use Logger class for all logging (never `console.log`)
- ✅ **DO**: Add type annotations explicitly (no implicit `any`)
- ✅ **DO**: Include unit + integration + E2E tests
- ✅ **DO**: Update fixtures after changing parsers
- ❌ **DON'T**: Over-engineer simple solutions
- ❌ **DON'T**: Add features beyond what was requested
- ❌ **DON'T**: Create new patterns when existing ones work
- ❌ **DON'T**: Skip test coverage for "quick fixes"

### Debugging Selector Failures
**When E2E tests fail due to Medium UI changes**:
1. Identify affected tool (login, articles, lists, feed, etc.)
2. Run corresponding debug script from `scripts/debug/debug-*.ts`
3. Analyze output for new `data-testid` or `aria-label` attributes
4. Add new selectors to BEGINNING of fallback arrays (don't replace)
5. Update fixtures: `npx ts-node scripts/utils/capture-fixtures.ts`
6. Run fixture tests: `npm run test:unit -- tests/integration/`
7. Run E2E tests: `npm test`
8. Document change in commit: `fix: update article selectors (Medium UI change Dec 2025)`

### Test Generation
**AI agents MUST generate tests for all changes**:
```typescript
// Unit test (src/__tests__/unit/)
describe('validateArticleInput', () => {
  it('should reject invalid title', () => {
    expect(() => validateArticleInput({ title: '', content: 'text' }))
      .toThrow('Title is required');
  });
});

// Integration test with fixtures (tests/integration/)
describe('ArticleParser', () => {
  it('should parse article from fixture', async () => {
    const html = await fs.readFile('tests/fixtures/my-articles.html', 'utf-8');
    const articles = parseArticles(html);
    expect(articles).toHaveLength(3);
  });
});

// E2E test (tests/*.spec.ts)
test('should retrieve articles', async ({ page }) => {
  const client = new BrowserMediumClient();
  await client.initialize();
  const articles = await client.getMyArticles();
  expect(articles.length).toBeGreaterThan(0);
});
```

### Fragility Assessment (Before Implementing)
**AI agents MUST assess risk before implementing new features**:

| Risk | Indicators | Action |
|------|-----------|--------|
| 🔴 High | Modal popups, generated classes (`.xyz123`), multi-step flows | **Warn user**, suggest alternatives |
| 🟡 Medium | No `data-testid`, button text only, mobile/desktop differences | Implement with extensive fallbacks |
| 🟢 Low | Stable `data-testid`, consistent DOM structure | Safe to implement |

**Example Warning**:
> ⚠️ This feature requires interacting with a modal popup that uses generated class names. Medium frequently changes these, so this implementation may break within weeks. Consider if the value justifies the maintenance cost.

### Common Contribution Areas

**High Impact (Prioritize These)**:
- **Selector Updates**: When Medium changes their UI (use debug scripts)
- **Fixture Updates**: After selector fixes (`capture-fixtures.ts`)
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

## 🔍 Code Review Process

**What We Look For**:
- ✅ Code works with current Medium website (tested with E2E)
- ✅ Follows best practices in `docs/best-practices/` (Logging, Testing, TypeScript)
- ✅ Uses Logger class (not `console.log`)
- ✅ Zero `any` types (strict TypeScript)
- ✅ Proper error handling with actionable messages
- ✅ Complete test coverage (unit + integration + E2E)
- ✅ Fixtures updated if parsers changed
- ✅ No breaking changes to existing MCP tools (or documented migration)
- ✅ AGENTS.md updated with new selectors/patterns
- ✅ README updated for user-facing changes
- ✅ Commit messages follow conventional commits

**Review Timeline**:
- Initial response: 1-3 days
- Full review: 1-2 weeks
- Complex features may take longer

**For AI-Generated PRs**:
- Include planning context (EnterPlanMode output)
- Show test results (all 149 tests passing)
- Explain selector choices and fragility assessment
- Document any patterns that deviate from existing code

## 💬 Getting Help

**Stuck on Something?**
- **Read AGENTS.md first** - contains debugging workflows and debug scripts
- Check best practices in `docs/best-practices/` for logging, testing, TypeScript
- Look at existing code for patterns (e.g., similar tool implementations)
- Run debug scripts in `scripts/` to understand selector issues
- Open a draft PR with questions and context
- Ask in GitHub Discussions with error logs and reproduction steps

**Communication**:
- Be respectful and constructive
- Provide full context (what you tried, error messages, environment)
- Share error logs and reproduction steps
- Include relevant debug script output
- Be patient with review feedback
- **AI Agents**: Include planning context and fragility assessments

## 🏗️ Project Architecture

**See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed technical architecture**

### High-Level Overview

```
src/
├── index.ts                 # MCP server (8 tools, Zod validation)
├── browser-client.ts        # Playwright automation engine
├── logger.ts                # Custom logger (stderr, semantic levels)
├── __tests__/               # Jest tests (82 tests)
│   ├── unit/                # Pure logic (29 tests)
│   └── integration/         # Mocked browser (53 tests)
└── [legacy: auth.ts, client.ts - DO NOT USE]

tests/
├── parsers/                 # Standalone parsing modules (NEW)
│   ├── article-parser.ts
│   ├── feed-parser.ts
│   └── list-parser.ts
├── integration/             # Fixture-based tests (31 tests)
├── fixtures/                # HTML snapshots (captured from Medium)
└── *.spec.ts                # Playwright E2E tests (56 tests)

scripts/
├── debug-*.ts               # Selector debugging tools
├── test-*.ts                # Manual validation scripts
└── capture-fixtures.ts      # Fixture snapshot generator
```

### Key Design Decisions

**Standalone Parsers** (v1.3+):
- Extracted from `browser-client.ts` to `tests/parsers/`
- Work with HTML strings (via linkedom) instead of Playwright Page objects
- Enable fixture-based testing (fast, deterministic, no login required)
- Reused in browser client for consistency

**Session Management**:
- Persistent cookies in `medium-session.json`
- Validated before each operation (5s redirect check)
- Auto-switches between headless/visible modes
- Test sessions use separate `medium-session.test.json`

**Selector Strategy**:
- Multiple fallbacks per element (`data-testid` → `aria-label` → class)
- Add new selectors to beginning, keep old as fallbacks
- Debug scripts in `scripts/` to analyze UI changes
- Documented in AGENTS.md reference section

### Adding New Features

**For MCP Tools**:
1. **Schema**: Add Zod schema to `index.ts`
2. **Implementation**: Add method to `browser-client.ts`
3. **Parsing Logic**: Extract to `tests/parsers/` (if applicable)
4. **Tests**: Unit (validation) + Integration (fixtures/mocks) + E2E
5. **Fixtures**: Capture HTML with `scripts/utils/capture-fixtures.ts`
6. **Documentation**: Update AGENTS.md, README, ARCHITECTURE.md

**For Selector Updates**:
1. **Debug**: Run `scripts/debug/debug-*.ts` to analyze UI
2. **Update**: Add to beginning of fallback arrays in `browser-client.ts`
3. **Fixtures**: Re-capture with `scripts/utils/capture-fixtures.ts`
4. **Test**: Run fixture tests, then E2E tests
5. **Document**: Add comment with date, update AGENTS.md reference

**For Parsers**:
1. **Create**: Add standalone parser in `tests/parsers/`
2. **Test**: Add fixture-based tests in `tests/integration/`
3. **Integrate**: Use parser in `browser-client.ts`
4. **Validate**: Run E2E tests to confirm consistency

## 📋 Checklist for Contributors

### Before Submitting PR

**Code Quality**:
- [ ] Code builds without errors (`npm run build`)
- [ ] All tests pass (`npm run test:all` - 149 tests)
- [ ] TypeScript strict mode (zero `any` types)
- [ ] Uses Logger class (not `console.log`)
- [ ] Follows best practices in `docs/best-practices/`
- [ ] No sensitive data (API keys, sessions, personal info) in code

**Testing**:
- [ ] Unit tests for validation logic (`src/__tests__/unit/`)
- [ ] Integration tests with mocks or fixtures (`src/__tests__/integration/` or `tests/integration/`)
- [ ] E2E tests for new tools (`tests/*.spec.ts`)
- [ ] Fixtures updated if parsers changed (`npx ts-node scripts/utils/capture-fixtures.ts`)
- [ ] Browser automation works in both headless and headed mode (`npm run test:headed`)
- [ ] MCP tools return proper JSON responses

**Documentation**:
- [ ] AGENTS.md updated with new selectors (if applicable)
- [ ] README updated for user-facing features
- [ ] ARCHITECTURE.md updated for architectural changes
- [ ] Code comments for complex logic
- [ ] Commit messages follow conventional commits

**Selector Changes** (if applicable):
- [ ] Debug script used to identify new selectors (`scripts/debug/debug-*.ts`)
- [ ] New selectors added to BEGINNING of fallback arrays
- [ ] Old selectors kept as fallbacks (not replaced)
- [ ] Comment added with date: `// Updated Dec 2025 - Medium changed UI`
- [ ] Fixtures re-captured after selector updates

**AI Agents** (additional requirements):
- [ ] EnterPlanMode used for non-trivial changes
- [ ] Planning context included in PR description
- [ ] Fragility assessment documented
- [ ] Test results included (all 149 tests passing)
- [ ] No over-engineering beyond requirements

### PR Description Should Include

- [ ] **What** changes were made (specific files, functions, selectors)
- [ ] **Why** the changes were necessary (user request, bug fix, Medium UI change)
- [ ] **How** to test the changes (specific npm commands or scripts)
- [ ] Test results (all 149 tests passing)
- [ ] Any breaking changes (with migration guide)
- [ ] Screenshots (if UI-related or selector debugging)
- [ ] Fragility assessment (for new features)
- [ ] Related issues (`Fixes #123`, `Closes #456`)

**AI-Generated PRs** (additional context):
- [ ] Planning output from EnterPlanMode
- [ ] Explanation of selector choices
- [ ] Rationale for any pattern deviations

## 🚀 Release Process

**Versioning** (Semantic Versioning):
- **Major** (v2.0.0): Breaking changes to MCP tools, API changes
- **Minor** (v1.4.0): New features, new MCP tools, significant enhancements
- **Patch** (v1.3.1): Bug fixes, selector updates, documentation

**Release Checklist**:
1. All tests pass (`npm run test:all`)
2. Version bumped in `package.json`
3. CHANGELOG.md updated with changes
4. Git tag created: `git tag v1.4.0`
5. Push with tags: `git push --tags`

**Release Notes Format**:
```markdown
## v1.4.0 - 2025-01-15

### Features
- Added support for Medium publications (#123)
- New `get-publication-articles` tool

### Fixes
- Updated article selectors (Medium UI change) (#124)
- Fixed session validation timeout (#125)

### Documentation
- Updated AGENTS.md with new selectors
- Added fixture-based testing guide

### Contributors
- @username1, @username2
```

## 📝 CHANGELOG Maintenance

**Every significant change MUST be documented in CHANGELOG.md**

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format and [Semantic Versioning](https://semver.org/).

### When to Update CHANGELOG

**REQUIRED for**:
- ✅ New features (new MCP tools, significant functionality)
- ✅ Bug fixes (user-facing issues resolved)
- ✅ Breaking changes (API changes, selector updates requiring migration)
- ✅ Deprecations (features being phased out)
- ✅ Security fixes (vulnerabilities patched)

**OPTIONAL for**:
- Documentation improvements (unless major restructuring)
- Internal refactoring (unless it affects performance)
- Test additions (unless enabling new testing patterns)
- Development tool updates (unless affecting contributors)

### CHANGELOG Format

**Structure**:
```markdown
## [Unreleased]

### Added
- New feature descriptions

### Changed
- Changes to existing functionality

### Deprecated
- Features being phased out

### Removed
- Features removed in this version

### Fixed
- Bug fixes

### Security
- Security vulnerability fixes

## [1.4.0] - 2025-01-15

### Added
...
```

**Categories Explained**:

| Category | Use For | Example |
|----------|---------|---------|
| **Added** | New features | "Added support for Medium publications" |
| **Changed** | Changes to existing functionality | "Updated article selector fallback strategy" |
| **Deprecated** | Soon-to-be-removed features | "Deprecated `getUserArticles()` in favor of `getMyArticles()`" |
| **Removed** | Features removed | "Removed legacy API client (use browser client)" |
| **Fixed** | Bug fixes | "Fixed session validation timeout handling" |
| **Security** | Vulnerability fixes | "Fixed XSS vulnerability in content parser" |

### Workflow

**During Development**:
1. Make your code changes
2. **Immediately** add entry to `[Unreleased]` section in CHANGELOG.md
3. Use appropriate category (Added, Changed, Fixed, etc.)
4. Write from user perspective (not technical implementation)

**Before Release**:
1. Move entries from `[Unreleased]` to new version section
2. Add version number and date: `## [1.4.0] - 2025-01-15`
3. Add comparison links at bottom of file
4. Commit as separate "chore: prepare v1.4.0 release" commit

### Writing Good CHANGELOG Entries

**✅ GOOD Examples**:
```markdown
### Added
- Added `get-publication-articles` tool to retrieve articles from Medium publications
- Added fixture-based testing for article parser (31 new tests)

### Changed
- Updated article selectors to handle Medium's new table layout (Dec 2025 UI change)

### Fixed
- Fixed login detection failing when `data-testid` attribute missing
```

**❌ BAD Examples**:
```markdown
### Added
- Added new function  # Too vague
- Implemented #123   # Not user-facing

### Fixed
- Fixed bug          # Which bug?
```

### Resources

- [Keep a Changelog](https://keepachangelog.com/) - CHANGELOG format standard
- [Semantic Versioning](https://semver.org/) - Version numbering
- [Current CHANGELOG.md](../CHANGELOG.md) - Example entries

---

## 🎯 Priority Areas for Contribution

**Critical** (Always Welcome):
1. 🔴 **Selector Updates**: Medium UI changes frequently
2. 🔴 **Bug Fixes**: Session issues, timeout handling
3. 🟡 **Test Coverage**: Missing unit/integration tests
4. 🟡 **Error Messages**: More actionable context
5. 🟢 **Documentation**: Clearer examples, troubleshooting

**Maintenance** (High Value):
- Update fixtures when selectors change
- Improve debug scripts for faster troubleshooting
- Add logging for better diagnostics
- Type safety improvements

**Features** (Assess Fragility First):
- Consult AGENTS.md fragility assessment before implementing
- Prefer stable `data-testid` selectors
- Avoid modal popups and generated class names
- Document maintenance expectations

---

## 🙏 Thank You

**Thank you for contributing to Medium MCP Server!**

Your contributions help make AI-powered content publishing more accessible to developers worldwide while navigating the challenges of browser automation.

**Questions?**
- Check [AGENTS.md](./AGENTS.md) for comprehensive project documentation
- Check `docs/best-practices/` for coding standards
- Open an issue for bugs or feature requests
- Start a discussion for questions or ideas

**For AI Agents**:
- Follow this guide strictly
- Reference AGENTS.md for project context
- Read [docs/best-practices/DOCUMENTATION.md](./docs/best-practices/DOCUMENTATION.md) to understand documentation structure
- Use EnterPlanMode for planning
- Include fragility assessments
- Generate comprehensive tests

**Maintainers**: This project welcomes contributions from both human developers and AI agents. Please review AI-generated PRs with the same rigor, checking for test coverage, convention adherence, and appropriate fragility assessments. 