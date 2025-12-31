# ADR-002: Reorganize Scripts into Subdirectories

**Status**: ✅ Accepted

**Date**: 2025-12-31

**Deciders**: Project maintainers, Claude Code (AI agent)

---

## Context

The `scripts/` directory contained 33 files in a flat structure:
- 15 debugging scripts (`debug-*.ts`)
- 16 manual test scripts (`test-*.ts`)
- 2 utility scripts (`setup-test-session.ts`, `capture-fixtures.ts`)

**Problems**:
- Difficult to find the right tool (33 files in one directory)
- No clear distinction between debugging vs testing vs utilities
- New developers overwhelmed by number of scripts
- Hard to document script usage (which to use when?)
- Root directory cluttered with debug output (screenshots, JSON files)

**Options considered**:
1. **Keep flat structure**: Simple but doesn't scale
2. **Organize by feature** (articles/, lists/, auth/): Doesn't match usage pattern
3. **Organize by purpose** (debug/, test/, utils/): Matches how developers use them

## Decision

Reorganize scripts into **purpose-based subdirectories**:

```
scripts/
├── README.md              # Comprehensive usage guide
├── debug/                 # Debugging tools (15 scripts)
│   └── debug-*.ts         # When Medium UI changes break selectors
├── test/                  # Manual test scripts (16 scripts)
│   └── test-*.ts          # Validate functionality after changes
└── utils/                 # Utility scripts (2 scripts)
    ├── setup-test-session.ts    # Playwright globalSetup
    └── capture-fixtures.ts      # Capture HTML snapshots
```

**Guiding principles**:
- **By purpose, not feature**: Matches developer workflow ("I need to debug" vs "I need article scripts")
- **Preserve git history**: Use `git mv` instead of delete+create
- **Create navigation**: `scripts/README.md` with quick reference tables
- **Centralize output**: Create `.debug/` for debug artifacts

**Related changes**:
- Create `.debug/{screenshots,analysis}/` for debug script output
- Add `.debug/` to `.gitignore`
- Update all script output paths from `../debug-*.png` to `../../.debug/screenshots/debug-*.png`
- Update 26 files with new script paths (docs + config)
- Clean up root directory (removed 18 obsolete files)

## Consequences

### Positive
- ✅ **Discoverability**: Clear purpose-based organization
- ✅ **Documentation**: `scripts/README.md` provides quick reference tables
- ✅ **Clean root**: Debug artifacts in `.debug/`, not project root
- ✅ **Git history**: Preserved via `git mv` (not delete+create)
- ✅ **Scalability**: Can add more scripts without overwhelming directories
- ✅ **Onboarding**: New developers understand structure immediately

**Impact**: Reduced "time to find right script" from ~2 min (scanning 33 files) to ~30 sec (scan README table)

### Negative
- ⚠️ **Import paths changed**: Required fixing 21 files with `../../src/` instead of `../src/`
- ⚠️ **Breaking change**: External scripts referencing old paths broke temporarily
- ⚠️ **Documentation burden**: Updated 26 files across codebase (docs, config, tests)
- ⚠️ **Learning curve**: Existing developers must learn new paths
- ⚠️ **Extra directory depth**: `npx ts-node scripts/debug/debug-login.ts` (longer path)

### Neutral
- 📝 **Navigation READMEs**: Added 3 README files for navigation (scripts/, docs/, docs/conventions/)
- 📝 **Output standardization**: All debug scripts now output to `.debug/` consistently
- 📝 **Config updates**: Updated `playwright.config.ts` globalSetup path

## Implementation Notes

**Import path gotcha** (CRITICAL for AI agents):

After moving files from `scripts/` → `scripts/debug/`, imports needed updating:

```typescript
// ❌ BROKEN (old path, file now in subdirectory)
import { BrowserMediumClient } from '../src/browser-client';

// ✅ FIXED (correct relative path from scripts/debug/)
import { BrowserMediumClient } from '../../src/browser-client';
```

**Rule**: Count directory levels:
- `scripts/` → 1 level deep → `../src/`
- `scripts/debug/` → 2 levels deep → `../../src/`

This mistake affected 21 files and caused Playwright tests to fail initially.

**Files updated** (26 total):
- `playwright.config.ts` - globalSetup path
- `tests/helpers/ensure-fixtures.ts` - 3 script references
- `AGENTS.md` - ~100+ script path references
- `CONTRIBUTING.md` - ~50+ script path references
- `README.md`, `ARCHITECTURE.md`, `scripts/README.md` - misc references
- All 21 moved scripts - import paths

**Migration commands**:
```bash
# Create structure
mkdir -p scripts/{debug,test,utils} .debug/{screenshots,analysis}

# Move files with git mv (preserves history)
git mv scripts/debug-*.ts scripts/debug/
git mv scripts/test-*.ts scripts/test/
git mv scripts/{setup-test-session,capture-fixtures}.ts scripts/utils/

# Fix import paths (sed or manual)
find scripts/debug scripts/test -name "*.ts" -exec sed -i '' "s|from '../src/|from '../../src/|g" {} \;

# Update .gitignore
echo ".debug/" >> .gitignore
```

## References

- [scripts/README.md](../../scripts/README.md) - Complete scripts documentation
- Commit `55b6914` - Script reorganization and import path fixes
- Related: [ADR-003: AGENTS.md Convention](./ADR_20251231_03_agents_md_convention.md) - Part of documentation restructuring
- GitHub Issue: None (proactive improvement)
