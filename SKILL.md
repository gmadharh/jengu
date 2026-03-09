# Dev A Technical Skill-Set: Auth & Vapi Bridge

---

## 1. NextAuth Session Persistence (The #1 Pitfall)

By default, NextAuth strips the OAuth access token for security. You **must** override the callbacks to keep it, otherwise Dev B cannot fetch private repos.

**File:** `app/api/auth/[...nextauth]/route.ts`

```typescript
callbacks: {
  async jwt({ token, account }) {
    // Persist the OAuth access_token to the token right after signin
    if (account) {
      token.accessToken = account.access_token;
    }
    return token;
  },
  async session({ session, token, user }) {
    // Send properties to the client
    session.accessToken = token.accessToken as string;
    return session;
  }
}
```

---

## 2. Vapi Initialization & Token Injection

When initializing the Vapi client component, do not hardcode anything. Use the `useSession` hook.

**File:** `components/VoiceAgent.tsx`

```typescript
import { useSession } from 'next-auth/react';
import Vapi from '@vapi-ai/web';

export default function VoiceAgent() {
  const { data: session } = useSession();

  const startCall = async () => {
    const vapi = new Vapi("YOUR_VAPI_PUBLIC_KEY");

    // Pass the token dynamically so Vapi can forward it to Dev B
    await vapi.start("YOUR_ASSISTANT_ID", {
      variableValues: {
        github_token: session?.accessToken
      }
    });
  }
}
```

---

## 3. UI State Management (The "Agentic UI")

Create a global state (or simple Context) for `ui_payload`. When Vapi sends data, catch it and render the right component.

```typescript
vapi.on('message', (message) => {
  if (message.type === 'tool-calls' || message.type === 'model-output') {
    // Safely extract the custom data Dev B sent back
    const payload = message.results?.[0]?.custom_data?.ui_payload;

    if (payload?.type === 'repo_list') {
      setDashboardView('repos');
      setChartData(payload.data);
    }
  }
});
```

---

## 4. The "Mega-Prompt" for your AI Assistant

Copy and paste this prompt into ChatGPT, Claude, or Cursor when you sit down to code. It gives the AI exact constraints so it writes correct code on the first try.

---

> I am working on a Next.js 14 App Router project using TypeScript and Tailwind CSS. I need you to build the complete Authentication layer for Phase 1.
>
> **Context:** This is for a voice-operated GitHub agent. We must securely capture and store the user's GitHub access token so our backend AI can act on their behalf.
>
> **Please generate the following 5 files with complete, production-ready code:**
>
> 1. `types/next-auth.d.ts` — Extend the default NextAuth `Session` and `JWT` interfaces to include `accessToken: string`.
> 2. `app/api/auth/[...nextauth]/route.ts` — Configure the GitHub Provider. Request `repo`, `read:user`, and `read:org` scopes. Implement the `jwt` and `session` callbacks to persist `account.access_token` so it is available to the client.
> 3. `components/Providers.tsx` — A standard NextAuth `SessionProvider` wrapper for the layout.
> 4. `components/AuthButton.tsx` — A sleek Tailwind button. If logged out, shows "Connect GitHub" and calls `signIn('github')`. If logged in, shows their GitHub avatar, username, and a "Sign Out" option.
> 5. `app/dashboard/page.tsx` — A protected server component. If no session exists, redirect to `/`. If a session exists, render a welcome message and display a masked version of `session.accessToken` to prove Phase 1 was successful.
>
> **Strict Constraints:**
> - Use standard NextAuth v4 imports for App Router (`next-auth/next`).
> - Do not use `any` types — strictly type all NextAuth callbacks.
> - Mark UI components with `'use client'` where appropriate.

---

## 5. GitHub OAuth App Setup

Before running the code, register a new OAuth Application on GitHub:

**GitHub → Settings → Developer Settings → OAuth Apps → New OAuth App**

You will need the `Client ID` and `Client Secret` to populate your `.env.local` file:

```env
GITHUB_ID=your_client_id_here
GITHUB_SECRET=your_client_secret_here
NEXTAUTH_SECRET=your_random_secret_here
NEXTAUTH_URL=http://localhost:3000
```