# Test Execution Guide - MrBrooks Auth Service

## Overview
This document provides comprehensive instructions for running and maintaining the automated test suite for the MrBrooks Auth Service. The project uses Jest with React Testing Library for comprehensive testing coverage.

## Test Framework Setup

### Dependencies
The following testing dependencies are installed:
- **Jest**: JavaScript testing framework
- **@testing-library/react**: React component testing utilities
- **@testing-library/jest-dom**: Custom Jest matchers for DOM testing
- **@testing-library/user-event**: User interaction simulation
- **@types/jest**: TypeScript definitions for Jest
- **jest-environment-jsdom**: DOM environment for testing React components
- **msw**: Mock Service Worker for API mocking (if needed)

### Configuration Files
- **`jest.config.js`**: Main Jest configuration
- **`jest.setup.js`**: Test environment setup and global mocks
- **`tsconfig.json`**: TypeScript configuration (includes test files)

## Running Tests

### Basic Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test -- AuthContext.test.tsx

# Run tests matching a pattern
npm test -- --testNamePattern="should handle sign up"

# Run tests for specific directory
npm test -- src/components/auth
```

### Test Coverage Commands

```bash
# Generate coverage report
npm run test:coverage

# View coverage report in browser (after running coverage)
open coverage/lcov-report/index.html
```

### Advanced Test Options

```bash
# Run tests in CI mode (no watch, single run)
npm test -- --ci

# Run tests with verbose output
npm test -- --verbose

# Run only changed files (requires git)
npm test -- --onlyChanged

# Update snapshots (if using snapshot testing)
npm test -- --updateSnapshot

# Run tests in specific environment
npm test -- --env=jsdom

# Debug tests
npm test -- --detectOpenHandles --forceExit
```

## Test Structure

### Directory Organization
```
src/
├── components/
│   └── auth/
│       ├── __tests__/
│       │   └── AuthModal.test.tsx
│       └── AuthModal.tsx
├── contexts/
│   ├── __tests__/
│   │   └── AuthContext.test.tsx
│   └── AuthContext.tsx
├── lib/
│   ├── __tests__/
│   │   ├── auth-client.test.ts
│   │   └── supabase.test.ts
│   ├── auth-client.ts
│   └── supabase.ts
└── app/
    └── api/
        └── applications/
            ├── __tests__/
            │   └── route.test.ts
            └── route.ts
```

### Test File Naming Conventions
- **Component tests**: `ComponentName.test.tsx`
- **Utility tests**: `utilityName.test.ts`
- **API route tests**: `route.test.ts`
- **Integration tests**: `integration.test.ts`
- **E2E tests**: `e2e.test.ts`

## Test Categories

### 1. Unit Tests
Test individual components, functions, and utilities in isolation.

**Examples:**
- Component rendering and props
- Function logic and edge cases
- Utility function behavior
- Context providers and hooks

**Location**: `src/**/__tests__/*.test.{ts,tsx}`

### 2. Integration Tests
Test interactions between multiple components or modules.

**Examples:**
- API route handlers
- Component integration with contexts
- Database operations
- Authentication flows

**Location**: `src/**/__tests__/*.integration.test.{ts,tsx}`

### 3. End-to-End Tests
Test complete user workflows and application behavior.

**Examples:**
- User registration and login flows
- Admin application management
- Multi-step user interactions

**Location**: `__tests__/e2e/*.test.{ts,tsx}`

## Coverage Requirements

### Minimum Coverage Thresholds
The project enforces minimum coverage thresholds:
- **Statements**: 80%
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%

### Coverage Reports
Coverage reports are generated in multiple formats:
- **Text**: Console output during test runs
- **HTML**: `coverage/lcov-report/index.html`
- **LCOV**: `coverage/lcov.info`
- **JSON**: `coverage/coverage-final.json`

### Excluded Files
The following files are excluded from coverage:
- Type definition files (`*.d.ts`)
- Layout files (`layout.tsx`)
- Global CSS files (`globals.css`)
- Middleware (requires special testing setup)

## Test Writing Guidelines

### Component Testing Best Practices

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from '@/contexts/AuthContext'
import ComponentToTest from '../ComponentToTest'

describe('ComponentToTest', () => {
  const mockProps = {
    onSubmit: jest.fn(),
    initialValue: 'test'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render with correct initial state', () => {
    render(<ComponentToTest {...mockProps} />)
    
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeEnabled()
  })

  it('should handle user interactions', async () => {
    const user = userEvent.setup()
    render(<ComponentToTest {...mockProps} />)
    
    await user.click(screen.getByRole('button'))
    
    expect(mockProps.onSubmit).toHaveBeenCalledWith('expected-value')
  })

  it('should handle async operations', async () => {
    render(<ComponentToTest {...mockProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Loaded Content')).toBeInTheDocument()
    })
  })
})
```

### API Testing Best Practices

```typescript
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'

// Mock dependencies
jest.mock('@supabase/auth-helpers-nextjs')

describe('/api/endpoint', () => {
  let mockRequest: NextRequest

  beforeEach(() => {
    jest.clearAllMocks()
    mockRequest = {
      json: jest.fn().mockResolvedValue({ data: 'test' })
    } as any
  })

  it('should handle successful requests', async () => {
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ success: true })
  })

  it('should handle error cases', async () => {
    mockRequest.json = jest.fn().mockRejectedValue(new Error('Invalid JSON'))

    const response = await POST(mockRequest)
    
    expect(response.status).toBe(400)
  })
})
```

### Mock Guidelines

#### Mocking External Dependencies
```typescript
// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn()
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis()
    }))
  }
}))

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/',
    query: {}
  })
}))
```

#### Mocking Components
```typescript
// Mock child components
jest.mock('../ChildComponent', () => {
  return function MockChildComponent(props: any) {
    return <div data-testid="child-component" {...props} />
  }
})
```

## Debugging Tests

### Common Issues and Solutions

#### 1. Tests Timing Out
```bash
# Increase timeout for specific tests
jest.setTimeout(10000)

# Or in test file
describe('Slow tests', () => {
  jest.setTimeout(15000)
  
  it('should handle slow operation', async () => {
    // test implementation
  })
})
```

#### 2. Async Operations Not Completing
```typescript
// Use waitFor for async operations
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument()
}, { timeout: 5000 })

// Use act for state updates
await act(async () => {
  fireEvent.click(button)
})
```

#### 3. Mock Issues
```typescript
// Clear mocks between tests
beforeEach(() => {
  jest.clearAllMocks()
})

// Reset modules if needed
beforeEach(() => {
  jest.resetModules()
})
```

### Debug Mode
```bash
# Run tests with Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# Run specific test with debugging
npm test -- --testNamePattern="specific test" --verbose
```

## Continuous Integration

### GitHub Actions Configuration
```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v1
        with:
          file: ./coverage/lcov.info
```

### Pre-commit Hooks
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm test -- --passWithNoTests",
      "pre-push": "npm run test:coverage"
    }
  }
}
```

## Performance Optimization

### Test Performance Tips
1. **Use `screen` queries efficiently**: Prefer `getByRole` over `getByTestId`
2. **Mock heavy dependencies**: Mock API calls, external libraries
3. **Use `beforeEach` wisely**: Only reset what's necessary
4. **Parallel execution**: Jest runs tests in parallel by default
5. **Test isolation**: Ensure tests don't depend on each other

### Monitoring Test Performance
```bash
# Run tests with performance monitoring
npm test -- --verbose --detectSlowTests

# Profile test execution
npm test -- --logHeapUsage
```

## Maintenance

### Regular Maintenance Tasks

#### Weekly
- [ ] Review test coverage reports
- [ ] Update snapshots if UI changes
- [ ] Check for flaky tests

#### Monthly
- [ ] Update testing dependencies
- [ ] Review and refactor slow tests
- [ ] Analyze coverage trends

#### Quarterly
- [ ] Review testing strategy
- [ ] Update testing documentation
- [ ] Evaluate new testing tools

### Test Health Metrics
Monitor these metrics to maintain test quality:
- **Coverage percentage**: Should stay above 80%
- **Test execution time**: Should remain under 30 seconds for full suite
- **Flaky test rate**: Should be less than 1%
- **Test maintenance burden**: Time spent fixing tests vs. adding features

## Troubleshooting

### Common Error Messages

#### "Cannot find module"
```bash
# Check module path mapping in jest.config.js
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/src/$1'
}
```

#### "ReferenceError: fetch is not defined"
```javascript
// Add to jest.setup.js
global.fetch = jest.fn()
```

#### "TextEncoder is not defined"
```javascript
// Add to jest.setup.js
import { TextEncoder, TextDecoder } from 'util'
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder
```

### Getting Help
1. Check Jest documentation: https://jestjs.io/docs/getting-started
2. React Testing Library docs: https://testing-library.com/docs/react-testing-library/intro
3. Review existing test files for patterns
4. Check GitHub issues for similar problems

## Best Practices Summary

### Do's
- ✅ Write tests before or alongside code (TDD)
- ✅ Test user behavior, not implementation details
- ✅ Use descriptive test names
- ✅ Keep tests simple and focused
- ✅ Mock external dependencies
- ✅ Test error conditions
- ✅ Maintain high coverage

### Don'ts
- ❌ Test implementation details
- ❌ Write overly complex tests
- ❌ Ignore flaky tests
- ❌ Skip error case testing
- ❌ Forget to clean up mocks
- ❌ Test third-party library functionality
- ❌ Sacrifice test readability for brevity

## Conclusion

This testing framework provides comprehensive coverage for the MrBrooks Auth Service. Regular execution of tests ensures code quality, prevents regressions, and maintains system reliability. Follow the guidelines in this document to maintain and extend the test suite effectively.

For questions or improvements to this testing strategy, please refer to the project documentation or create an issue in the project repository.