// test_ui.js
// Run this script to test the Agentic UI without needing an active WebRTC call.
// This simulates the exact JSON payload Vapi sends when Dev B's LangGraph model triggers the "render_ui" tool.

console.log("To easily test the UI locally without speaking into the mic:");
console.log("We can temporarily add a 'Test' button to the dashboard that injects this exact payload into state.");
console.log("Alternatively, here is the exact payload structure you can copy/paste if Dev B asks how the UI expects the data:");

const mockPayloads = {
    // 1. Simulating a request for open Pull Requests
    tablePayload: {
        type: "table",
        data: [
            {
                id: "1",
                name: "vercel/next.js",
                description: "The React Framework for the Web.",
                stars: 125032,
                language: "TypeScript",
                openIssues: 2154,
                pullRequests: 184
            },
            {
                id: "2",
                name: "facebook/react",
                description: "The library for web and native user interfaces.",
                stars: 221584,
                language: "JavaScript",
                openIssues: 1450,
                pullRequests: 312
            }
        ]
    },
    
    // 2. Simulating a request for Language distributions
    chartPayload: {
        type: "chart",
        data: [
            { name: "TypeScript", value: 65, color: "#3178c6" },
            { name: "JavaScript", value: 20, color: "#f7df1e" },
            { name: "Python", value: 10, color: "#3776ab" },
            { name: "CSS", value: 5, color: "#1572B6" }
        ]
    }
};

console.log("\n--- EXPECTED RENDER_UI TOOL CALL ARGUMENTS ---");
console.log(JSON.stringify(mockPayloads.tablePayload, null, 2));

console.log("\nIf you want to test it visually right now, I can add a temporary 'Mock Test' button to the Dashboard that manually calls `handleUiPayload('table', mockData)`. Let me know if you want me to add that button!");
