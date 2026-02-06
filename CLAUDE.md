# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Negocia Aí is a debt negotiation portal built with Next.js 14 (App Router), TypeScript, Tailwind CSS, and shadcn/ui.

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Architecture

### Directory Structure
- `src/app/` - Next.js App Router pages and layouts
- `src/components/` - React components
  - `ui/` - shadcn/ui components (auto-generated, avoid manual edits)
  - `header.tsx`, `footer.tsx` - Shared layout components
- `src/lib/` - Utility functions (includes shadcn's `cn` helper)

### Key Pages
- `/` - Landing page with hero, benefits, and CTA sections
- `/consulta` - CPF lookup page with validation and form handling

### Patterns
- All pages use shared `Header` and `Footer` components
- Client components marked with `"use client"` directive when using React hooks
- CPF validation uses the Brazilian CPF algorithm (mod 11)
- CPF input includes real-time formatting (000.000.000-00)

### Styling
- Primary color: Green (`hsl(142, 76%, 36%)`) - configured in `globals.css`
- Uses Tailwind CSS with shadcn/ui component library
- CSS variables defined in `:root` and `.dark` for theming

### Adding New shadcn/ui Components
```bash
npx shadcn@latest add <component-name>
```
