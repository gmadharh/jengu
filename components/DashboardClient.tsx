"use client";

import { useState } from "react";
import { VoiceAgent } from "@/components/VoiceAgent";
import { RepoTable, RepoData } from "@/components/RepoTable";
import { LanguageBarChart, ChartData } from "@/components/LanguageBarChart";

type UiPayload = {
    type: "table" | "chart" | null;
    data: any;
};

export function DashboardClient() {
    const [uiPayload, setUiPayload] = useState<UiPayload>({ type: null, data: null });

    const handleUiPayload = (type: string, data: any) => {
        console.log("Received UI Payload from Vapi:", type, data);
        if (type === "table" || type === "chart") {
            setUiPayload({ type, data });
        }
    };

    const runMockTableTest = () => {
        handleUiPayload("table", [
            { id: "1", name: "vercel/next.js", description: "The React Framework", stars: 125032, language: "TypeScript", openIssues: 2154, pullRequests: 184 },
            { id: "2", name: "facebook/react", description: "Library for UI", stars: 221584, language: "JavaScript", openIssues: 1450, pullRequests: 312 },
            { id: "3", name: "vuejs/core", description: "Vue.js is a progressive UI framework", stars: 45210, language: "TypeScript", openIssues: 320, pullRequests: 45 }
        ]);
    };

    const runMockChartTest = () => {
        handleUiPayload("chart", [
            { name: "TypeScript", value: 65, color: "#3178c6" },
            { name: "JavaScript", value: 20, color: "#f7df1e" },
            { name: "Python", value: 10, color: "#3776ab" },
            { name: "CSS", value: 5, color: "#1572B6" }
        ]);
    };

    return (
        <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 shadow-md grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Left Side: The Voice Assistant */}
            <div className="flex flex-col items-center justify-center p-8 bg-black/20 rounded-lg border border-zinc-800/50 border-dashed col-span-1 md:col-span-1 h-[400px] relative">
                <h2 className="text-sm font-medium mb-8 text-zinc-400 uppercase tracking-widest text-center">Voice Agent</h2>
                <VoiceAgent onUiPayload={handleUiPayload} />

                {/* TEMPORARY TEST BUTTONS */}
                <div className="absolute bottom-4 flex gap-2">
                    <button onClick={runMockTableTest} className="text-[10px] bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded text-zinc-300 transition-colors">Test Table</button>
                    <button onClick={runMockChartTest} className="text-[10px] bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded text-zinc-300 transition-colors">Test Chart</button>
                    <button onClick={() => setUiPayload({ type: null, data: null })} className="text-[10px] bg-red-900/30 hover:bg-red-900/50 text-red-400 px-2 py-1 rounded transition-colors">Reset</button>
                </div>
            </div>

            {/* Right Side: The Dynamic UI Window */}
            <div className="flex flex-col items-center justify-center bg-black/40 rounded-lg border border-zinc-800/50 col-span-1 md:col-span-2 relative overflow-hidden h-[400px] p-4">
                {uiPayload.type === null && (
                    <div className="text-center space-y-3">
                        <div className="w-16 h-16 mx-auto rounded-full bg-zinc-800/50 flex items-center justify-center animate-pulse">
                            <span className="text-zinc-500">?</span>
                        </div>
                        <p className="text-sm text-zinc-500">Ask the agent to load some data...</p>
                    </div>
                )}

                {uiPayload.type === "table" && (
                    <div className="w-full h-full overflow-y-auto custom-scrollbar">
                        <RepoTable data={uiPayload.data as RepoData[]} />
                    </div>
                )}

                {uiPayload.type === "chart" && (
                     <div className="w-full h-full p-2">
                         <LanguageBarChart data={uiPayload.data as ChartData[]} />
                     </div>
                )}
            </div>
            
        </section>
    );
}
