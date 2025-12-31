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

## Naming Convention

**This project uses the date-based format**:

```
ADR_YYYYMMDD_NN_description.md

Examples:
ADR_20251231_01_fixture_based_testing.md
ADR_20251231_02_script_reorganization.md
ADR_20251231_03_agents_md_convention.md
```

**Why this format**:
- ✅ Shows when decision was made (date in filename)
- ✅ Sortable by date
- ✅ Sequential numbering per day (NN)
- ✅ Self-documenting (no need to check git history for date)
- ❌ More verbose than simple number format

**Alternative format** (not used in this project):
```
###-description.md           # Number-based format
001-fixture-based-testing.md # Example
```

See [DEVELOPMENT.md](../conventions/DEVELOPMENT.md#adr-naming-conventions) for both formats and trade-offs.

## ADR Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [ADR-001](./ADR_20251231_01_fixture_based_testing.md) | Use Fixture-Based Testing for HTML Parsers | ✅ Accepted | 2025-12-31 |
| [ADR-002](./ADR_20251231_02_script_reorganization.md) | Reorganize Scripts into Subdirectories | ✅ Accepted | 2025-12-31 |
| [ADR-003](./ADR_20251231_03_agents_md_convention.md) | Adopt AGENTS.md Convention for AI Guidance | ✅ Accepted | 2025-12-31 |
| [ADR-004](./ADR_20251231_04_semantic_logging.md) | Use Custom Logger with Semantic Levels | ✅ Accepted | 2025-12-31 |
| [ADR-005](./ADR_20251231_05_selector_fallback_strategy.md) | Use Selector Fallback Arrays for Resilience | ✅ Accepted | 2025-12-31 |

## ADR Lifecycle

**Status Values**:
- **Proposed**: Under consideration
- **Accepted**: Decision approved and implemented
- **Deprecated**: No longer recommended but not yet removed
- **Superseded**: Replaced by a newer decision (link to new ADR)

### CRITICAL: Never Modify Existing ADRs

**❌ DO NOT modify accepted ADRs** - They are historical records

**Why**: ADRs capture decisions at a point in time. Modifying them erases history and context.

**Instead**:
1. Create a new ADR that supersedes the old one
2. Update old ADR status to "Superseded by ADR-XXX"
3. Link between old and new ADRs

**Example supersession**:

Old ADR (001-use-sqlite.md):
```markdown
# ADR-001: Use SQLite for Storage

**Status**: Superseded by [ADR-015](./015-use-postgresql.md)

**Date**: 2024-01-15

(Original content remains unchanged...)
```

New ADR (015-use-postgresql.md):
```markdown
# ADR-015: Migrate to PostgreSQL

**Status**: Accepted

**Date**: 2025-01-30

**Supersedes**: [ADR-001](./001-use-sqlite.md)

## Context
SQLite (ADR-001) worked initially but doesn't scale for production...
```

**When to supersede**:
- Requirements changed (what was right then isn't right now)
- New information available (learned something new)
- Technology evolved (better options exist)
- Original decision proven problematic

**When to deprecate**:
- Decision still valid but no longer recommended
- Gradual migration to new approach
- Backward compatibility maintained

## Creating New ADRs

When making significant architectural decisions:

1. Copy the template below
2. Use today's date and next sequential number for the day
3. Format: `ADR_YYYYMMDD_NN_description.md` (underscores for description)
4. Update the index above
5. Commit with message: `docs: Add ADR-### - Title`

**Example**: On 2025-01-15, creating first ADR of the day:
- Filename: `ADR_20250115_01_add_caching_layer.md`
- Title in file: `# ADR-006: Add Caching Layer`
- Index entry: `[ADR-006](./ADR_20250115_01_add_caching_layer.md)`

### ADR Template

```markdown
# ADR-###: Title in Imperative Mood

**Status**: Proposed | Accepted | Deprecated | Superseded by [ADR-###](./ADR_YYYYMMDD_NN_title.md)

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
