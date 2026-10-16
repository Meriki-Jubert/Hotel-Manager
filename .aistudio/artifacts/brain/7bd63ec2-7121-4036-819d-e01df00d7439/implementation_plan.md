# Implementation Plan - 4K Luxury Hotel Photographic App Backgrounds

Replace all solid white/grey app backgrounds (`bg-slate-100`, `bg-white`) across the entire HMS dashboard with a stunning 4K crystal-clear hotel architectural photography background wallpaper combined with frosted glass (`backdrop-blur-xl bg-slate-950/85`) panels.

## Proposed Changes

### 1. Root Layout & App Background (`src/App.tsx`)
- Add a persistent fixed 4K luxury hotel architectural wallpaper (`https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=2500&auto=format&fit=crop&q=90`) covering the entire viewport (`fixed inset-0 z-0`).
- Add a dark elegant gradient scrim overlay (`bg-gradient-to-tr from-slate-950 via-slate-900/90 to-slate-950/95`).
- Ensure all dashboard cards, containers, tables, and modals use frosted glass (`bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 text-slate-100`) so they stand out crisply against the 4K photo backdrop.

### 2. Login Screen (`src/components/LoginPage.tsx`)
- Enhance the login screen background with a crystal-clear 4K luxury hotel lobby & exterior wallpaper (`https://images.unsplash.com/photo-1566073771259-6a8506099945?w=2500&auto=format&fit=crop&q=90`).

### 3. Navigation & Components Styling
- Update navbar, navigation tabs, room matrix, POS, housekeeping, guest CRM, and modals to use dark boutique frosted glass cards with champagne-gold highlights (`bg-slate-900/85 backdrop-blur-md border border-slate-700/60`).

## Verification Plan
- Compile applet with `compile_applet`.
- Run linter with `lint_applet`.
- Verify visual humanized boutique atmosphere across all modules.
