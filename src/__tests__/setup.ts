/**
 * Global test setup file for Jest
 * Mocks playwright-extra to prevent real browser launches in ALL tests
 */

// Mock playwright-extra globally before any tests run
jest.mock('playwright-extra', () => {
  // Create a complete mock browser structure
  const mockPage = {
    goto: jest.fn().mockResolvedValue(null),
    waitForLoadState: jest.fn().mockResolvedValue(null),
    waitForTimeout: jest.fn().mockResolvedValue(null),
    url: jest.fn().mockReturnValue('https://medium.com'),
    evaluate: jest.fn().mockResolvedValue([]),
    close: jest.fn().mockResolvedValue(null),
    click: jest.fn().mockResolvedValue(null),
    fill: jest.fn().mockResolvedValue(null),
    type: jest.fn().mockResolvedValue(null),
    locator: jest.fn().mockReturnValue({
      click: jest.fn().mockResolvedValue(null),
      fill: jest.fn().mockResolvedValue(null),
      textContent: jest.fn().mockResolvedValue(''),
      count: jest.fn().mockResolvedValue(0)
    }),
    $: jest.fn().mockResolvedValue(null),
    $$: jest.fn().mockResolvedValue([]),
    waitForSelector: jest.fn().mockResolvedValue(null)
  };

  const mockContext = {
    newPage: jest.fn().mockResolvedValue(mockPage),
    addInitScript: jest.fn().mockResolvedValue(null),
    storageState: jest.fn().mockResolvedValue({ cookies: [], origins: [] }),
    close: jest.fn().mockResolvedValue(null),
    pages: jest.fn().mockReturnValue([mockPage])
  };

  const mockBrowser = {
    newContext: jest.fn().mockResolvedValue(mockContext),
    contexts: jest.fn().mockReturnValue([mockContext]),
    close: jest.fn().mockResolvedValue(null)
  };

  const mockChromium = {
    launch: jest.fn().mockResolvedValue(mockBrowser),
    use: jest.fn() // Mock the .use() method for stealth plugin
  };

  return {
    chromium: mockChromium
  };
});

console.error('✅ Global playwright-extra mock loaded');
