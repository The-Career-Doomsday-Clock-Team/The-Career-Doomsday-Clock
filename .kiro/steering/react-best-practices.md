# React Best Practices (Next.js)

## General Guidelines

- Use functional components with hooks exclusively
- Use TypeScript for all component and utility files
- Follow the single responsibility principle for components
- Keep components small and focused (under 200 lines)
- Use `next/image` for optimized image loading
- Use `next/font` for font optimization

## Project Structure

```
src/
  app/           # Next.js App Router pages
  components/    # Reusable UI components
    ui/          # Base UI primitives
    layout/      # Layout components
    features/    # Feature-specific components
  hooks/         # Custom React hooks
  lib/           # Utility functions and API clients
  types/         # TypeScript type definitions
  styles/        # Global styles and theme
```

## Component Patterns

- Use named exports for components
- Define prop types with TypeScript interfaces
- Use `React.FC` sparingly; prefer explicit return types
- Colocate component styles, tests, and types
- Use composition over inheritance

## State Management

- Use `useState` for local component state
- Use `useReducer` for complex state logic
- Use React Context for shared state across a subtree
- Avoid prop drilling beyond 2 levels; use Context or composition
- Keep server state separate from UI state

## Styling

- Use CSS Modules or Tailwind CSS for component styling
- Define design tokens (colors, spacing, fonts) in a central theme file
- Use CSS custom properties for dynamic theming
- Avoid inline styles except for truly dynamic values
- Use `clsx` or `classnames` for conditional class application

## Performance

- Use `React.memo` for expensive pure components
- Use `useMemo` and `useCallback` only when there is a measurable benefit
- Lazy load heavy components with `React.lazy` and `Suspense`
- Avoid unnecessary re-renders by keeping state close to where it's used
- Use Next.js `loading.tsx` for route-level loading states

## Accessibility

- Use semantic HTML elements (`button`, `nav`, `main`, `section`)
- Provide `aria-label` for interactive elements without visible text
- Ensure keyboard navigation works for all interactive elements
- Maintain color contrast ratios of at least 4.5:1 for text
- Test with screen readers periodically

## Error Handling

- Use Error Boundaries for graceful error recovery
- Display user-friendly error messages
- Log errors to a monitoring service
- Use Next.js `error.tsx` for route-level error handling

## API Integration

- Use `fetch` or a lightweight HTTP client for API calls
- Handle loading, error, and success states for every API call
- Use environment variables for API endpoints (`NEXT_PUBLIC_` prefix for client-side)
- Implement retry logic for transient failures

## Testing

- Write unit tests for utility functions and hooks
- Write component tests using React Testing Library
- Test user interactions, not implementation details
- Use `jest` as the test runner
- Aim for meaningful coverage, not 100% coverage
