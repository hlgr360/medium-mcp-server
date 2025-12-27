import { MediumArticle } from '../../browser-client';

/**
 * Mock session data for testing
 */
export const MOCK_SESSIONS = {
  /**
   * Valid session with unexpired cookies
   */
  valid: {
    cookies: [
      {
        name: 'sid',
        value: 'mock-session-id',
        domain: 'medium.com',
        path: '/',
        expires: Date.now() / 1000 + (365 * 24 * 60 * 60), // 1 year from now
        httpOnly: true,
        secure: true,
        sameSite: 'Lax' as const
      },
      {
        name: 'uid',
        value: 'mock-user-id',
        domain: 'medium.com',
        path: '/',
        expires: Date.now() / 1000 + (365 * 24 * 60 * 60), // 1 year from now
        httpOnly: true,
        secure: true,
        sameSite: 'Lax' as const
      },
      {
        name: '_ga',
        value: 'analytics-cookie',
        domain: 'medium.com',
        path: '/',
        expires: Date.now() / 1000 + (30 * 24 * 60 * 60), // 30 days from now
        httpOnly: false,
        secure: false,
        sameSite: 'Lax' as const
      }
    ],
    origins: [
      {
        origin: 'https://medium.com',
        localStorage: []
      }
    ]
  },

  /**
   * Session with expired sid cookie
   */
  expiredSid: {
    cookies: [
      {
        name: 'sid',
        value: 'expired-session',
        domain: 'medium.com',
        path: '/',
        expires: Date.now() / 1000 - 3600, // Expired 1 hour ago
        httpOnly: true,
        secure: true,
        sameSite: 'Lax' as const
      },
      {
        name: 'uid',
        value: 'mock-user-id',
        domain: 'medium.com',
        path: '/',
        expires: Date.now() / 1000 + (365 * 24 * 60 * 60), // Still valid
        httpOnly: true,
        secure: true,
        sameSite: 'Lax' as const
      }
    ],
    origins: []
  },

  /**
   * Session with expired uid cookie
   */
  expiredUid: {
    cookies: [
      {
        name: 'sid',
        value: 'mock-session-id',
        domain: 'medium.com',
        path: '/',
        expires: Date.now() / 1000 + (365 * 24 * 60 * 60), // Still valid
        httpOnly: true,
        secure: true,
        sameSite: 'Lax' as const
      },
      {
        name: 'uid',
        value: 'expired-user',
        domain: 'medium.com',
        path: '/',
        expires: Date.now() / 1000 - 3600, // Expired 1 hour ago
        httpOnly: true,
        secure: true,
        sameSite: 'Lax' as const
      }
    ],
    origins: []
  },

  /**
   * Session with only analytics cookies (no auth cookies)
   */
  noAuthCookies: {
    cookies: [
      {
        name: '_ga',
        value: 'analytics',
        domain: 'medium.com',
        path: '/',
        expires: -1, // Session cookie
        httpOnly: false,
        secure: false,
        sameSite: 'Lax' as const
      },
      {
        name: '_gid',
        value: 'analytics-id',
        domain: 'medium.com',
        path: '/',
        expires: Date.now() / 1000 + (24 * 60 * 60), // 1 day
        httpOnly: false,
        secure: false,
        sameSite: 'Lax' as const
      }
    ],
    origins: []
  },

  /**
   * Session with session cookies (expires = -1)
   */
  sessionCookies: {
    cookies: [
      {
        name: 'sid',
        value: 'session-only',
        domain: 'medium.com',
        path: '/',
        expires: -1, // Session cookie (no expiry)
        httpOnly: true,
        secure: true,
        sameSite: 'Lax' as const
      }
    ],
    origins: []
  },

  /**
   * Empty session (no cookies)
   */
  empty: {
    cookies: [],
    origins: []
  }
};

/**
 * Mock article data for testing
 */
export const MOCK_ARTICLES: MediumArticle[] = [
  {
    title: 'Test Article 1',
    content: 'This is the content of test article 1. It contains multiple paragraphs.\n\nThis is the second paragraph with more detailed information about the topic.',
    url: 'https://medium.com/@testuser/test-article-1-abc123',
    publishDate: '2024-01-15',
    tags: ['testing', 'mock', 'jest'],
    claps: 42
  },
  {
    title: 'Another Test Article',
    content: 'Content of another test article for comprehensive testing.',
    url: 'https://medium.com/@testuser/another-test-article-def456',
    publishDate: '2024-01-20',
    tags: ['example'],
    claps: 15
  }
];

/**
 * Mock HTML content for article pages
 */
export const MOCK_HTML = {
  /**
   * Article page with modern selectors
   */
  modernArticle: `
    <html>
      <body>
        <article>
          <section>
            <p>First paragraph of the article.</p>
            <p>Second paragraph with more content.</p>
            <p>Third paragraph concluding the article.</p>
          </section>
        </article>
      </body>
    </html>
  `,

  /**
   * Article page with paywall indicator
   */
  paywallArticle: `
    <html>
      <body>
        <article>
          <p>Preview content only.</p>
        </article>
        <div>Sign up to continue reading this member-only story.</div>
      </body>
    </html>
  `,

  /**
   * Search results page
   */
  searchResults: `
    <html>
      <body>
        <article data-testid="story-preview">
          <h2>Search Result Article 1</h2>
          <a href="https://medium.com/article-1">Read more</a>
        </article>
        <article data-testid="story-preview">
          <h2>Search Result Article 2</h2>
          <a href="https://medium.com/article-2">Read more</a>
        </article>
      </body>
    </html>
  `
};

/**
 * Mock feed article data
 */
export const MOCK_FEED_ARTICLES = [
  {
    title: 'Understanding TypeScript Generics',
    excerpt: 'A comprehensive guide to using generics in TypeScript for type-safe, reusable code. Learn the fundamentals and advanced patterns.',
    url: 'https://medium.com/@dev/typescript-generics-abc123',
    author: 'Jane Developer',
    publishDate: '3 days ago',
    readTime: '8 min read',
    claps: 234,
    imageUrl: 'https://miro.medium.com/max/1400/1*example.jpg'
  },
  {
    title: 'Building Scalable APIs with Node.js',
    excerpt: 'Best practices for designing and implementing scalable REST APIs using Node.js and Express framework.',
    url: 'https://medium.com/@backend/scalable-apis-def456',
    author: 'John Backend',
    publishDate: 'Jan 15',
    readTime: '12 min read',
    claps: 1500
  }
];

/**
 * Mock reading list data
 */
export const MOCK_LISTS = [
  {
    id: 'tech-articles-xyz789',
    name: 'Tech Articles',
    description: 'My collection of technology and programming articles',
    articleCount: 42,
    url: 'https://medium.com/list/tech-articles-xyz789'
  },
  {
    id: 'design-inspiration-abc123',
    name: 'Design Inspiration',
    description: 'UI/UX design articles and case studies',
    articleCount: 28,
    url: 'https://medium.com/list/design-inspiration-abc123'
  }
];
