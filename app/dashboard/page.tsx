import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { AuthButton } from "@/components/AuthButton"
import { redirect } from "next/navigation"
import { DashboardClient } from "@/components/DashboardClient"

export default async function DashboardPage() {
    // Retrieve the active user session server-side for protected routing
    const session = await getServerSession(authOptions)

    // Redirect unauthenticated users back to the landing page
    if (!session) {
        redirect("/")
    }

    return (
        <div className="min-h-screen bg-black text-zinc-200 p-8 font-sans">
            <div className="max-w-4xl mx-auto space-y-8">
                <header className="flex items-center justify-between pb-6 border-b border-zinc-800">
                    <h1 className="text-2xl font-light tracking-tight text-white">Dashboard</h1>
                    <AuthButton />
                </header>

                <main>
                    <DashboardClient />
                </main>
            </div>
        </div>
    )
}
