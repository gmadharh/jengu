"use client"

import { signIn, signOut, useSession } from "next-auth/react"

export function AuthButton() {
    // Retrieve the active session and authentication status
    const { data: session, status } = useSession()

    if (status === "loading") {
        return <div className="text-zinc-500 text-xs tracking-wide">Authenticating...</div>
    }

    if (session) {
        // Authenticated state: displays user avatar, name, and logout action
        return (
            <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-full shadow-sm">
                {session.user?.image && (
                    <img
                        src={session.user.image}
                        alt="Profile"
                        className="w-7 h-7 rounded-full border border-zinc-700"
                    />
                )}
                <div className="flex flex-col pr-1">
                    <span className="text-xs font-medium text-zinc-200">
                        {session.user?.name || "GitHub User"}
                    </span>
                    <button
                        onClick={() => signOut()}
                        className="text-[10px] text-zinc-500 hover:text-red-400 transition-colors text-left"
                    >
                        Sign out
                    </button>
                </div>
            </div>
        )
    }

    // Unauthenticated state: displays the GitHub login button
    return (
        <button
            onClick={() => signIn("github")}
            className="group bg-white hover:bg-zinc-200 text-black text-sm font-medium py-2 px-5 rounded-full transition-all shadow-sm flex items-center gap-2"
        >
            <svg
                height="16"
                aria-hidden="true"
                viewBox="0 0 16 16"
                version="1.1"
                width="16"
                data-view-component="true"
                fill="currentColor"
                className="opacity-90 group-hover:opacity-100 transition-opacity"
            >
                <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
            </svg>
            Continue with GitHub
        </button>
    )
}
