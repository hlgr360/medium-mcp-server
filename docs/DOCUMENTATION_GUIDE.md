# Documentation Guide

**Purpose**: Explains the documentation structure and organization principles for this project.

**Audience**: AI agents, contributors, and maintainers

---

## Table of Contents

- [Documentation Philosophy](#documentation-philosophy)
- [Two-Tier Architecture](#two-tier-architecture)
- [File Organization](#file-organization)
- [When to Update Documentation](#when-to-update-documentation)
- [Documentation Best Practices](#documentation-best-practices)
- [For AI Agents](#for-ai-agents)

---

## Documentation Philosophy

This project maintains a **two-tier documentation architecture** that separates:

1. **Universal Best Practices** - Project-independent standards (reusable across projects)
2. **Project-Specific Guidance** - Medium MCP Server implementations and decisions

**Why this separation?**
- ✅ **Reusability**: Best practices can be copied to other TypeScript projects
- ✅ **Clarity**: Clear distinction between principles and implementations
- ✅ **Maintainability**: Project-specific docs stay focused, best practices stay portable
- ✅ **Discoverability**: Helps users find what they need quickly

---

## Two-Tier Architecture

### Tier 1: Universal Best Practices

**Location**: `docs/best-practices/`

**Characteristics**:
- ✅ **Project-agnostic**: No references to "Medium", "MCP", or project-specific tools
- ✅ **Portable**: Can be copied to any TypeScript project
- ✅ **Self-contained**: Each file is fully documented
- ✅ **Universal principles**: Describe patterns, not implementations

**Files**:
- `DEVELOPMENT.md` - Git workflow, quality standards, ADRs, checklists (500+ lines)
- `LOGGING.md` - Semantic logging patterns
- `TESTING.md` - Multi-layer testing strategy
- `TYPESCRIPT.md` - Type safety guidelines
- `README.md` - Overview of all best practices

**Example** (from LOGGING.md):
```markdown
## Semantic Log Levels

**TRACE** 🔍: Extremely detailed diagnostics
**DEBUG** 🐛: Development diagnostics
**INFO** ℹ️: User-facing messages

Use these levels consistently across your project.
```
→ No mention of Medium, MCP protocol, or specific implementation

---

### Tier 2: Project-Specific Guidance

**Location**: Root directory + `docs/adr/`

**Characteristics**:
- 🎯 **Context-specific**: References Medium.com UI, MCP protocol, Playwright
- 🎯 **Implementation details**: Exact selector arrays, test counts, file paths
- 🎯 **Tool choices**: Why we chose Playwright over Puppeteer, etc.
- 🎯 **Project conventions**: "Add selectors to fallback arrays", "Update fixtures after UI changes"

**Files**:
- `AGENTS.md` - Complete project guide for AI assistants (550+ lines)
- `CONTRIBUTING.md` - Contribution guidelines specific to this project
- `ARCHITECTURE.md` - Technical architecture of Medium MCP Server
- `README.md` - User-facing documentation
- `docs/adr/*.md` - Architecture Decision Records (why decisions were made)
- `docs/README.md` - Documentation navigation hub

**Example** (from AGENTS.md):
```markdown
## Current Selectors

**Login Indicators** (v1.2+):
```typescript
'[data-testid="headerUserIcon"]'
'[data-testid="headerWriteButton"]'
```

→ Specific to Medium.com's DOM structure, not reusable elsewhere

---

## File Organization

```
medium-mcp-server/
├── AGENTS.md                        # 📋 Tier 2: AI assistant guide (550+ lines)
├── CONTRIBUTING.md                  # 📋 Tier 2: Contribution process
├── ARCHITECTURE.md                  # 📋 Tier 2: Technical architecture
├── README.md                        # 📋 Tier 2: User documentation
├── CHANGELOG.md                     # 📋 Tier 2: Version history
│
├── docs/
│   ├── README.md                    # 📋 Tier 2: Documentation navigation
│   ├── DOCUMENTATION_GUIDE.md       # 📘 This file
│   │
│   ├── adr/                         # 📋 Tier 2: Architecture decisions
│   │   ├── README.md                # ADR index and guidance
│   │   ├── ADR_20251231_01_*.md     # Individual ADRs
│   │   └── ...
│   │
│   └── best-practices/              # 📘 Tier 1: Universal standards
│       ├── README.md                # Best practices overview
│       ├── DEVELOPMENT.md           # Git, quality, ADRs (500+ lines)
│       ├── LOGGING.md               # Logging patterns
│       ├── TESTING.md               # Testing strategy
│       └── TYPESCRIPT.md            # Type safety
│
├── scripts/
│   └── README.md                    # 📋 Tier 2: Scripts documentation
│
└── tests/fixtures/
    └── README.md                    # 📋 Tier 2: Fixtures guide
```

**Legend**:
- 📘 **Tier 1** (Universal Best Practices) - Reusable across projects
- 📋 **Tier 2** (Project-Specific) - Medium MCP Server implementations

---

## When to Update Documentation

### Changes Requiring Documentation Updates

| Change Type | Update These Docs | Tier |
|-------------|-------------------|------|
| **New MCP tool** | README.md, AGENTS.md, CHANGELOG.md | Tier 2 |
| **Selector update** | AGENTS.md (Current Selectors section) | Tier 2 |
| **Architecture change** | ARCHITECTURE.md, AGENTS.md, Create ADR | Tier 2 |
| **New best practice** | docs/best-practices/, CONTRIBUTING.md | Tier 1 |
| **Breaking change** | CHANGELOG.md (with migration guide) | Tier 2 |
| **Bug fix** | CHANGELOG.md | Tier 2 |
| **Debug script added** | scripts/README.md, AGENTS.md | Tier 2 |

See [CONTRIBUTING.md](../CONTRIBUTING.md#changelog-maintenance) for CHANGELOG update guidelines.

---

## Documentation Best Practices

### For Tier 1 (Universal Best Practices)

**DO**:
- ✅ Write for any TypeScript project
- ✅ Use hypothetical examples (not Medium-specific)
- ✅ Focus on principles and patterns
- ✅ Keep language tool-agnostic
- ✅ Document the "why" behind practices

**DON'T**:
- ❌ Reference "Medium", "MCP", or project-specific tools
- ❌ Include project-specific implementation details
- ❌ Use project-specific examples (use generic ones)
- ❌ Assume specific tech stack beyond TypeScript

**Quality Check**:
> "Can I copy this file to a new React/Vue/Node.js project and have it still be useful?"
>
> If yes → Good Tier 1 documentation ✅
>
> If no → Move content to Tier 2 or make it more generic

---

### For Tier 2 (Project-Specific Guidance)

**DO**:
- ✅ Reference best practices: "See `docs/best-practices/TESTING.md`"
- ✅ Provide exact implementation: "Run `npm run test:all` (149 tests)"
- ✅ Link to ADRs: "See ADR-004 for why we use custom Logger"
- ✅ Include project context: "Medium changes UI frequently"
- ✅ Document current state: "Current selectors as of v1.2"

**DON'T**:
- ❌ Duplicate content from Tier 1 (link to it instead)
- ❌ Document principles without application (too abstract)
- ❌ Omit rationale (use ADRs to document "why")

**Quality Check**:
> "Does this help someone contribute to Medium MCP Server specifically?"
>
> If yes → Good Tier 2 documentation ✅
>
> If no → Move to Tier 1 or delete if not valuable

---

## How Tiers Connect

**Pattern**: Best Practice → Application → Rationale

### Example 1: Logging

1. **Best Practice** (`docs/best-practices/LOGGING.md`):
   - "Use semantic log levels: TRACE, DEBUG, INFO, WARN, ERROR"

2. **Application** (`AGENTS.md`):
   - "Use `logger.info()` for MCP tool operations"
   - "Use `logger.trace()` for selector attempts"

3. **Rationale** (`docs/adr/ADR_20251231_04_semantic_logging.md`):
   - "Why custom Logger class instead of Winston"
   - "MCP protocol requires stderr-only logging"

---

### Example 2: Testing

1. **Best Practice** (`docs/best-practices/TESTING.md`):
   - "Use fixture-based testing for parsers"
   - "3-layer strategy: Unit → Integration → E2E"

2. **Application** (`AGENTS.md`):
   - "Run `npx ts-node scripts/utils/capture-fixtures.ts` to update HTML snapshots"
   - "149 tests: 29 unit + 53 integration + 31 fixtures + 56 E2E"

3. **Rationale** (`docs/adr/ADR_20251231_01_fixture_based_testing.md`):
   - "Why fixtures instead of mocks: 300x faster, no login required, deterministic"

---

## For AI Agents

### Reading Order (New to Project)

1. **Start**: [AGENTS.md](../AGENTS.md) - Primary AI assistant guide (550+ lines)
2. **Best Practices**: Review `docs/best-practices/` for standards
3. **Rationale**: Read relevant ADRs in `docs/adr/` to understand decisions
4. **Contribution**: Follow [CONTRIBUTING.md](../CONTRIBUTING.md) for workflow
5. **This Guide**: Understand documentation structure (you are here)

---

### Before Making Changes

**Checklist**:
- [ ] Read AGENTS.md thoroughly
- [ ] Review relevant best practices in `best-practices/`
- [ ] Read ADRs to understand why decisions were made
- [ ] Use EnterPlanMode for non-trivial changes
- [ ] Follow contribution guidelines in CONTRIBUTING.md
- [ ] Create new ADRs for significant architectural decisions

---

### Adding New Documentation

**Decision Tree**:

```
Is this documentation specific to Medium MCP Server?
│
├── YES → Tier 2 (Project-Specific)
│   │
│   ├── Is it an architectural decision?
│   │   └── YES → Create ADR in docs/adr/
│   │
│   ├── Is it for AI assistants specifically?
│   │   └── YES → Add to AGENTS.md
│   │
│   ├── Is it for contributors?
│   │   └── YES → Add to CONTRIBUTING.md
│   │
│   └── Is it for users?
│       └── YES → Add to README.md
│
└── NO → Tier 1 (Universal Best Practice)
    │
    ├── Is it about git/quality/ADRs?
    │   └── YES → Add to best-practices/DEVELOPMENT.md
    │
    ├── Is it about logging?
    │   └── YES → Add to best-practices/LOGGING.md
    │
    ├── Is it about testing?
    │   └── YES → Add to best-practices/TESTING.md
    │
    └── Is it about TypeScript?
        └── YES → Add to best-practices/TYPESCRIPT.md
```

---

### Documentation Update Commands

```bash
# After making changes, verify documentation is updated
grep -r "TODO" docs/  # Find incomplete documentation
grep -r "FIXME" docs/  # Find documentation needing fixes

# Check for broken links
find docs/ -name "*.md" -exec grep -H "\[.*\](.*)" {} \;

# Verify structure
ls -R docs/

# Update CHANGELOG.md
vim CHANGELOG.md  # Add entry under [Unreleased]
```

---

## Documentation Maintenance

### Periodic Reviews (Quarterly)

**Best Practices** (`docs/best-practices/`):
- [ ] Still project-agnostic? (no Medium-specific references)
- [ ] Examples still relevant to TypeScript projects?
- [ ] New patterns discovered that should be documented?
- [ ] Outdated tool recommendations? (update if needed)

**Project Docs** (AGENTS.md, CONTRIBUTING.md, etc.):
- [ ] Selector references current? (Medium UI changes frequently)
- [ ] Test counts accurate? (update after adding/removing tests)
- [ ] Links still valid? (files moved/renamed?)
- [ ] ADRs reflect current architecture? (create new ADRs if superseded)

---

## Quick Reference Card

### Where to Find Information

| Question | Answer |
|----------|--------|
| **How do I contribute?** | [CONTRIBUTING.md](../CONTRIBUTING.md) |
| **How does the system work?** | [ARCHITECTURE.md](../ARCHITECTURE.md) |
| **What are the current selectors?** | [AGENTS.md](../AGENTS.md#current-selectors) |
| **Why was decision X made?** | [docs/adr/](./adr/README.md) |
| **What are the logging standards?** | [docs/best-practices/LOGGING.md](./best-practices/LOGGING.md) |
| **How should I structure tests?** | [docs/best-practices/TESTING.md](./best-practices/TESTING.md) |
| **What's the git workflow?** | [docs/best-practices/DEVELOPMENT.md](./best-practices/DEVELOPMENT.md) |
| **How is documentation organized?** | This file (docs/DOCUMENTATION_GUIDE.md) |

---

## See Also

- [AGENTS.md](../AGENTS.md) - Primary AI assistant guide
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines
- [docs/README.md](./README.md) - Documentation navigation hub
- [docs/adr/README.md](./adr/README.md) - Architecture Decision Records index
- [docs/best-practices/README.md](./best-practices/README.md) - Best practices overview

---

## License

This documentation guide is part of the Medium MCP Server project and is licensed under the MIT License. You are free to use, modify, and distribute it in your own projects.

---

**Last Updated**: 2025-12-31

**Version**: 1.0.0

**Maintained By**: Project contributors and AI agents
