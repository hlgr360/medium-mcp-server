# Documentation

Comprehensive documentation for Medium MCP Server.

---

## For Users

**Getting Started**:
- [README.md](../README.md) - Installation, configuration, usage guide
- [Configuration Examples](../examples/) - Claude Desktop config examples

**Understanding the Project**:
- [CHANGELOG.md](../CHANGELOG.md) - Version history and release notes
- [LICENSE](../LICENSE) - MIT License

---

## For Contributors

**Essential Reading**:
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines, PR process
- [AGENTS.md](../AGENTS.md) - Complete project guide (for AI agents and developers)
- [ARCHITECTURE.md](../ARCHITECTURE.md) - Technical architecture, design decisions

**Architecture Decision Records** (Why Decisions Were Made):
- [ADR Index](./adr/README.md) - All ADRs with quick navigation
- [ADR-001: Fixture-Based Testing](./adr/ADR_20251231_01_fixture_based_testing.md) - Why we use HTML snapshots
- [ADR-002: Script Reorganization](./adr/ADR_20251231_02_script_reorganization.md) - Why scripts are in subdirectories
- [ADR-003: AGENTS.md Convention](./adr/ADR_20251231_03_agents_md_convention.md) - Why AGENTS.md instead of CLAUDE.md
- [ADR-004: Semantic Logging](./adr/ADR_20251231_04_semantic_logging.md) - Why custom Logger with levels
- [ADR-005: Selector Fallback Strategy](./adr/ADR_20251231_05_selector_fallback_strategy.md) - Why selector arrays

**Development Conventions** (Reusable Standards):
- [Logging Best Practices](./conventions/LOGGING.md)
- [Testing Best Practices](./conventions/TESTING.md)
- [TypeScript Best Practices](./conventions/TYPESCRIPT.md)

See [conventions/README.md](./conventions/README.md) for overview.

---

## Quick Links by Topic

### Configuration
- [README.md](../README.md#configuration) - Claude Desktop setup
- [.env.example](../.env.example) - Environment variables

### Testing
- [Testing Conventions](./conventions/TESTING.md) - Multi-layered testing strategy
- [AGENTS.md](../AGENTS.md#testing-strategy) - Project-specific test organization
- [Test Fixtures](../tests/fixtures/README.md) - Fixture-based testing

### Debugging
- [AGENTS.md](../AGENTS.md#debugging-workflow) - Complete debugging workflow
- [Debug Scripts](../scripts/README.md#debug-scripts-when-medium-ui-changes) - Selector debugging tools
- [Current Selectors](../AGENTS.md#current-selectors) - Selector reference

### Architecture
- [ARCHITECTURE.md](../ARCHITECTURE.md) - System design, component interactions
- [AGENTS.md](../AGENTS.md#architecture) - Architecture overview
- [ADRs](./adr/README.md) - Why architectural decisions were made

### Contributing
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Full contribution guide
- [AI Guidelines](../CONTRIBUTING.md#ai-specific-contribution-guidelines) - For AI agents
- [CHANGELOG Maintenance](../CONTRIBUTING.md#changelog-maintenance) - How to update CHANGELOG.md
- [ADRs](./adr/README.md) - Decision rationale and context

---

## For AI Agents

**Primary documentation**: [AGENTS.md](../AGENTS.md)

**Before making changes**:
1. Read AGENTS.md thoroughly
2. Review relevant conventions in `conventions/`
3. **Read ADRs** in `adr/` to understand why decisions were made
4. Use EnterPlanMode for non-trivial changes
5. Follow contribution guidelines in CONTRIBUTING.md
6. **Create new ADRs** for significant architectural decisions

---

## Keeping Documentation Updated

**When making changes**:

| Change Type | Update These Docs |
|-------------|-------------------|
| New MCP tool | README.md, AGENTS.md, CHANGELOG.md |
| Selector update | AGENTS.md (Current Selectors section) |
| Architecture change | ARCHITECTURE.md, AGENTS.md |
| New convention | docs/conventions/, CONTRIBUTING.md |
| Breaking change | CHANGELOG.md (with migration guide) |
| Bug fix | CHANGELOG.md |
| Debug script added | scripts/README.md, AGENTS.md |

See [CONTRIBUTING.md](../CONTRIBUTING.md#changelog-maintenance) for CHANGELOG update guidelines.
