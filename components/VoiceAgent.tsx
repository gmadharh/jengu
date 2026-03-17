"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import Vapi from "@vapi-ai/web";

const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || "");

export type VoiceAgentProps = {
    onUiPayload?: (type: string, data: any) => void;
};

export function VoiceAgent({ onUiPayload }: VoiceAgentProps) {
    const { data: session } = useSession();
    const [isCallActive, setIsCallActive] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [volumeLevel, setVolumeLevel] = useState(0);
    const vapiRegisteredRef = useRef(false);

    // Register event listeners exactly once
    useEffect(() => {
        if (vapiRegisteredRef.current) return;

        vapi.on("call-start", () => {
            setIsCallActive(true);
            setHasError(false);
            setErrorMessage("");
        });

        vapi.on("call-end", () => {
            setIsCallActive(false);
            setVolumeLevel(0);
        });

        vapi.on("error", (e: any) => {
            // Unpack the exact Vapi error object for easier debugging
            const rawErrorMsg = e?.error?.message || e?.message || JSON.stringify(e);
            console.error("Vapi Error:", rawErrorMsg, e);
            
            setIsCallActive(false);
            setVolumeLevel(0);

            // Provide human-readable specific errors if possible
            if (rawErrorMsg.toLowerCase().includes("microphone") || rawErrorMsg.toLowerCase().includes("permission")) {
                setHasError(true);
                setErrorMessage("Microphone access denied. Please allow microphone permissions in your browser.");
            } else if (rawErrorMsg.toLowerCase().includes("not found")) {
                setHasError(true);
                setErrorMessage("Assistant not found. Check your VAPI configuration.");
            } else {
                // Keep the error in console, but do not show "Connection failed" in the UI 
                // since this often fires when manually stopping the call
                setHasError(false);
                setErrorMessage("");
            }
        });

        // Listen for volume changes to drive the animation
        vapi.on("volume-level", (volume) => {
            setVolumeLevel(volume);
        });

        // Intercept messages from the AI backend
        vapi.on("message", (message) => {
            // Strategy 1: Look for tool-calls (legacy/future path)
            if (message.type === "tool-calls") {
                const toolCall = message.toolWithToolCallList?.[0]?.toolCall;
                if (toolCall?.function?.name === "render_ui") {
                    try {
                        const args = typeof toolCall.function.arguments === "string" 
                            ? JSON.parse(toolCall.function.arguments) 
                            : toolCall.function.arguments;
                        
                        if (onUiPayload && args.type && args.data) {
                            onUiPayload(args.type, args.data);
                        }
                    } catch (err) {
                        console.error("Failed to parse render_ui arguments:", err);
                    }
                }
            } 
            // Strategy 2: Custom message fallback  
            else if (message.type === "custom-message") {
                if (onUiPayload && message.message?.ui_type && message.message?.ui_data) {
                    onUiPayload(message.message.ui_type, message.message.ui_data);
                }
            }
        });

        vapiRegisteredRef.current = true;
    }, [onUiPayload]);

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
                setErrorMessage("Failed to start voice agent. Please try again.");
            }
        }
    };

    // Calculate a dynamic scale based on volume (volume is typically 0 to 1)
    // We add a base scale so it's always slightly glowing when active, but pulses on speech.
    const dynamicScale = isCallActive ? 1 + (volumeLevel * 1.5) : 1;

    return (
        <div className="flex flex-col items-center">
            <div className="relative flex items-center justify-center w-32 h-32">
                {/* Dynamic Voice Waves */}
                {isCallActive && (
                    <>
                        <div 
                            className="absolute rounded-full bg-teal-500/20 transition-transform duration-75 ease-out"
                            style={{ 
                                width: '4rem', 
                                height: '4rem', 
                                transform: `scale(${dynamicScale})`,
                                opacity: Math.min(1, 0.4 + volumeLevel) 
                            }}
                        />
                        <div 
                            className="absolute rounded-full border border-teal-500/30 transition-transform duration-100 ease-out"
                            style={{ 
                                width: '4rem', 
                                height: '4rem', 
                                transform: `scale(${dynamicScale * 1.3})`,
                                opacity: Math.max(0, 0.5 - volumeLevel)
                            }}
                        />
                    </>
                )}

                <button
                    onClick={toggleCall}
                    disabled={!session?.accessToken}
                    className={`relative z-10 group flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300 shadow-xl border 
                    ${
                        !session?.accessToken
                            ? "bg-zinc-800 border-zinc-700 cursor-not-allowed opacity-50"
                            : isCallActive
                            ? "bg-teal-600/20 border-teal-500/50 hover:bg-teal-500/30"
                            : "bg-teal-500/10 border-teal-500/30 hover:bg-teal-500/20 hover:border-teal-500/50"
                    }`}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={isCallActive ? "#14b8a6" : "#14b8a6"}
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
            </div>

            <span className="mt-1 text-[10px] uppercase tracking-widest font-medium transition-colors duration-300">
                {!session?.accessToken
                    ? <span className="text-zinc-500">Requires Auth</span>
                    : !isCallActive
                    ? <span className="text-zinc-500">Tap to Speak</span>
                    : volumeLevel > 0.05
                    ? <span className="text-amber-500 animate-pulse">Listening...</span>
                    : <span className="text-teal-500">Live</span>}
            </span>

            {hasError && (
                <span className="mt-2 text-xs text-red-400 text-center px-4">
                    {errorMessage || "Connection failed. Check console."}
                </span>
            )}
        </div>
    );
}
