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
# Create Next.js app with TypeScript and Tailwind
npx create-next-app@latest MyApp --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd MyApp

# Start development server in background
npm run dev &
sleep 5

# Map Next.js port to OpenHands expected port for App BETA tab access
echo "Mapping Next.js port 3000 to OpenHands port 51555..."

# Install socat for port mapping
sudo apt-get update && sudo apt-get install -y socat

# Map Next.js port (3000) to OpenHands port (51555)
socat TCP-LISTEN:51555,fork TCP:localhost:3000 &

echo "SUCCESS: Next.js app is now accessible via OpenHands App BETA tab!"
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