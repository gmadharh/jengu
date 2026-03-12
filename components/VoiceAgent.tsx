"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import Vapi from "@vapi-ai/web";

const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || "");

export function VoiceAgent() {
    const { data: session } = useSession();
    const [isCallActive, setIsCallActive] = useState(false);
    const [hasError, setHasError] = useState(false);
    const vapiRegisteredRef = useRef(false);

    // Register event listeners exactly once
    useEffect(() => {
        if (vapiRegisteredRef.current) return;

        vapi.on("call-start", () => {
            setIsCallActive(true);
            setHasError(false);
        });

        vapi.on("call-end", () => {
            setIsCallActive(false);
        });

        vapi.on("error", (e: any) => {
            // Unpack the exact Vapi error object for easier debugging
            const errorMessage = e?.error?.message || e?.message || JSON.stringify(e);
            console.error("Vapi Error:", errorMessage, e);
            setIsCallActive(false);
            setHasError(true);
        });

        vapiRegisteredRef.current = true;
    }, []);

    const toggleCall = async () => {
        if (isCallActive) {
            vapi.stop();
        } else {
            if (!session?.accessToken) {
                console.error("No access token available for Vapi.");
                return;
            }

            try {
                // Safely extract the assistant ID
                const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
                if (!assistantId) {
                    throw new Error("Missing NEXT_PUBLIC_VAPI_ASSISTANT_ID environment variable");
                }

                // Push the header into the AssistantOverrides.
                // Vapi forwards this exact token to your LangGraph API as a standard Bearer token.
                await vapi.start(assistantId, {
                    server: {
                        headers: {
                            Authorization: `Bearer ${session.accessToken}`,
                        },
                    },
                });
            } catch (err: any) {
                console.error("Failed to start Vapi call", err);
                setHasError(true);
            }
        }
    };

    return (
        <div className="flex flex-col items-center">
            <button
                onClick={toggleCall}
                disabled={!session?.accessToken}
                className={`relative group flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300 shadow-xl border 
                ${
                    !session?.accessToken
                        ? "bg-zinc-800 border-zinc-700 cursor-not-allowed opacity-50"
                        : isCallActive
                        ? "bg-red-500/20 border-red-500/50 hover:bg-red-500/30"
                        : "bg-teal-500/10 border-teal-500/30 hover:bg-teal-500/20 hover:border-teal-500/50"
                }`}
            >
                {/* Ping animation when active */}
                {isCallActive && (
                    <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping"></div>
                )}
                
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={isCallActive ? "#ef4444" : "#14b8a6"}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`transition-all duration-300 ${isCallActive ? "scale-110" : "group-hover:scale-110"}`}
                >
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
            </button>

            <span className="mt-3 text-[10px] uppercase tracking-widest font-medium text-zinc-500">
                {!session?.accessToken
                    ? "Requires Auth"
                    : isCallActive
                    ? "Listening..."
                    : "Tap to Speak"}
            </span>

            {hasError && (
                <span className="mt-2 text-xs text-red-400">
                    Connection failed. Check console.
                </span>
            )}
        </div>
    );
}
