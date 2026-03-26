# `@courselit/theme`

Theme primitives and a React provider for App Router style applications.

This package exists to provide the small subset of theme behavior CourseLit needs:

- pre-hydration theme bootstrapping
- client-side theme switching
- system theme support
- localStorage persistence
- a React context for `theme`, `resolvedTheme`, and `setTheme`

## Architecture

The package is intentionally split into two layers:

### 1. Server-safe core

`@courselit/theme`

Exports plain helpers from [`src/theme.ts`](./src/theme.ts):

- constants such as `THEME_STORAGE_KEY`, `DEFAULT_THEME`, `THEMES`
- theme type guards
- DOM helpers like `applyThemeToDocument`
- `getThemeBootstrapScript()` for pre-hydration theme application

This entrypoint is safe to import from server components because it does not create React context or use hooks.

### 2. Client React entry

`@courselit/theme/react`

Exports React-specific APIs from [`src/react.tsx`](./src/react.tsx):

- `ThemeProvider`
- `useTheme`
- `ThemeProviderProps`

This entrypoint is meant for client components only.

## How It Works

Theme handling happens in two phases:

### Before hydration

The server injects the inline script returned by `getThemeBootstrapScript()`.

That script:

- reads the saved theme from `localStorage`
- falls back to `system` or the configured default theme
- resolves system theme with `matchMedia("(prefers-color-scheme: dark)")`
- updates the document root (`class` or a `data-*` attribute)
- sets `color-scheme` when enabled

This avoids a flash of the wrong theme on first paint.

### After hydration

The React provider:

- keeps `theme`, `resolvedTheme`, and `systemTheme` in sync
- listens for system theme changes
- listens for `storage` events to sync between tabs
- persists theme updates to `localStorage`
- can temporarily disable transitions when switching themes

## How It Differs From `next-themes`

This package uses the same broad strategy as `next-themes`:

- system theme cannot be known on the server
- an inline script is needed before hydration
- the client updates the document root
- `suppressHydrationWarning` on `<html>` is still the expected integration pattern

The difference is not a fundamentally new SSR model. The difference is control and packaging:

- the root export is server-safe and separate from the React entry
- the API surface is intentionally smaller
- the code is tailored to CourseLit's actual usage
- the internals are easier to modify if Next.js or React behavior changes

## Features

- Light, dark, and system theme modes
- Pre-hydration theme bootstrap script
- Root attribute support via `class` or `data-*`
- Optional `color-scheme` updates
- Optional transition disabling during theme changes
- Cross-tab sync through the `storage` event
- Small React hook/provider surface

## API

### Root entry: `@courselit/theme`

#### Constants

- `THEME_STORAGE_KEY`
- `DEFAULT_THEME`
- `DARK_MEDIA_QUERY`
- `THEMES`

#### Types

- `ResolvedTheme`
- `ThemeMode`
- `ThemeAttribute`

#### Helpers

- `isResolvedTheme(theme)`
- `isThemeMode(theme)`
- `getSystemTheme()`
- `resolveTheme(theme, enableSystem)`
- `getStoredTheme(storageKey, defaultTheme)`
- `getDocumentTheme(attribute)`
- `applyThemeToDocument({ attribute, enableColorScheme, resolvedTheme })`
- `getThemeBootstrapScript(options?)`

### React entry: `@courselit/theme/react`

#### `ThemeProvider`

Props:

- `children`
- `attribute`
- `defaultTheme`
- `disableTransitionOnChange`
- `enableColorScheme`
- `enableSystem`
- `storageKey`

#### `useTheme()`

Returns:

- `theme`
- `resolvedTheme`
- `systemTheme`
- `themes`
- `setTheme(nextTheme)`

## Next.js App Router Usage

### 1. Inject the bootstrap script in the root layout

```tsx
import { getThemeBootstrapScript } from "@courselit/theme";

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html suppressHydrationWarning>
            <head>
                <script
                    suppressHydrationWarning
                    dangerouslySetInnerHTML={{
                        __html: getThemeBootstrapScript(),
                    }}
                />
            </head>
            <body>{children}</body>
        </html>
    );
}
```

### 2. Mount the provider inside `<body>`

```tsx
"use client";

import { ThemeProvider } from "@courselit/theme/react";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            {children}
        </ThemeProvider>
    );
}
```

### 3. Read and update theme in client components

```tsx
"use client";

import { useTheme } from "@courselit/theme/react";

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    return (
        <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            Toggle
        </button>
    );
}
```

## SSR Notes

- The system theme cannot be detected on the server.
- This package avoids a flash of the wrong theme by using an inline bootstrap script.
- `ThemeProvider` should stay inside `<body>`.
- `suppressHydrationWarning` on `<html>` is expected when the root theme attribute changes before React hydrates.

## Scope

This package is intentionally narrow. It does not currently include:

- cookie-based theme resolution
- server-side theme persistence
- framework-specific wrappers beyond the React provider and bootstrap helper

That keeps the implementation small and focused, while still being enough for CourseLit and similar App Router setups.
