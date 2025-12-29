# TypeScript Best Practices

**Convention Type**: Reusable across projects
**Last Updated**: 2025-12-29

## Overview

Use TypeScript's type system to catch bugs at compile time, improve IDE support, and make code more maintainable. Avoid the `any` type except in legitimate cases where dynamic typing is truly necessary.

## Type Safety Philosophy

### Goals

1. **Compile-time safety**: Catch type errors before runtime
2. **Self-documenting code**: Types serve as inline documentation
3. **Better IDE support**: Autocomplete, refactoring, navigation
4. **Easier refactoring**: Type system guides you through changes
5. **Reduced runtime errors**: Many bugs caught during development

### The `any` Type Problem

```typescript
// ❌ Bad: Type safety lost
const data: any = fetchData();
data.foo.bar.baz(); // No compile-time checking - runtime error waiting to happen

// ✅ Good: Type safety maintained
interface FetchResult {
  foo: { bar: { baz: () => void } };
}
const data: FetchResult = fetchData();
data.foo.bar.baz(); // Compile-time verification
```

## Eliminating `any` Types

### Common Patterns and Solutions

#### 1. Catch Block Error Handling

**Problem**: TypeScript doesn't know what type errors are

```typescript
// ❌ Bad: Using any
catch (error: any) {
  console.error(error.message); // Unsafe!
}
```

**Solution**: Type guard or safe access

```typescript
// ✅ Good: Type guard pattern
catch (error) {
  const message = error instanceof Error
    ? error.message
    : String(error);
  console.error(message);
}

// ✅ Alternative: Unknown type with guard
catch (error: unknown) {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

#### 2. Browser Context Arrays

**Problem**: Arrays in page.evaluate() lose typing

```typescript
// ❌ Bad: any[] loses type information
const articles: any[] = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('article')).map(el => ({
    title: el.querySelector('h1')?.textContent,
    url: el.querySelector('a')?.href
  }));
});
```

**Solution**: Inline type definition

```typescript
// ✅ Good: Inline type matches return structure
const articles = await page.evaluate(() => {
  const results: Array<{
    title: string | null;
    url: string | undefined;
  }> = [];

  document.querySelectorAll('article').forEach(el => {
    results.push({
      title: el.querySelector('h1')?.textContent ?? null,
      url: el.querySelector('a')?.href
    });
  });

  return results;
});
```

#### 3. Configuration Objects

**Problem**: Generic object types lose type safety

```typescript
// ❌ Bad: any loses all type checking
const browserOptions: any = {
  headless: true,
  viewport: { width: 1280, height: 720 }
};
```

**Solution**: Use proper interface/type from library

```typescript
// ✅ Good: Import type from library
import { BrowserContextOptions } from '@playwright/test';

const browserOptions: BrowserContextOptions = {
  headless: true,
  viewport: { width: 1280, height: 720 }
};
// Now you get autocomplete and compile-time validation!
```

#### 4. External Library Types

**Problem**: Library doesn't export types or has complex generics

```typescript
// ❌ Bad: Giving up on typing
const result: any = await complexLibraryMethod();
```

**Solution**: Define minimal interface for what you need

```typescript
// ✅ Good: Define interface for your needs
interface LibraryResult {
  data: unknown;
  status: number;
  headers: Record<string, string>;
}

const result = await complexLibraryMethod() as LibraryResult;
// Or better: contribute types to DefinitelyTyped!
```

#### 5. JSON Parsing

**Problem**: JSON.parse() returns any

```typescript
// ❌ Bad: Loses type safety after parsing
const data: any = JSON.parse(jsonString);
```

**Solution**: Parse then validate/cast

```typescript
// ✅ Good: Validate structure after parsing
interface ExpectedShape {
  cookies: Array<{ name: string; value: string }>;
  origins: Array<{ origin: string }>;
}

function parseSessionData(jsonString: string): ExpectedShape {
  const data = JSON.parse(jsonString);

  // Runtime validation
  if (!data.cookies || !Array.isArray(data.cookies)) {
    throw new Error('Invalid session data: missing cookies array');
  }

  return data as ExpectedShape;
}
```

#### 6. Dynamic Property Access

**Problem**: Bracket notation with dynamic keys

```typescript
// ❌ Bad: obj[key] when key is dynamic
function getValue(obj: any, key: string): any {
  return obj[key];
}
```

**Solution**: Use generics with constraints

```typescript
// ✅ Good: Generic with keyof constraint
function getValue<T extends object, K extends keyof T>(
  obj: T,
  key: K
): T[K] {
  return obj[key];
}

// Usage
const user = { name: 'Alice', age: 30 };
const name = getValue(user, 'name'); // Type: string
const age = getValue(user, 'age');   // Type: number
```

## When `any` Is Acceptable

### Legitimate Use Cases

1. **Gradual migration**: Migrating JavaScript to TypeScript
   ```typescript
   // Temporary during migration
   const legacyData: any = getLegacyData();
   // TODO: Add proper types
   ```

2. **True dynamic typing**: Genuinely unknown structure
   ```typescript
   // JSON from external source with unknown schema
   function logUnknownData(data: any): void {
     console.log(JSON.stringify(data));
   }
   ```

3. **Type assertion workaround**: Library types are wrong
   ```typescript
   // Library has incorrect types, fix in DefinitelyTyped later
   const result = (library.method() as any) as CorrectType;
   ```

4. **Generic pass-through**: Function doesn't care about type
   ```typescript
   // Better to use unknown or generics, but any acceptable for pure pass-through
   function wrapInArray(value: any): any[] {
     return [value];
   }

   // Better alternative:
   function wrapInArray<T>(value: T): T[] {
     return [value];
   }
   ```

## Type System Best Practices

### 1. Prefer Interfaces for Object Shapes

```typescript
// ✅ Good: Interface for objects
interface User {
  id: string;
  name: string;
  email: string;
}

// ✅ Also good: Type alias for unions
type Status = 'pending' | 'approved' | 'rejected';
```

### 2. Use Union Types Instead of Enums (Often)

```typescript
// ❌ Verbose: Enum
enum Color {
  Red = 'red',
  Green = 'green',
  Blue = 'blue'
}

// ✅ Simpler: Union type
type Color = 'red' | 'green' | 'blue';

// ✅ When enums are good: Numeric or exported values
export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4
}
```

### 3. Use Const Assertions for Constants

```typescript
// ❌ Bad: Mutable, loses specific types
const STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved'
};
// Type: { PENDING: string, APPROVED: string }

// ✅ Good: Immutable, preserves literal types
const STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved'
} as const;
// Type: { readonly PENDING: 'pending', readonly APPROVED: 'approved' }
```

### 4. Leverage Type Guards

```typescript
// Type guard for runtime checking
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj
  );
}

// Usage
function processData(data: unknown) {
  if (isUser(data)) {
    // TypeScript knows data is User here
    console.log(data.name);
  }
}
```

### 5. Use Utility Types

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
}

// Partial: All properties optional
type UpdateUser = Partial<User>;

// Pick: Select specific properties
type UserPublic = Pick<User, 'id' | 'name' | 'email'>;

// Omit: Exclude specific properties
type UserWithoutPassword = Omit<User, 'password'>;

// Record: Create object type
type UserCache = Record<string, User>;

// ReturnType: Extract return type
type Result = ReturnType<typeof fetchUser>;
```

### 6. Generic Constraints

```typescript
// ❌ Too loose: T could be anything
function getProperty<T>(obj: T, key: string) {
  return obj[key]; // Error: Element implicitly has 'any' type
}

// ✅ Constrained: T must be object, key must be keyof T
function getProperty<T extends object, K extends keyof T>(
  obj: T,
  key: K
): T[K] {
  return obj[key];
}
```

## Strict Mode Configuration

### Recommended tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020", "DOM"],

    // Strict type checking
    "strict": true,                           // Enable all strict options
    "noImplicitAny": true,                   // Error on implied any
    "strictNullChecks": true,                // Distinguish null/undefined
    "strictFunctionTypes": true,             // Stricter function types
    "strictBindCallApply": true,             // Check bind/call/apply
    "strictPropertyInitialization": true,    // Properties must be initialized
    "noImplicitThis": true,                  // Error on implied 'this' any
    "alwaysStrict": true,                    // Use 'use strict'

    // Additional checks
    "noUnusedLocals": true,                  // Error on unused variables
    "noUnusedParameters": true,              // Error on unused parameters
    "noImplicitReturns": true,               // All code paths must return
    "noFallthroughCasesInSwitch": true,      // Switch must have breaks
    "noUncheckedIndexedAccess": true,        // Index access returns T | undefined

    // Module resolution
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,

    // Output
    "outDir": "./dist",
    "rootDir": "./src",
    "sourceMap": true,
    "declaration": true
  }
}
```

## Common Pitfalls

### 1. Type Assertions as Escape Hatch

```typescript
// ❌ Bad: Unsafe assertion
const user = data as User; // Might not actually be a User!

// ✅ Good: Validate then assert
if (isUser(data)) {
  const user = data; // TypeScript knows this is safe
}
```

### 2. Optional Chaining Without Null Checks

```typescript
// ⚠️  Careful: Returns undefined if any part is null
const name = user?.profile?.name?.toUpperCase();
// Type: string | undefined

// ✅ Better: Handle undefined explicitly
const name = user?.profile?.name?.toUpperCase() ?? 'Unknown';
// Type: string
```

### 3. Array Callbacks Losing Type

```typescript
// ❌ Bad: forEach with any
array.forEach((item: any) => console.log(item));

// ✅ Good: Inferred type from array
const array: number[] = [1, 2, 3];
array.forEach(item => console.log(item)); // item is number
```

## Migration Strategy

### Incremental Adoption

1. **Enable strict mode gradually**
   ```json
   // Start with
   "strict": false,
   "noImplicitAny": true  // Just this first

   // Then add more over time
   "strictNullChecks": true
   ```

2. **Fix one error type at a time**
   - Start with `noImplicitAny` errors
   - Then tackle `strictNullChecks`
   - Finally enable full `strict` mode

3. **Use @ts-expect-error for temporary issues**
   ```typescript
   // @ts-expect-error TODO: Fix type mismatch in library upgrade
   const result = legacyFunction();
   ```

4. **Track progress**
   ```bash
   # Count remaining any types
   git grep ': any' src/ | wc -l
   ```

## Related Conventions

- See [LOGGING.md](./LOGGING.md) for typed logger usage
- See [TESTING.md](./TESTING.md) for type safety in tests

## Version History

- **2025-12-29**: Initial convention document
- Extracted from Medium MCP Server project
- Generalized for reuse across projects
