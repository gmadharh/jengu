import { AIMessage, type BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages"
import { tool } from "@langchain/core/tools"
import { END, MessagesAnnotation, START, StateGraph } from "@langchain/langgraph"
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt"
import { ChatOpenAI } from "@langchain/openai"
import { Octokit } from "octokit"
import { setUiPayload } from "@/app/api/ui-data/route"

export const runtime = "nodejs"

const GITHUB_TOKEN_HEADER = "x-github-token"

function createLlm() {
  const apiKey = process.env.GRADIENT_MODEL_ACCESS_KEY

  if (!apiKey) {
    throw new HttpError(500, "Missing GRADIENT_MODEL_ACCESS_KEY on the server.")
  }

  return new ChatOpenAI({
    // The current @langchain/openai package expects `model` and `apiKey`
    // even when targeting an OpenAI-compatible provider such as DigitalOcean.
    model: "llama3.3-70b-instruct",
    apiKey,
    configuration: { baseURL: "https://inference.do-ai.run/v1" },
    temperature: 0,
  })
}

const AGENT_SYSTEM_PROMPT = [
  "You are Jengu, a friendly voice-first GitHub assistant.",
  "You can help users explore GitHub data using these tools:",
  "- fetch_open_prs: Show open pull requests for any repository (needs owner and repo name).",
  "- fetch_repo_languages: Show language breakdown for a repository (needs owner and repo name).",
  "- fetch_user_repos: List a user's recent repositories (needs a GitHub username).",
  "",
  "COMMON REPO NAMES (voice transcription may be unclear):",
  "- 'next.js' or 'nextjs' = owner: 'vercel', repo: 'next.js'",
  "- 'react' = owner: 'facebook', repo: 'react'",
  "- 'nestjs' or 'nest' = owner: 'nestjs', repo: 'nest'",
  "- 'vue' = owner: 'vuejs', repo: 'core'",
  "- 'angular' = owner: 'angular', repo: 'angular'",
  "- 'svelte' = owner: 'sveltejs', repo: 'svelte'",
  "- 'django' = owner: 'django', repo: 'django'",
  "- 'express' = owner: 'expressjs', repo: 'express'",
  "- 'linux' or 'kernel' = owner: 'torvalds', repo: 'linux'",
  "",
  "INSTRUCTIONS:",
  "- Keep responses SHORT (1-2 sentences max) since they will be spoken aloud.",
  "- If the user greets you or asks what you can do, briefly explain your capabilities.",
  "- If the user says a well-known project name, map it to the correct owner/repo from the list above.",
  "- If the user asks for 'my' repositories or 'my' PRs (e.g. 'show my repos'), ask them for their GitHub username first.",
  "- If the user's request is unclear, ask them to clarify (e.g., 'Which repository? Say the owner and repo, like facebook react').",
  "- After getting tool results, summarize data briefly.",
].join("\n")

type VapiMessage = {
  role?: string
  content?: unknown
  text?: unknown
  message?: unknown
}

type VapiPayload = {
  messages?: VapiMessage[]
  headers?: Record<string, unknown>
  message?: {
    headers?: Record<string, unknown>
    messages?: VapiMessage[]
  }
}

type VapiCompletionResponse = {
  id: string
  object: "chat.completion"
  created: number
  model: "vapi-custom"
  choices: Array<{
    index: number
    message: {
      role: "assistant"
      content: string
      tool_calls?: Array<{
        id: string
        type: "function"
        function: {
          name: string
          arguments: string
        }
      }>
    }
    finish_reason: "stop" | "tool_calls"
  }>
}

class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

function createFetchOpenPrsTool(githubToken: string) {
  const octokit = new Octokit({ auth: githubToken })

  return tool(
    async ({ owner, repo }: { owner: string; repo: string }) => {
      try {
        const { data } = await octokit.rest.pulls.list({
          owner,
          repo,
          state: "open",
          per_page: 10,
        })

        if (data.length === 0) {
          return `There are no open pull requests in ${owner}/${repo}.`
        }

        return [
          `Open pull requests in ${owner}/${repo}:`,
          ...data.map((pr) => `#${pr.number}: ${pr.title}`),
        ].join("\n")
      } catch (e: any) {
        return `Error: Could not fetch PRs for ${owner}/${repo}. The repository might not exist. Please check the owner and repo name.`
      }
    },
    {
      name: "fetch_open_prs",
      description:
        "Fetch open GitHub pull requests for a repository. Provide the owner and repo names separately.",
      schema: {
        type: "object",
        properties: {
          owner: {
            type: "string",
            description: "GitHub repository owner or organization name.",
          },
          repo: {
            type: "string",
            description: "GitHub repository name.",
          },
        },
        required: ["owner", "repo"],
        additionalProperties: false,
      } as const,
    },
  )
}

function createFetchRepoLanguagesTool(githubToken: string) {
  const octokit = new Octokit({ auth: githubToken })

  return tool(
    async ({ owner, repo }: { owner: string; repo: string }) => {
      try {
        const { data } = await octokit.rest.repos.listLanguages({
          owner,
          repo,
        })

        if (Object.keys(data).length === 0) {
          return `No languages found for ${owner}/${repo}.`
        }

        const mapped = Object.entries(data).map(([name, value]) => ({ name, value: value as number }));
        return JSON.stringify(mapped)
      } catch (e: any) {
        return `Error: Could not fetch languages for ${owner}/${repo}. The repository might not exist. Please check the owner and repo name.`
      }
    },
    {
      name: "fetch_repo_languages",
      description: "Fetch language statistics for a repository to display in a chart. Owner is the GitHub org, repo is the project name.",
      schema: {
        type: "object",
        properties: {
          owner: { type: "string", description: "GitHub org or user who owns the repo (e.g. 'vercel', 'facebook')." },
          repo: { type: "string", description: "Repository name (e.g. 'next.js', 'react')." },
        },
        required: ["owner", "repo"],
      } as const,
    },
  )
}

function createFetchUserReposTool(githubToken: string) {
  const octokit = new Octokit({ auth: githubToken })

  return tool(
    async ({ username }: { username: string }) => {
      try {
        const { data } = await octokit.rest.repos.listForUser({
          username,
          sort: "updated",
          per_page: 5,
        })
        
        const mapped = data.map(repo => ({
          id: repo.id.toString(),
          name: repo.full_name,
          description: repo.description,
          stars: repo.stargazers_count,
          language: repo.language,
          openIssues: repo.open_issues_count
        }));

        return JSON.stringify(mapped)
      } catch (e: any) {
        return `Error: Could not fetch repos for user '${username}'. The username might not exist.`
      }
    },
    {
      name: "fetch_user_repos",
      description: "Fetch a list of repositories for a GitHub user. Good for tables.",
      schema: {
        type: "object",
        properties: {
          username: { type: "string" },
        },
        required: ["username"],
      } as const,
    },
  )
}

function createGitHubPrAgent(githubToken: string) {
  const llm = createLlm()
  const tools = [
    createFetchOpenPrsTool(githubToken),
    createFetchRepoLanguagesTool(githubToken),
    createFetchUserReposTool(githubToken)
  ]

  const llmWithTools = llm.bindTools(tools)

  const callModel = async (state: typeof MessagesAnnotation.State) => {
    // We don't prepend AGENT_SYSTEM_PROMPT here because the POST handler already
    // creates a dynamic SystemMessage containing the user's username and puts it in the state.
    const response = await llmWithTools.invoke(state.messages)

    return { messages: [response] }
  }

  return new StateGraph(MessagesAnnotation)
    .addNode("assistant", callModel)
    .addNode("tools", new ToolNode(tools))
    .addEdge(START, "assistant")
    .addConditionalEdges("assistant", toolsCondition, {
      tools: "tools",
      __end__: END,
    })
    .addEdge("tools", "assistant")
    .compile()
}

function getHeaderValue(
  headers: Record<string, unknown> | undefined,
  name: string,
): string | undefined {
  if (!headers) {
    return undefined
  }

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== name.toLowerCase()) {
      continue
    }

    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }
  }

  return undefined
}

function stringifyMessageContent(content: unknown): string {
  if (typeof content === "string") {
    return content.trim()
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item
        }

        if (item && typeof item === "object") {
          const text = Reflect.get(item, "text")
          const nestedContent = Reflect.get(item, "content")

          if (typeof text === "string") {
            return text
          }

          if (typeof nestedContent === "string") {
            return nestedContent
          }
        }

        return ""
      })
      .join(" ")
      .trim()
  }

  if (content && typeof content === "object") {
    const text = Reflect.get(content, "text")
    const message = Reflect.get(content, "message")

    if (typeof text === "string") {
      return text.trim()
    }

    if (typeof message === "string") {
      return message.trim()
    }
  }

  return ""
}

function extractMessages(payload: VapiPayload): VapiMessage[] {
  if (Array.isArray(payload.messages)) {
    return payload.messages
  }

  if (Array.isArray(payload.message?.messages)) {
    return payload.message.messages
  }

  return []
}

function extractLastUserMessage(payload: VapiPayload): string {
  const messages = extractMessages(payload)

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const candidate = messages[index]

    if (candidate.role?.toLowerCase() !== "user") {
      continue
    }

    const content = stringifyMessageContent(
      candidate.content ?? candidate.text ?? candidate.message,
    )

    if (content) {
      return content
    }
  }

  throw new HttpError(400, "No user message found in the Vapi payload.")
}

function extractGithubToken(req: Request, payload: VapiPayload): string {
  const headerToken = req.headers.get(GITHUB_TOKEN_HEADER)?.trim()
  const bodyToken =
    getHeaderValue(payload.message?.headers, GITHUB_TOKEN_HEADER) ??
    getHeaderValue(payload.headers, GITHUB_TOKEN_HEADER)

  const githubToken = headerToken || bodyToken || process.env.GITHUB_PAT?.trim()

  if (!githubToken) {
    throw new HttpError(400, "Missing x-github-token header and GITHUB_PAT env variable.")
  }

  return githubToken
}

function extractFinalAgentResponse(messages: BaseMessage[] | undefined): { text: string; toolCalls?: any[] } {
  if (!messages?.length) {
    return { text: "I could not find a response." }
  }

  console.log("=== FINAL STATE MESSAGES ===");
  messages.forEach((m, i) => {
    const role = (m as any).name || m._getType();
    let preview = typeof m.content === 'string' ? m.content.substring(0, 100) : JSON.stringify(m.content).substring(0, 100);
    console.log(`[${i}] ${m._getType()} (${role}): ${preview}`);
  });

  let text = "";
  let uiPayload: any = null;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]

    if (message instanceof AIMessage && !text) {
      const content = stringifyMessageContent(message.content)
      if (content) text = content;
    }

    if (message._getType() === "tool" && !uiPayload) {
      try {
        const name = (message as any).name;
        let rawContent: any = message.content;
        
        // LangChain sometimes wraps content
        if (Array.isArray(rawContent)) {
          rawContent = rawContent[0]?.text || rawContent[0];
        }
        
        // Skip if the tool returned an error
        if (typeof rawContent === "string" && (rawContent.startsWith("Error:") || rawContent.includes("Not Found") || rawContent.includes("Bad credentials"))) {
          console.warn("Tool returned an error, skipping UI payload:", rawContent.substring(0, 80));
          continue;
        }
        
        let parsedData: any = rawContent;
        if (typeof rawContent === "string") {
            try {
                parsedData = JSON.parse(rawContent);
            } catch (parsErr) {
                console.warn("Could not JSON.parse rawContent, skipping UI payload.");
                continue;
            }
        }

        // Only create UI payloads if we got valid array data
        if (!Array.isArray(parsedData)) {
          console.warn("Tool data is not an array, skipping UI payload.");
          continue;
        }

        if (name === "fetch_repo_languages") {
          uiPayload = {
            type: "chart",
            data: parsedData
          };
          console.log("Extracting chart data:", parsedData.length, "items.");
        } else if (name === "fetch_user_repos" || name === "fetch_open_prs") {
          uiPayload = {
            type: "table",
            data: parsedData
          };
          console.log("Extracting table data:", parsedData.length, "items.");
        }
      } catch (e) {
        console.warn("Failed to extract tool message payload", e);
      }
    }
  }

  if (!text) {
    text = uiPayload 
      ? "Here's the data on your screen now." 
      : "I'm sorry, I couldn't process that request. Could you try again?";
  }

  const toolCalls = uiPayload ? [{
    id: "call_ui_inject_" + Date.now(),
    name: "render_ui",
    args: { type: uiPayload.type, data: uiPayload.data, spoken_summary: text }
  }] : undefined;

  return { text, toolCalls }
}

function createVapiCompletion(content: string, toolCalls?: any[]): VapiCompletionResponse {
  let finalContent = content;
  
  // If we have UI data, save it to the in-memory store.
  // The frontend polls /api/ui-data to fetch it.
  // We do NOT embed anything in the spoken content.
  if (toolCalls && toolCalls.length > 0) {
    const tc = toolCalls[0];
    try {
      const args = typeof tc.args === "string" ? JSON.parse(tc.args) : tc.args;
      if (typeof args.data === "string") {
        try { args.data = JSON.parse(args.data); } catch {}
      }
      // Use the spoken_summary as the primary content if available
      if (args.spoken_summary) {
        finalContent = args.spoken_summary;
      }
      // Store the UI payload for the frontend to poll
      setUiPayload(args.type, args.data);
      console.log(`UI payload stored: type=${args.type}, items=${Array.isArray(args.data) ? args.data.length : 'object'}`);
    } catch (e) {
      console.warn("Could not save UI payload:", e);
    }
  }

  return {
    id: "chatcmpl-12345",
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: "vapi-custom",
    choices: [{
      index: 0,
      message: {
        role: "assistant",
        content: finalContent,
      },
      finish_reason: "stop",
    }],
  }
}

function createStreamResponse(content: string): Response {
  // Build OpenAI-compatible SSE chunks
  const chunks: string[] = [];
  
  // Send content in a single chunk (Vapi handles chunked streaming)
  chunks.push(`data: ${JSON.stringify({
    id: "chatcmpl-12345",
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model: "vapi-custom",
    choices: [{
      index: 0,
      delta: { role: "assistant", content: content },
      finish_reason: null,
    }],
  })}\n\n`);

  // Send the final stop chunk
  chunks.push(`data: ${JSON.stringify({
    id: "chatcmpl-12345",
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model: "vapi-custom",
    choices: [{
      index: 0,
      delta: {},
      finish_reason: "stop",
    }],
  })}\n\n`);

  chunks.push(`data: [DONE]\n\n`);

  const body = chunks.join("");
  
  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

export async function POST(req: Request): Promise<Response> {
  try {
    const payload = (await req.json()) as VapiPayload
    const isStreaming = (payload as any).stream === true;
    
    // Debug: log what Vapi sends us
    const messages = extractMessages(payload);
    console.log(`\n=== VAPI REQUEST (stream=${isStreaming}) ===`);
    console.log(`Messages count: ${messages.length}`);
    messages.forEach((m, i) => console.log(`  [${i}] role=${m.role} content="${String(m.content || m.text || '').substring(0, 80)}"`));
    
    const githubToken = extractGithubToken(req, payload)
    const userMessage = extractLastUserMessage(payload)
    console.log(`User message: "${userMessage.substring(0, 100)}"`);

    const agent = createGitHubPrAgent(githubToken)
    const result = await agent.invoke({
      messages: [
        new SystemMessage(AGENT_SYSTEM_PROMPT),
        new HumanMessage(userMessage)
      ],
    })

    const { text, toolCalls } = extractFinalAgentResponse(result.messages)
    
    // Build the final content (with optional UI marker)
    const response = createVapiCompletion(text, toolCalls);
    const finalContent = response.choices[0].message.content;
    
    console.log(`Response content: "${finalContent.substring(0, 100)}"`);
    console.log(`Stream mode: ${isStreaming}`);
    console.log(`=== END ===\n`);

    if (isStreaming) {
      return createStreamResponse(finalContent);
    }

    return Response.json(response)
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500
    const message = error instanceof Error ? error.message : "Unexpected server error."
    console.error(`=== ERROR ${status}: ${message} ===`);

    const errorPayload = (error as any)._isStreaming 
      ? createStreamResponse(message)
      : Response.json(createVapiCompletion(message), { status });
    
    return errorPayload;
  }
}
