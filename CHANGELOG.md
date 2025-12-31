# Changelog

All notable changes to Medium MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive compliance analysis and remediation planning
- Enhanced documentation with best practices guides

### Changed
- Improved code quality standards documentation

## [1.3.0] - 2025-12-27

### Added
- Added `get-feed` tool to retrieve articles from Medium feeds (Featured/For You/Following/All)
- Added `get-lists` tool to retrieve user's reading lists
- Added `get-list-articles` tool to retrieve articles from specific reading lists
- Added E2E tests for `get-article-content` and `search-medium` tools
- Added comprehensive debugging and test scripts for editor functionality
- Added selector debugging guide

### Changed
- Rewrote `getUserArticles` with stealth mode and tab-based scraping for better reliability
- Removed `isDraft` parameter from publish-article (now creates drafts only by default)
- Improved documentation with MCP debugging section

### Fixed
- Fixed `publishArticle` with updated Medium editor selectors
- Fixed article URL handling in E2E tests

## [1.2.0] - 2025-12-25

### Added
- Added fixture-based testing infrastructure for HTML parsers
- Added standalone parser modules (`tests/parsers/`) for better testability
- Added custom Logger class with semantic log levels (TRACE, DEBUG, INFO, WARN, ERROR)
- Added automated test session setup with globalSetup
- Added Architecture Decision Records (ADRs) for key project decisions
- Added comprehensive development best practices documentation

### Changed
- Reorganized scripts into `debug/` and `test/` subdirectories
- Migrated to AGENTS.md convention for AI coding assistant guidance
- Modularized development conventions for reusability across projects
- Suppressed diagnostic console output during test runs
- Made fixture capture account-independent

### Fixed
- Fixed test reliability by optimizing E2E test login flow
- Fixed session management in tests to reduce login overhead

### Documentation
- Restructured CLAUDE.md for better clarity and navigation
- Added documentation for fixture-based testing workflow
- Added best practices guides (LOGGING.md, TESTING.md, TYPESCRIPT.md, DEVELOPMENT.md)
- Renamed conventions directory to best-practices

## [1.1.0] - 2024-10-15

### Added
- Added comprehensive test suite with 149 tests (unit, integration, E2E)
- Added session validation and automatic renewal
- Added support for multiple article states (draft, published, unlisted, scheduled)

### Changed
- Improved error handling throughout codebase
- Enhanced selector strategies with more fallback options
- Improved session management with cookie expiry validation

### Fixed
- Fixed login detection with updated Medium UI selectors
- Fixed article extraction edge cases

## [1.0.0] - 2024-07-08

### 🎉 Initial Release

**Major Achievement**: Complete rewrite from API-based to browser automation approach due to Medium's API deprecation.

### Added
- **Browser-based automation** using Playwright instead of deprecated Medium API
- **MCP Tools**:
  - `publish-article` - Publish articles with title, content, tags, and draft option
  - `get-my-articles` - Retrieve user's published articles
  - `search-medium` - Search Medium articles by keywords
  - `get-article-content` - Extract full content from any Medium article
  - `login-to-medium` - Manual login trigger for session management

### Features
- **Session persistence** - Login once, use everywhere via `medium-session.json`
- **Headless operation** - Runs without UI after initial login
- **Anti-detection measures** - Realistic browser automation to avoid blocking
- **Multiple login methods** - Support for email/password and Google login
- **Robust content extraction** - Handles both preview and full article content
- **Enhanced search** - Returns actual article URLs with proper content extraction
- **Error handling** - Comprehensive error messages and recovery strategies

### Technical Implementation
- **TypeScript** with strict mode configuration
- **Playwright** browser automation with Chromium
- **MCP SDK** integration for Claude compatibility
- **Zod** schema validation for type safety
- **Session management** with automatic validation and renewal

### Browser Automation Features
- **Smart selectors** with fallback strategies for UI changes
- **Rate limiting** respect for Medium's servers
- **Timeout handling** for reliable automation
- **Preview detection** for content extraction
- **URL validation** to ensure proper article links

### Documentation
- Comprehensive README with setup instructions
- Troubleshooting guide for common issues
- Contributing guidelines for developers
- Example configurations for Claude integration

### Development Tools
- Multiple test scripts for validation
- Debug utilities for selector updates
- Session management helpers
- Login flow debugging tools

## [0.x.x] - Legacy API Version

### Deprecated
- **Medium API integration** - No longer functional due to Medium's API discontinuation
- **OAuth2 flow** - Replaced with browser-based session management
- **API token authentication** - Not available for new users

---

## Future Roadmap

### Planned Features
- **Publication support** - Publish to Medium publications
- **Article analytics** - Retrieve article performance data
- **Bulk operations** - Mass article management
- **Enhanced tagging** - Better tag management and suggestions
- **Draft management** - Advanced draft handling and scheduling

### Technical Improvements
- **Performance optimization** - Faster browser automation
- **Selector resilience** - Better handling of Medium UI changes
- **Session security** - Enhanced session encryption and management
- **Error recovery** - More robust error handling and retry logic

---

## Migration Guide

### From API Version (0.x.x) to Browser Version (1.0.0)

**Breaking Changes**:
- No more API tokens required
- New authentication flow via browser login
- Different response formats for some tools
- Session management replaces token-based auth

**Migration Steps**:
1. Remove old `.env` API configurations
2. Install Playwright: `npx playwright install chromium`
3. Update Claude MCP configuration
4. Run initial login: `npm start` and complete browser login
5. Test functionality with new browser-based tools

**Benefits of Migration**:
- ✅ No API token limitations
- ✅ Access to full Medium functionality
- ✅ Better content extraction capabilities
- ✅ Support for all Medium features

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to contribute to this project.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 