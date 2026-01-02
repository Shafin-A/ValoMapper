# Testing Guide for ValoMapper

## Setup

The project uses Jest and React Testing Library for testing. Canvas interactions are mocked to avoid complex rendering tests.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## What's Mocked

### Konva (Canvas Library)
All react-konva components are mocked in `jest.setup.ts`:
- Stage, Layer, Image, Rect, Circle, Line, Text, Group, Transformer

### Other Mocks
- `use-image` hook (for loading images)
- Next.js router (`next/navigation`)
- Firebase auth and app
- `window.matchMedia` (for responsive hooks)
- `Request` and `Response` (web APIs for Node.js test environment)

## Testing Strategy

### ✅ DO Test
- **Business Logic**: State management, data transformations
- **Hooks**: Custom hooks in isolation
- **Utility Functions**: Helper functions in `lib/utils.ts`
- **Event Handlers**: Click handlers, form submissions
- **Conditional Rendering**: Show/hide logic, loading states
- **API Integration**: Mock API calls and test responses

### ❌ DON'T Test
- **UI Components**: shadcn/ui components (already well-tested)
- **Exact pixel positions**: Canvas positioning
- **Konva internals**: Library rendering logic
- **Visual appearance**: Leave for E2E/visual regression tests
- **Complex canvas interactions**: Use E2E tests instead

## Example Tests

### Testing a Hook
```typescript
import { renderHook, act } from '@testing-library/react'
import { useSidebarState } from '@/hooks/use-sidebar-state'

test('should toggle sidebar state', () => {
  const { result } = renderHook(() => useSidebarState())
  
  act(() => {
    result.current.setLeftSidebarOpen(false)
  })
  
  expect(result.current.leftSidebarOpen).toBe(false)
})
```

### Testing Utility Functions
```typescript
import { cn, mToPixels, isAgent } from '@/lib/utils'
import { PIXELS_PER_METER } from '@/lib/consts'

test('should merge class names', () => {
  expect(cn('class1', 'class2')).toBe('class1 class2')
})

test('should convert meters to pixels', () => {
  expect(mToPixels(1)).toBe(PIXELS_PER_METER)
})

test('should validate agent objects', () => {
  expect(isAgent({ name: 'Jett', role: 'Duelist' })).toBe(true)
  expect(isAgent({})).toBe(false)
})
```

### Testing with Timers (debounce, etc)
```typescript
import { debounce } from '@/lib/utils'

test('should debounce function calls', () => {
  jest.useFakeTimers()
  
  const func = jest.fn()
  const debouncedFunc = debounce(func, 100)
  
  debouncedFunc()
  debouncedFunc()
  debouncedFunc()
  
  jest.advanceTimersByTime(100)
  
  expect(func).toHaveBeenCalledTimes(1)
})
```

### Testing API Routes
```typescript
import { POST } from '@/app/api/lobbies/route'

describe('POST /api/lobbies', () => {
  const originalFetch = global.fetch
  let mockFetch: jest.Mock

  beforeEach(() => {
    mockFetch = jest.fn()
    global.fetch = mockFetch
    jest.useFakeTimers()
  })

  afterEach(() => {
    global.fetch = originalFetch
    jest.useRealTimers()
  })

  it('should create lobby successfully', async () => {
    const mockResponse = { lobbyCode: 'ABC123' }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const responsePromise = POST()
    jest.runAllTimers()

    const response = await responsePromise
    const data = await response.json()

    expect(mockFetch).toHaveBeenCalledWith(
      `${process.env.API_URL}/lobbies`,
      expect.objectContaining({
        method: 'POST',
        signal: expect.any(AbortSignal), // Tests timeout handling
      })
    )
    expect(data).toEqual(mockResponse)
  })

  it('should timeout after 30 seconds', async () => {
    const abortError = new Error('Aborted')
    abortError.name = 'AbortError'

    mockFetch.mockRejectedValueOnce(abortError)

    const responsePromise = POST()
    jest.advanceTimersByTime(30000)

    const response = await responsePromise
    const data = await response.json()

    expect(response.status).toBe(504)
    expect(data).toEqual({ error: 'Request timed out. Please try again.' })
  })
})
```

## File Structure
```
src/
  __tests__/
    api/             # API route tests (lobbies, users, strategies, folders)
    hooks/           # Hook tests (use-sidebar-state, use-mobile, etc.)
    components/      # Component tests (exclude ui/ components)
    utils/           # Utility function tests (helpers.test.ts)
    integration/     # Integration tests
```

## Tips

1. **Keep tests focused**: One concept per test
2. **Use descriptive names**: `it('should add agent to canvas when clicked')`
3. **Mock external dependencies**: API calls, Firebase, etc.
4. **Test user behavior**: Click buttons, type input, not implemen
6. **Use fake timers for async operations**: Test timeouts without waiting (see API route examples)
7. **Test authorization & validation**: Verify 401/400 errors in API routes
8. **Test timeout handling**: Critical for fly.io cold starts (30-second timeouts)tation details
5. **Avoid snapshot tests**: For a canvas app, they're too brittle

## Coverage Goals

- Aim for 70%+ coverage on business logic
- 100% coverage on utility functions
- Don't worry about 100% overall - focus on critical paths
