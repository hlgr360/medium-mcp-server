/**
 * Custom Jest matchers for testing MCP responses and session files
 */

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidMCPResponse(): R;
      toBeValidMCPErrorResponse(): R;
      toBeValidSessionFile(): R;
    }
  }
}

expect.extend({
  /**
   * Check if response is a valid MCP success response
   */
  toBeValidMCPResponse(received: any) {
    const hasContent = received.content && Array.isArray(received.content);
    const hasTextType = hasContent && received.content.every((c: any) => c.type === 'text' && typeof c.text === 'string');
    const noError = !received.isError;

    const pass = hasContent && hasTextType && noError;

    return {
      pass,
      message: () => pass
        ? `Expected not to be a valid MCP response`
        : `Expected to be a valid MCP response with content array and text type, got: ${JSON.stringify(received)}`
    };
  },

  /**
   * Check if response is a valid MCP error response
   */
  toBeValidMCPErrorResponse(received: any) {
    const hasError = received.isError === true;
    const hasContent = received.content && Array.isArray(received.content);
    const hasTextType = hasContent && received.content.every((c: any) => c.type === 'text' && typeof c.text === 'string');

    const pass = hasError && hasContent && hasTextType;

    return {
      pass,
      message: () => pass
        ? `Expected not to be a valid MCP error response`
        : `Expected to be a valid MCP error response with isError=true and content array, got: ${JSON.stringify(received)}`
    };
  },

  /**
   * Check if data is a valid Playwright session file structure
   */
  toBeValidSessionFile(received: any) {
    // Handle null/undefined
    if (!received || typeof received !== 'object') {
      return {
        pass: false,
        message: () => `Expected to be a valid session file, but received: ${JSON.stringify(received)}`
      };
    }

    const hasCookies = !!(received.cookies && Array.isArray(received.cookies));
    const hasOrigins = !!(received.origins && Array.isArray(received.origins));
    const cookiesValid = hasCookies ? received.cookies.every((c: any) =>
      typeof c.name === 'string' &&
      typeof c.value === 'string' &&
      typeof c.domain === 'string' &&
      typeof c.path === 'string'
    ) : false;

    const pass = hasCookies && hasOrigins && cookiesValid;

    return {
      pass,
      message: () => pass
        ? `Expected not to be a valid session file structure`
        : `Expected to be a valid session file with cookies and origins arrays, got: ${JSON.stringify(received)}`
    };
  }
});

export {};
