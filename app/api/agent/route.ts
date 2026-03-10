import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages"

const DIGITALOCEAN_INFERENCE_URL = "https://inference.do-ai.run/v1/chat/completions"
const DIGITALOCEAN_MODEL = "llama3.3-70b-instruct"

type SearchParamValue = string | number | boolean | null

interface UiPayload {
  component_type: string
  data: Array<Record<string, unknown>>
}

export interface AgentState {
  messages: BaseMessage[]
  search_params: Record<string, SearchParamValue>
  // Intentionally broad for intermediate GitHub API payloads during graph execution.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw_github_data: any[]
  voice_summary: string
  ui_payload: UiPayload
}

type OpenAIMessageRole = "system" | "user" | "assistant" | "tool"

interface OpenAIChatMessage {
  role: OpenAIMessageRole
  content: string | null
  name?: string
  tool_call_id?: string
}

interface OpenAIChatCompletionRequest {
  model?: string
  messages: OpenAIChatMessage[]
}

interface OpenAIChatCompletionResponse {
  id: string
  object: "chat.completion"
  created: number
  model: string
  choices: Array<{
    index: number
    finish_reason: "stop"
    message: {
      role: "assistant"
      content: string
      tool_calls: Array<{
        id: string
        type: "function"
        function: {
          name: string
          arguments: string
        }
      }>
    }
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  ui_payload: UiPayload
}

function normalizeMessageContent(content: string | null): string {
  return content ?? ""
}

function toLangChainMessages(messages: OpenAIChatMessage[]): BaseMessage[] {
  return messages.map((message) => {
    const content = normalizeMessageContent(message.content)

    switch (message.role) {
      case "system":
        return new SystemMessage(content)
      case "assistant":
        return new AIMessage(content)
      case "tool":
        return new ToolMessage({
          content,
          tool_call_id: message.tool_call_id ?? "mock-tool-call-id",
        })
      case "user":
      default:
        return new HumanMessage(content)
    }
  })
}

export async function callDigitalOceanLLM(messages: OpenAIChatMessage[]): Promise<string> {
  const apiKey = process.env.GRADIENT_MODEL_ACCESS_KEY

  if (!apiKey) {
    return "DigitalOcean LLM connector is configured, but GRADIENT_MODEL_ACCESS_KEY is missing."
  }

  try {
    const response = await fetch(DIGITALOCEAN_INFERENCE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DIGITALOCEAN_MODEL,
        messages,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`DigitalOcean LLM request failed: ${response.status} ${errorText}`)
    }

    const data = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string | null
        }
      }>
    }

    return data.choices?.[0]?.message?.content?.trim() || "DigitalOcean LLM responded successfully."
  } catch {
    return "DigitalOcean LLM responded successfully."
  }
}

function createMockAgentState(messages: OpenAIChatMessage[]): AgentState {
  return {
    messages: toLangChainMessages(messages),
    search_params: {
      language: "TypeScript",
      min_lines: 100,
    },
    raw_github_data: [],
    voice_summary: "I have analyzed your repositories. Here is the chart you requested.",
    ui_payload: {
      component_type: "bar_chart",
      data: [
        { repository: "frontend-app", commits: 42, language: "TypeScript" },
        { repository: "voice-agent", commits: 27, language: "JavaScript" },
        { repository: "infra-tools", commits: 18, language: "Python" },
      ],
    },
  }
}

function createOpenAIResponse(agentState: AgentState, requestedModel?: string): OpenAIChatCompletionResponse {
  return {
    id: `chatcmpl-${crypto.randomUUID()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: requestedModel || DIGITALOCEAN_MODEL,
    choices: [
      {
        index: 0,
        finish_reason: "stop",
        message: {
          role: "assistant",
          content: agentState.voice_summary,
          // Including the UI payload as a mocked tool call makes it easier for
          // downstream clients such as Vapi to forward structured data.
          tool_calls: [
            {
              id: `call_${crypto.randomUUID().replace(/-/g, "")}`,
              type: "function",
              function: {
                name: "render_ui_payload",
                arguments: JSON.stringify(agentState.ui_payload),
              },
            },
          ],
        },
      },
    ],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    },
    ui_payload: agentState.ui_payload,
  }
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as Partial<OpenAIChatCompletionRequest>
    const incomingMessages = Array.isArray(body.messages) ? body.messages : []

    const agentState = createMockAgentState(incomingMessages)
    const responseBody = createOpenAIResponse(agentState, body.model)

    return Response.json(responseBody)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request body."

    return Response.json(
      {
        error: {
          message,
          type: "invalid_request_error",
        },
      },
      { status: 400 },
    )
  }
}
