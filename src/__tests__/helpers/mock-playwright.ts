import { Browser, Page, BrowserContext, Response } from 'playwright';

/**
 * Mock factory for Playwright objects used in tests.
 * Provides reusable mocks for Browser, Page, and BrowserContext.
 */
export class MockPlaywrightFactory {
  /**
   * Create a mock Browser object with common methods
   */
  createMockBrowser(overrides?: Partial<Browser>): Browser {
    return {
      contexts: jest.fn(() => []),
      newContext: jest.fn(),
      close: jest.fn(),
      isConnected: jest.fn(() => true),
      newPage: jest.fn(),
      version: jest.fn(() => '1.0.0'),
      browserType: jest.fn(),
      ...overrides
    } as unknown as Browser;
  }

  /**
   * Create a mock Page object with common methods
   */
  createMockPage(overrides?: Partial<Page>): Page {
    return {
      goto: jest.fn(),
      url: jest.fn(() => 'https://medium.com'),
      waitForLoadState: jest.fn(),
      waitForSelector: jest.fn(),
      waitForTimeout: jest.fn(),
      evaluate: jest.fn(),
      click: jest.fn(),
      fill: jest.fn(),
      keyboard: {
        press: jest.fn(),
        type: jest.fn()
      },
      locator: jest.fn(),
      context: jest.fn(),
      mainFrame: jest.fn(),
      frames: jest.fn(() => []),
      title: jest.fn(() => 'Medium'),
      content: jest.fn(() => '<html></html>'),
      close: jest.fn(),
      isClosed: jest.fn(() => false),
      ...overrides
    } as unknown as Page;
  }

  /**
   * Create a mock BrowserContext object with common methods
   */
  createMockContext(overrides?: Partial<BrowserContext>): BrowserContext {
    return {
      addInitScript: jest.fn(),
      newPage: jest.fn(),
      storageState: jest.fn(() => ({
        cookies: [],
        origins: []
      })),
      close: jest.fn(),
      browser: jest.fn(),
      pages: jest.fn(() => []),
      setDefaultTimeout: jest.fn(),
      setDefaultNavigationTimeout: jest.fn(),
      ...overrides
    } as unknown as BrowserContext;
  }

  /**
   * Create a mock Response object
   */
  createMockResponse(overrides?: Partial<Response>): Response {
    return {
      status: jest.fn(() => 200),
      ok: jest.fn(() => true),
      url: jest.fn(() => 'https://medium.com'),
      headers: jest.fn(() => ({})),
      json: jest.fn(),
      text: jest.fn(),
      body: jest.fn(),
      ...overrides
    } as unknown as Response;
  }
}
