# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records (ADRs) - lightweight documents that capture important architectural and design decisions made in this project.

## What is an ADR?

An ADR is a short document that describes:
- **Context**: The issue or situation requiring a decision
- **Decision**: The change or solution we've decided to implement
- **Consequences**: The positive, negative, and neutral outcomes of the decision
- **Status**: Whether the decision is accepted, superseded, or deprecated

## Why ADRs?

ADRs help future developers (human and AI) understand:
- **Why** decisions were made, not just **what** was decided
- **Trade-offs** that were considered
- **Context** that influenced the decision
- **Lessons learned** from implementation

This is especially valuable for AI coding assistants who need to understand project history and rationale.

## ADR Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [ADR-001](./001-fixture-based-testing.md) | Use Fixture-Based Testing for HTML Parsers | ✅ Accepted | 2025-12-31 |
| [ADR-002](./002-script-reorganization.md) | Reorganize Scripts into Subdirectories | ✅ Accepted | 2025-12-31 |
| [ADR-003](./003-agents-md-convention.md) | Adopt AGENTS.md Convention for AI Guidance | ✅ Accepted | 2025-12-31 |
| [ADR-004](./004-semantic-logging.md) | Use Custom Logger with Semantic Levels | ✅ Accepted | 2025-12-31 |
| [ADR-005](./005-selector-fallback-strategy.md) | Use Selector Fallback Arrays for Resilience | ✅ Accepted | 2025-12-31 |

## ADR Lifecycle

**Status Values**:
- **Proposed**: Under consideration
- **Accepted**: Decision approved and implemented
- **Deprecated**: No longer recommended but not yet removed
- **Superseded**: Replaced by a newer decision (link to new ADR)

## Creating New ADRs

When making significant architectural decisions:

1. Copy the template below
2. Number sequentially (ADR-006, ADR-007, etc.)
3. Use kebab-case for filename: `###-short-title.md`
4. Update the index above
5. Commit with message: `docs: Add ADR-### - Title`

### ADR Template

```markdown
# ADR-###: Title in Imperative Mood

**Status**: Proposed | Accepted | Deprecated | Superseded by [ADR-###](./###-title.md)

**Date**: YYYY-MM-DD

**Deciders**: Who was involved in the decision

---

## Context

What is the issue we're facing? What factors are influencing this decision?
Include technical, organizational, and project-specific context.

## Decision

What change are we making? Be specific and actionable.

## Consequences

### Positive
- What benefits do we get from this decision?
- What problems does it solve?

### Negative
- What drawbacks or challenges does this introduce?
- What do we give up?

### Neutral
- What other implications should we be aware of?
- What maintenance burden does this create?

## Implementation Notes

Optional: Specific details about how this was implemented, gotchas, or references.

## References

Optional: Links to related docs, GitHub issues, commits, or external resources.
```

## References

- [ADR GitHub Organization](https://adr.github.io/) - Community resources
- [Michael Nygard's Blog Post](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) - Original ADR concept
- [ADR Tools](https://github.com/npryce/adr-tools) - Command-line tools for managing ADRs

---

**For AI Agents**: When making architectural decisions in this project, create an ADR to document your reasoning. This helps future AI agents (and humans) understand why choices were made.
