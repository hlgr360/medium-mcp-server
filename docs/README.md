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
- [CLAUDE.md](../CLAUDE.md) - Complete project guide (for Claude Code and developers)
- [ARCHITECTURE.md](../ARCHITECTURE.md) - Technical architecture, design decisions

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
- [CLAUDE.md](../CLAUDE.md#testing-strategy) - Project-specific test organization
- [Test Fixtures](../tests/fixtures/README.md) - Fixture-based testing

### Debugging
- [CLAUDE.md](../CLAUDE.md#debugging-workflow) - Complete debugging workflow
- [Debug Scripts](../scripts/README.md#debug-scripts-when-medium-ui-changes) - Selector debugging tools
- [Current Selectors](../CLAUDE.md#current-selectors) - Selector reference

### Architecture
- [ARCHITECTURE.md](../ARCHITECTURE.md) - System design, component interactions
- [CLAUDE.md](../CLAUDE.md#architecture) - Architecture overview

### Contributing
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Full contribution guide
- [AI Guidelines](../CONTRIBUTING.md#ai-specific-contribution-guidelines) - For Claude Code & AI agents
- [CHANGELOG Maintenance](../CONTRIBUTING.md#changelog-maintenance) - How to update CHANGELOG.md

---

## For AI Agents (Claude Code)

**Primary documentation**: [CLAUDE.md](../CLAUDE.md)

**Before making changes**:
1. Read CLAUDE.md thoroughly
2. Review relevant conventions in `conventions/`
3. Use EnterPlanMode for non-trivial changes
4. Follow contribution guidelines in CONTRIBUTING.md

---

## Keeping Documentation Updated

**When making changes**:

| Change Type | Update These Docs |
|-------------|-------------------|
| New MCP tool | README.md, CLAUDE.md, CHANGELOG.md |
| Selector update | CLAUDE.md (Current Selectors section) |
| Architecture change | ARCHITECTURE.md, CLAUDE.md |
| New convention | docs/conventions/, CONTRIBUTING.md |
| Breaking change | CHANGELOG.md (with migration guide) |
| Bug fix | CHANGELOG.md |
| Debug script added | scripts/README.md, CLAUDE.md |

See [CONTRIBUTING.md](../CONTRIBUTING.md#changelog-maintenance) for CHANGELOG update guidelines.
