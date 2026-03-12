import { AIMessage, type BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages"
import { tool } from "@langchain/core/tools"
import { END, MessagesAnnotation, START, StateGraph } from "@langchain/langgraph"
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt"
import { ChatOpenAI } from "@langchain/openai"
import { Octokit } from "octokit"

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
  "You are a GitHub pull request assistant for a voice UI.",
  "Use the fetch_open_prs tool whenever the user asks about pull requests for a repository.",
  "If the repository owner or repo name is missing, ask the user for the missing value.",
  "After using a tool, answer in plain, concise text that sounds natural when read aloud.",
].join(" ")

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
    }
    finish_reason: "stop"
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

function createGitHubPrAgent(githubToken: string) {
  const llm = createLlm()
  const tools = [createFetchOpenPrsTool(githubToken)]
  const llmWithTools = llm.bindTools(tools)

  const callModel = async (state: { messages: BaseMessage[] }) => {
    const response = await llmWithTools.invoke([
      new SystemMessage(AGENT_SYSTEM_PROMPT),
      ...state.messages,
    ])

    return { messages: [response] }
  }

  // LangGraph flow:
  // 1. The assistant node decides whether it can answer directly or needs a tool.
  // 2. If the model requested a tool call, the ToolNode executes fetch_open_prs.
  // 3. The graph loops back to the assistant so it can turn tool output into a final voice-friendly reply.
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

  const githubToken = headerToken || bodyToken

  if (!githubToken) {
    throw new HttpError(400, "Missing x-github-token in the request.")
  }

  return githubToken
}

function extractFinalAgentText(messages: BaseMessage[] | undefined): string {
  if (!messages?.length) {
    return "I could not find a response."
  }

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]

    if (message instanceof AIMessage) {
      const content = stringifyMessageContent(message.content)

      if (content) {
        return content
      }
    }
  }

  return "I could not find a response."
}

function createVapiCompletion(content: string): VapiCompletionResponse {
  return {
    id: "chatcmpl-12345",
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: "vapi-custom",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content,
        },
        finish_reason: "stop",
      },
    ],
  }
}

export async function POST(req: Request): Promise<Response> {
  try {
    const payload = (await req.json()) as VapiPayload
    const githubToken = extractGithubToken(req, payload)
    const userMessage = extractLastUserMessage(payload)

    const agent = createGitHubPrAgent(githubToken)
    const result = await agent.invoke({
      messages: [new HumanMessage(userMessage)],
    })

    const finalText = extractFinalAgentText(result.messages)

    return Response.json(createVapiCompletion(finalText))
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500
    const message = error instanceof Error ? error.message : "Unexpected server error."

    return Response.json(createVapiCompletion(message), { status })
  }
}
