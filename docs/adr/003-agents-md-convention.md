# ADR-003: Adopt AGENTS.md Convention for AI Guidance

**Status**: ✅ Accepted

**Date**: 2025-12-31

**Deciders**: Project maintainers, Claude Code (AI agent)

---

## Context

The project had a `CLAUDE.md` file (550+ lines) providing guidance to Claude Code, an AI coding assistant. This file contained:
- Project overview and architecture
- Development commands and workflows
- Testing strategy and debugging guides
- Code conventions and best practices

**Problem**: The filename `CLAUDE.md` is:
- **Tool-specific**: Implies only for Claude Code, not GitHub Copilot, Cursor, etc.
- **Not discoverable**: Other AI tools don't automatically recognize this file
- **Non-standard**: Community is converging on `AGENTS.md` as the universal convention

**Community trend**: Reddit discussion ([r/GithubCopilot](https://www.reddit.com/r/GithubCopilot/comments/1nee01w/agentsmd_vs_claudemd/)) highlighted `AGENTS.md` as emerging industry standard for AI assistant guidance.

**Options considered**:
1. **Keep CLAUDE.md**: Tool-specific but works for current use
2. **Rename to AI.md**: Generic but not a recognized convention
3. **Adopt AGENTS.md**: Industry standard, tool-agnostic, discoverable

## Decision

Migrate from `CLAUDE.md` to **`AGENTS.md`** following the industry standard convention:

1. Create `AGENTS.md` with full AI assistant guidance (copy from CLAUDE.md)
2. Update header to be tool-agnostic: "AI coding assistants (Claude Code, GitHub Copilot, Cursor, etc.)"
3. Replace `CLAUDE.md` content with reference pointer to `AGENTS.md`
4. Update all cross-references across documentation (7 files, 25 references)

**Key principle**: `AGENTS.md` is the primary AI guidance file, `CLAUDE.md` redirects for compatibility.

## Consequences

### Positive
- ✅ **Universal**: Works with Claude Code, GitHub Copilot, Cursor, and all AI assistants
- ✅ **Discoverable**: Recognized naming convention across AI coding community
- ✅ **Future-proof**: Not tied to a specific tool or company
- ✅ **Industry alignment**: Following emerging standard
- ✅ **Backward compatible**: `CLAUDE.md` still exists as redirect
- ✅ **Better for open source**: Contributors using different AI tools can all benefit

**Impact**: No functional change, purely organizational. AI agents can now find guidance regardless of tool.

### Negative
- ⚠️ **Breaking change**: External links to `CLAUDE.md` sections now redirect
- ⚠️ **Documentation burden**: Updated 25 references across 7 files
- ⚠️ **Two files to maintain**: `CLAUDE.md` redirect must stay in sync if AGENTS.md URL structure changes
- ⚠️ **Potential confusion**: New contributors might not know which file is authoritative

### Neutral
- 📝 **Git history**: Full content preserved in `AGENTS.md`, `CLAUDE.md` history shows migration
- 📝 **File size**: Added ~550 lines (AGENTS.md) but reduced CLAUDE.md to ~30 lines
- 📝 **Link explanation**: `CLAUDE.md` explains why migration happened with Reddit discussion link

## Implementation Notes

**Migration steps**:
```bash
# 1. Create AGENTS.md with full content
cp CLAUDE.md AGENTS.md
# Update header: "This file provides guidance to AI coding assistants..."

# 2. Replace CLAUDE.md with redirect
cat > CLAUDE.md <<EOF
# CLAUDE.md

**Note**: This file has been superseded by [AGENTS.md](./AGENTS.md).

See: https://www.reddit.com/r/GithubCopilot/comments/1nee01w/agentsmd_vs_claudemd/
EOF

# 3. Update all references
sed -i '' 's/CLAUDE\.md/AGENTS.md/g' CONTRIBUTING.md README.md docs/*.md scripts/README.md

# 4. Commit
git add AGENTS.md CLAUDE.md ...
git commit -m "docs: Migrate to AGENTS.md convention for universal AI assistant guidance"
```

**Files updated** (7 total):
- `CONTRIBUTING.md` - 7 references
- `README.md` - 2 references
- `docs/README.md` - 10 references
- `docs/conventions/README.md` - 3 references
- `ARCHITECTURE.md` - 1 reference
- `scripts/README.md` - 2 references

**AGENTS.md header** (key change):
```markdown
# AGENTS.md

This file provides guidance to AI coding assistants (Claude Code, GitHub Copilot,
Cursor, etc.) when working with code in this repository.
```

**CLAUDE.md content** (redirect):
```markdown
# CLAUDE.md

**Note**: This file has been superseded by [AGENTS.md](./AGENTS.md).

All AI coding assistant guidance is now maintained in AGENTS.md following the
industry-standard convention for universal AI assistant documentation.
```

## References

- [AGENTS.md](../../AGENTS.md) - The authoritative AI guidance file
- [CLAUDE.md](../../CLAUDE.md) - Redirect with explanation
- [Reddit Discussion](https://www.reddit.com/r/GithubCopilot/comments/1nee01w/agentsmd_vs_claudemd/) - Community convention
- Commit `6eb90b8` - AGENTS.md migration
- Related: [ADR-002: Script Reorganization](./002-script-reorganization.md) - Part of documentation restructuring
