# Development Conventions

This directory contains reusable development conventions designed for the Medium MCP Server project but applicable to any TypeScript project.

---

## Overview

These conventions were developed through building a browser automation MCP server with complex testing needs. They're designed to be:
- **Project-agnostic**: Can be copied to any TypeScript project
- **Self-contained**: Each convention is fully documented
- **Practical**: Based on real-world experience, not theory

---

## Conventions

### 📘 [Logging Best Practices](./LOGGING.md)

**Purpose**: Structured logging with semantic levels that respects protocol constraints

**Key Features**:
- Custom Logger class with 5 semantic levels (TRACE, DEBUG, INFO, WARN, ERROR)
- All logs to stderr (MCP protocol safety - stdout reserved for JSON-RPC)
- Automatic test suppression (no manual `if (!testing)` checks)
- Environment-aware configuration

**When to use**:
- Any project with structured logging needs
- Projects using stdio transport (MCP servers, CLIs)
- Projects requiring different log levels in dev vs production
- Projects with automated testing that needs clean output

---

### 📘 [Testing Best Practices](./TESTING.md)

**Purpose**: Multi-layered testing strategy with appropriate coverage targets

**Key Features**:
- 3-layer testing: Unit (fast) → Integration (fixtures) → E2E (comprehensive)
- Fixture-based testing with HTML snapshots (fast, deterministic)
- Coverage philosophy: not all code needs 80% (browser automation is different)
- Test organization patterns

**When to use**:
- Any TypeScript project with complex testing needs
- Browser automation projects (Playwright, Puppeteer)
- Projects with UI parsing logic
- Projects where mocking provides limited value

**Coverage Guidance**:
- Core logic (validation, algorithms): 80%+
- UI parsing/selectors: 30-40% (E2E tests are more valuable)
- Overall: 40-50% is appropriate for browser automation

---

### 📘 [TypeScript Best Practices](./TYPESCRIPT.md)

**Purpose**: Type safety guidelines for eliminating runtime type errors

**Key Features**:
- Strict mode configuration
- Zero `any` types (use `unknown` + type guards)
- Explicit return types for public APIs
- Type-safe validation with Zod

**When to use**:
- Any TypeScript project prioritizing type safety
- Projects with external data sources (APIs, file parsing)
- Projects requiring runtime validation
- Teams wanting to enforce consistent type practices

---

## Using These Conventions in Other Projects

### Option 1: Direct Copy
```bash
# Copy entire conventions directory
cp -r docs/conventions/ ../my-project/docs/

# Copy individual convention
cp docs/conventions/LOGGING.md ../my-project/docs/
```

### Option 2: Reference as Template
- Read the convention
- Adapt to your project's needs
- Keep the core principles

---

## Project-Specific Implementations

These conventions are **standards**. For project-specific implementations, see:

- [AGENTS.md](../../AGENTS.md) - How Medium MCP Server applies these conventions
- [ARCHITECTURE.md](../../ARCHITECTURE.md) - Architecture decisions based on conventions
- [CONTRIBUTING.md](../../CONTRIBUTING.md) - Contribution guidelines referencing conventions

**Example**:
- [TESTING.md](./TESTING.md) defines multi-layered testing strategy (standard)
- [AGENTS.md](../../AGENTS.md#testing-strategy) shows how Medium MCP Server implements it (149 tests, 4 layers)

---

## See Also

- [CONTRIBUTING.md](../../CONTRIBUTING.md) - How to contribute to this project
- [AGENTS.md](../../AGENTS.md) - Complete project guide
- [ARCHITECTURE.md](../../ARCHITECTURE.md) - Technical architecture

---

## License

These conventions are part of the Medium MCP Server project and are licensed under the MIT License. You are free to use, modify, and distribute them in your own projects.
