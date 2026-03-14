import React from "react";
import { GitBranch, GitPullRequest, CircleDot } from "lucide-react";

export type RepoData = {
    id: string;
    name: string;
    description: string;
    stars: number;
    language: string;
    openIssues: number;
    pullRequests?: number;
};

export function RepoTable({ data }: { data: RepoData[] }) {
    if (!data || data.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center p-8 bg-zinc-900/50 rounded-xl border border-zinc-800">
                <span className="text-zinc-500 text-sm">No data available to display.</span>
            </div>
        );
    }

    return (
        <div className="w-full bg-zinc-900/80 rounded-xl border border-zinc-800 overflow-hidden shadow-2xl backdrop-blur-md">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-zinc-300">
                    <thead className="text-xs uppercase bg-zinc-800/50 text-zinc-400 border-b border-zinc-700/50">
                        <tr>
                            <th scope="col" className="px-6 py-4 font-medium tracking-wider">Repository</th>
                            <th scope="col" className="px-6 py-4 font-medium tracking-wider">Details</th>
                            <th scope="col" className="px-6 py-4 font-medium tracking-wider text-right">Metrics</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                        {data.map((repo) => (
                            <tr key={repo.id} className="hover:bg-zinc-800/30 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-teal-400">{repo.name}</span>
                                        <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-500">
                                            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                                            {repo.language || "Unknown"}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 max-w-xs">
                                    <p className="truncate text-zinc-400" title={repo.description}>
                                        {repo.description || "No description provided."}
                                    </p>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-end gap-4 text-xs font-medium">
                                        <div className="flex items-center gap-1.5 text-yellow-500/90">
                                            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                                                <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
                                            </svg>
                                            {repo.stars}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-zinc-400">
                                            <CircleDot className="w-3.5 h-3.5 text-emerald-400" />
                                            {repo.openIssues}
                                        </div>
                                        {repo.pullRequests !== undefined && (
                                            <div className="flex items-center gap-1.5 text-zinc-400">
                                                <GitPullRequest className="w-3.5 h-3.5 text-purple-400" />
                                                {repo.pullRequests}
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
