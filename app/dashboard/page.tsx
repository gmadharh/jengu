import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { AuthButton } from "@/components/AuthButton"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
    // Retrieve the active user session server-side for protected routing
    const session = await getServerSession(authOptions)

    // Redirect unauthenticated users back to the landing page
    if (!session) {
        redirect("/")
    }

    // Safely extract the first 10 characters of the token for visual validation
    const tokenPreview = session.accessToken
        ? `${session.accessToken.substring(0, 10)}...`
        : "No token found"

    return (
        <div className="min-h-screen bg-black text-zinc-200 p-8 font-sans">
            <div className="max-w-3xl mx-auto space-y-8">
                <header className="flex items-center justify-between pb-6 border-b border-zinc-800">
                    <h1 className="text-2xl font-light tracking-tight text-white">Dashboard</h1>
                    <AuthButton />
                </header>

                <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 shadow-md">
                    <h2 className="text-sm font-medium mb-4 text-zinc-400 uppercase tracking-widest">Authentication Status</h2>

                    <div className="font-mono text-sm">
                        <div className="px-4 py-3 bg-zinc-950 rounded-md flex flex-col gap-1 border border-zinc-800/50">
                            <span className="text-xs text-zinc-500">GitHub Access Token (Valid)</span>
                            <span className="text-zinc-300 font-medium break-all">
                                {tokenPreview}
                            </span>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}
