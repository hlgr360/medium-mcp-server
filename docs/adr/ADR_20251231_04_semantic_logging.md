# ADR-004: Use Custom Logger with Semantic Levels

**Status**: ✅ Accepted

**Date**: 2025-12-31

**Deciders**: Project maintainers, Claude Code (AI agent)

---

## Context

The project uses the Model Context Protocol (MCP) which communicates via JSON-RPC over stdio (standard input/output). This creates logging constraints:
- **stdout is reserved**: MCP protocol uses stdout for JSON-RPC messages
- **stderr is for logging**: All logs must go to stderr, not stdout
- **Test noise**: console.log pollutes test output, making failures hard to read

**Initial approach**: Direct `console.log()` / `console.error()` calls
- ❌ No semantic levels (info vs debug vs trace)
- ❌ Polluted test output (no automatic suppression)
- ❌ Hard to filter logs by importance
- ❌ Required manual `if (!testing)` checks everywhere

**Options considered**:
1. **console.log/error**: Simple but inflexible
2. **Winston/Bunyan**: Full-featured but heavy dependencies
3. **Custom Logger class**: Lightweight, tailored to MCP needs

## Decision

Implement **custom Logger class** (`src/logger.ts`) with semantic log levels:

```typescript
class Logger {
  trace(message: string, ...args: any[]): void  // 🔍 Extremely detailed
  debug(message: string, ...args: any[]): void  // 🐛 Development diagnostics
  info(message: string, ...args: any[]): void   // ℹ️  User-facing messages
  warn(message: string, ...args: any[]): void   // ⚠️  Warnings
  error(message: string, ...args: any[]): void  // ❌ Errors
}
```

**Key features**:
- All logs to **stderr** (MCP protocol safety)
- **Automatic test suppression** (detects NODE_ENV=test, no manual checks)
- **Environment-aware**: Set log level via `LOG_LEVEL` env var
- **Structured output**: Consistent `[LEVEL] message` format
- **Zero dependencies**: ~50 lines of code

**Migration**: Replace all `console.log` → `logger.info`, `console.error` → `logger.error`

## Consequences

### Positive
- ✅ **MCP protocol safe**: Stderr-only, never pollutes stdout JSON-RPC
- ✅ **Clean test output**: Automatic suppression, no `if (!testing)` checks
- ✅ **Semantic clarity**: Developers choose appropriate level (trace/debug/info/warn/error)
- ✅ **Filterable**: Set `LOG_LEVEL=warn` to see only warnings+errors
- ✅ **Maintainable**: Single source of truth for logging behavior
- ✅ **Lightweight**: No external dependencies, ~50 lines of code
- ✅ **Discoverable**: IDE autocomplete shows all 5 levels

**Impact**: Removed 50+ `if (!testing)` checks, cleaned up test output

### Negative
- ⚠️ **Migration effort**: Replaced ~200 console.log calls across codebase
- ⚠️ **Custom code**: Must maintain Logger class ourselves (not a library)
- ⚠️ **Learning curve**: New developers must learn semantic levels
- ⚠️ **Verbosity**: `logger.info(...)` is longer than `console.log(...)`

### Neutral
- 📝 **Documentation**: Created `docs/best-practices/LOGGING.md` with examples
- 📝 **Best Practice**: Documented when to use each log level
- 📝 **Portability**: Logger class designed to be copied to other projects

## Implementation Notes

**Semantic level guidelines**:

| Level | When to Use | Example |
|-------|-------------|---------|
| **TRACE** 🔍 | Extremely detailed diagnostics (DOM selectors, redirects) | `logger.trace('Trying selector:', selector)` |
| **DEBUG** 🐛 | Development diagnostics (operation progress) | `logger.debug('Navigated to', url)` |
| **INFO** ℹ️ | User-facing messages (operation start/complete) | `logger.info('Publishing article...')` |
| **WARN** ⚠️ | Warnings (session expired, timeouts) | `logger.warn('Session expired, re-login required')` |
| **ERROR** ❌ | Errors (catch blocks, failures) | `logger.error('Failed to publish:', error)` |

**Usage examples**:

```typescript
import { logger } from './logger';

// ✅ GOOD - Semantic levels
logger.info('Starting article retrieval');
logger.debug('Found 10 table rows');
logger.trace('Trying selector: [data-testid="story"]');
logger.warn('Session validation timeout after 5s');
logger.error('Failed to retrieve articles:', error);

// ❌ BAD - Wrong level
logger.info('Trying selector: [data-testid="story"]');  // Too noisy, use trace
logger.error('Session expired');  // Not an error, use warn
logger.debug('Operation completed');  // User-facing, use info
```

**Environment variables**:
```bash
# Set minimum log level (default: info)
LOG_LEVEL=debug npm start  # Shows debug + info + warn + error
LOG_LEVEL=warn npm start   # Shows only warn + error
LOG_LEVEL=trace npm start  # Shows everything (very verbose)

# Tests automatically suppress logs (NODE_ENV=test)
npm test  # No logs unless error
```

**Migration commands**:
```bash
# Find all console.log usage
grep -r "console\.log" src/

# Replace with appropriate logger level
# (manual: assess context to choose trace/debug/info)
```

**Logger class** (`src/logger.ts` - simplified):
```typescript
class Logger {
  private shouldLog(): boolean {
    return process.env.NODE_ENV !== 'test';
  }

  trace(message: string, ...args: any[]): void {
    if (this.shouldLog() && this.level <= LogLevel.TRACE) {
      console.error('[TRACE]', message, ...args);
    }
  }

  // ... debug, info, warn, error
}

export const logger = new Logger();
```

## References

- [docs/best-practices/LOGGING.md](../best-practices/LOGGING.md) - Complete logging documentation
- [src/logger.ts](../../src/logger.ts) - Logger implementation
- [AGENTS.md#log-levels](../../AGENTS.md#development-conventions) - Quick reference
- Commit `c6f5832` - Logger migration
- Related: [ADR-001: Fixture-Based Testing](./ADR_20251231_01_fixture_based_testing.md) - Clean test output enables fixture tests
