"use client";

import { useState, useEffect, useRef } from "react";
import { VoiceAgent } from "@/components/VoiceAgent";
import { RepoTable, RepoData } from "@/components/RepoTable";
import { LanguageBarChart, ChartData } from "@/components/LanguageBarChart";

type UiPayload = {
    type: "table" | "chart" | null;
    data: any;
};

export function DashboardClient() {
    const [uiPayload, setUiPayload] = useState<UiPayload>({ type: null, data: null });
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const handleUiPayload = (type: string, data: any) => {
        console.log("Received UI Payload:", type, data);
        if (type === "table" || type === "chart") {
            setUiPayload({ type, data });
        }
    };

    // Poll /api/ui-data every 2 seconds to pick up backend-generated payloads
    useEffect(() => {
        pollingRef.current = setInterval(async () => {
            try {
                const res = await fetch("/api/ui-data");
                const payload = await res.json();
                if (payload && payload.type) {
                    console.log("Polled UI data:", payload.type);
                    handleUiPayload(payload.type, payload.data);
                }
            } catch {
                // silently ignore fetch errors
            }
        }, 5000);

        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, []);

    const clearView = () => {
        setUiPayload({ type: null, data: null });
    };

    return (
        <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 shadow-md grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Left Side: The Voice Assistant */}
            <div className="flex flex-col items-center justify-center p-8 bg-black/20 rounded-lg border border-zinc-800/50 border-dashed col-span-1 md:col-span-1 h-[400px] relative">
                <h2 className="text-sm font-medium mb-8 text-zinc-400 uppercase tracking-widest text-center">Voice Agent</h2>
                <VoiceAgent onUiPayload={handleUiPayload} />

                <div className="absolute top-4 right-4 focus:outline-none">
                    <button onClick={clearView} className="text-[10px] bg-zinc-800/80 hover:bg-zinc-700 px-2 py-1 rounded text-zinc-400 transition-colors border border-zinc-700/50">
                        Clear View
                    </button>
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
