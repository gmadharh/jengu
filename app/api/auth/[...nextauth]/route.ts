import NextAuth, { NextAuthOptions } from "next-auth"
import GithubProvider from "next-auth/providers/github"

export const authOptions: NextAuthOptions = {
    providers: [
        GithubProvider({
            clientId: process.env.GITHUB_ID!,
            clientSecret: process.env.GITHUB_SECRET!,
            authorization: {
                params: {
                    // Requires repository access, user profile data, and organization read access
                    scope: "repo read:user read:org",
                },
            },
        }),
    ],
    callbacks: {
        async jwt({ token, account }) {
            // Store the OAuth access_token from the initial authentication event
            // into the JWT token for subsequent API requests
            if (account) {
                token.accessToken = account.access_token
            }
            return token
        },
        async session({ session, token }) {
            // Forward the access_token from the secure JWT to the client-facing Session object
            session.accessToken = token.accessToken as string | undefined
            return session
        },
    },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
