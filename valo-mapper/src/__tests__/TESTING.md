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
```

## File Structure
```
src/
  __tests__/
    hooks/           # Hook tests (use-sidebar-state, use-mobile, etc.)
    components/      # Component tests (exclude ui/ components)
    utils/           # Utility function tests (helpers.test.ts)
    integration/     # Integration tests
```

## Tips

1. **Keep tests focused**: One concept per test
2. **Use descriptive names**: `it('should add agent to canvas when clicked')`
3. **Mock external dependencies**: API calls, Firebase, etc.
4. **Test user behavior**: Click buttons, type input, not implementation details
5. **Avoid snapshot tests**: For a canvas app, they're too brittle

## Coverage Goals

- Aim for 70%+ coverage on business logic
- 100% coverage on utility functions
- Don't worry about 100% overall - focus on critical paths
