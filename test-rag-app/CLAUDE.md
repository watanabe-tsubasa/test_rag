# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development
pnpm dev              # Start dev server on http://localhost:3000
pnpm build            # Production build
pnpm start            # Start production server

# Code Quality
pnpm lint             # Run ESLint

# Database (Drizzle ORM)
pnpm drizzle-kit generate  # Generate migrations
pnpm drizzle-kit migrate   # Run migrations
```

**Environment Setup:** Requires `OPENAI_API_KEY` in `.env` file for OpenAI API integration.

## Architecture Overview

This is a Next.js 16.1.6 application (React 19.2.3, TypeScript 5) using the **Server Actions pattern** for secure API integration. The architecture follows a three-tier flow:

**Client Component → Server Action → External API**

1. **Client Components** ([app/TestComponent.tsx](app/TestComponent.tsx))
   - Use `"use client"` directive
   - Manage UI state with React hooks
   - Call server actions as async functions

2. **Server Actions** ([lib/actions.ts](lib/actions.ts))
   - Use `"use server"` directive
   - Handle external API calls securely
   - Keep API keys server-side only

3. **External API Clients** ([lib/openaiClient.ts](lib/openaiClient.ts))
   - Initialize SDK clients (OpenAI)
   - Load API keys from environment variables
   - Never imported by client components

**Critical Security Pattern:** The OpenAI API key never reaches the browser because the OpenAI client only exists in server-side code. Client components call server actions, which then call the OpenAI API.

## Component System

This project uses **Shadcn/ui** components built on Radix UI primitives. Understanding the component patterns requires reading multiple files:

### CVA (Class Variance Authority)
All UI components use CVA for type-safe variant management. See [components/ui/button.tsx](components/ui/button.tsx) as the template pattern:

```typescript
const buttonVariants = cva(
  "base-classes",
  {
    variants: {
      variant: { default: "...", destructive: "...", outline: "..." },
      size: { default: "...", sm: "...", lg: "..." }
    },
    defaultVariants: { variant: "default", size: "default" }
  }
)
```

### data-slot Attributes
Components use `data-slot` attributes for semantic styling hooks:
```tsx
<Comp data-slot="button" data-variant={variant} data-size={size} />
```

### cn() Utility
The `cn()` function in [lib/utils.ts](lib/utils.ts) combines `clsx` + `tailwind-merge` for proper Tailwind class precedence. Always use it when merging className props:

```typescript
className={cn(buttonVariants({ variant, size, className }))}
```

### Component Composition
Components follow a composable pattern (e.g., Card with CardHeader, CardTitle, CardContent). Import sub-components individually and compose them in your UI.

## Styling System

### Tailwind CSS v4
- Uses `@tailwindcss/postcss` plugin
- Configured in [app/globals.css](app/globals.css)
- Custom dark mode variant: `@custom-variant dark (&:is(.dark *))`

### OKLCH Color Space
Theme colors use the OKLCH color space for better perceptual uniformity:

```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  /* ... */
}
```

Components reference these via Tailwind utilities: `bg-primary`, `text-muted-foreground`, `border-border`, etc.

### CSS Variables
All theme values are defined as CSS variables in `:root` and `.dark` selectors. Tailwind v4 maps these through the `@theme inline` directive. To modify colors, edit the CSS variables in [app/globals.css](app/globals.css).

### Dark Mode
Add the `.dark` class to a parent element to enable dark mode. The custom variant ensures proper cascade.

## Adding New Features

### New UI Components
1. Copy pattern from existing components in `components/ui/`
2. Use CVA for variants (variant, size, orientation, etc.)
3. Add `data-slot` attribute for component identification
4. Export both the component and `*Variants` for reuse
5. Merge className props last: `className={cn(variants({ ... }), className)}`

Example structure:
```tsx
const myVariants = cva("base", { variants: {...}, defaultVariants: {...} })

function MyComponent({ variant, className, ...props }) {
  return <div data-slot="my-component" className={cn(myVariants({ variant }), className)} {...props} />
}

export { MyComponent, myVariants }
```

### New API Integrations
1. Create server action in `lib/actions.ts` with `"use server"` directive
2. Import API client (e.g., `openaiClient`) or create new one
3. **Never expose API keys to client code**
4. Client components import and call the server action as an async function

Example:
```typescript
// lib/actions.ts
"use server"
export async function myAction(input: string) {
  const result = await apiClient.method(input)
  return result
}

// Client component
import { myAction } from "@/lib/actions"
const result = await myAction(input)
```

### New Pages
Create `.tsx` files in `app/` directory following Next.js App Router conventions. Use `layout.tsx` for shared layouts.

## Project Structure

- **app/** - Next.js App Router pages, layouts, and route components
- **components/ui/** - Shadcn component library (button, card, field, input, label, separator)
- **lib/** - Server utilities (`actions.ts`, `openaiClient.ts`) and helpers (`utils.ts`)
- **public/** - Static assets
- Path alias `@/` maps to project root for clean imports

## Key Conventions

- **TypeScript strict mode** enabled - all code must be type-safe
- **pnpm** for package management (not npm/yarn)
- **Functional components** with React hooks
- **Server Actions** for all external API calls (never call APIs directly from client)
- **className props merged last** to allow consumer overrides
- **Field + Input** combination for form inputs (better accessibility than Input alone)

## Important Notes

- OpenAI API usage in [lib/actions.ts](lib/actions.ts) uses `responses.create()` endpoint - verify the model name and input format match your OpenAI API version
- Drizzle ORM configured but database integration not yet active in the codebase
- ESLint uses Next.js config with flat config format (ESLint 9+)
- The working directory for the app is `test-rag-app/` (not the repository root)
