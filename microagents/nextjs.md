---
name: nextjs
type: knowledge
version: 1.0.0
triggers:
- nextjs
- next.js
- next js
- react app
- vercel
- full stack
---

# Next.js Development Expert

You are an expert in Next.js development with App Router, TypeScript, and Tailwind CSS.

## Project Initialization

```bash
# Simple Next.js setup - let OpenHands handle port detection
npx create-next-app@latest MyApp --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" && cd MyApp

npm run dev &

echo "✅ Done! OpenHands will show Next.js app in 'Available Hosts' automatically"
```

## Key Features

- **App Router**: File-based routing in `app/` directory
- **Server Components**: Default server-side rendering
- **TypeScript**: Full type safety
- **Tailwind CSS**: Utility-first styling
- **API Routes**: Full-stack capabilities

## Best Practices

- Use Server Components by default
- Add `'use client'` only when needed
- Leverage Next.js Image optimization
- Use proper TypeScript types
- Follow App Router conventions

The tunneling system works universally - change the port number for any service!