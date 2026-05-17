/**
 * Model Router — Halite multi-model cognition stack
 *
 * OpenAI  → execution layer: agent chat, tool calling, structured extraction, signal detection
 * Anthropic → synthesis layer: insight generation, routine building, narrative, executive reports
 *
 * Rule of thumb:
 *   OpenAI  = "Do it"  — fast, interactive, structured, tool-native
 *   Anthropic = "Understand it" — deep reasoning, synthesis, long-context, strategy
 */

import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

// ── Lazy clients ───────────────────────────────────────────────────────────

let _anthropic: Anthropic | null = null
let _openai: OpenAI | null = null

export function getAnthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _anthropic
}

export function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

// ── Routing table ──────────────────────────────────────────────────────────

export const TASK = {
  // OpenAI — execution, interaction, extraction
  AGENT_CHAT:             { provider: 'openai',    model: 'gpt-4o'       } as const,
  TOOL_EXECUTION:         { provider: 'openai',    model: 'gpt-4o'       } as const,
  STRUCTURED_EXTRACTION:  { provider: 'openai',    model: 'gpt-4o'       } as const,
  SIGNAL_DETECTION:       { provider: 'openai',    model: 'gpt-4o'       } as const,
  QUERY_SUMMARY:          { provider: 'openai',    model: 'gpt-4o-mini'  } as const,

  // Anthropic — synthesis, strategy, narrative
  INSIGHT_SYNTHESIS:      { provider: 'anthropic', model: 'claude-sonnet-4-6' } as const,
  ROUTINE_GENERATION:     { provider: 'anthropic', model: 'claude-sonnet-4-6' } as const,
  NARRATIVE:              { provider: 'anthropic', model: 'claude-sonnet-4-6' } as const,
  EXECUTIVE_REPORT:       { provider: 'anthropic', model: 'claude-sonnet-4-6' } as const,
  TREND_ANALYSIS:         { provider: 'anthropic', model: 'claude-sonnet-4-6' } as const,
  STRATEGIC_RECOMMENDATION: { provider: 'anthropic', model: 'claude-sonnet-4-6' } as const,
} as const

export type TaskKey = keyof typeof TASK

// ── Synthesis helper (Anthropic) ───────────────────────────────────────────
// For deep reasoning tasks: insight generation, trend analysis, reports.
// Supports prompt caching — pass cacheableSystemPrompt for expensive brand contexts.

export interface SynthesizeOptions {
  task: Extract<TaskKey, 'INSIGHT_SYNTHESIS' | 'NARRATIVE' | 'EXECUTIVE_REPORT' | 'TREND_ANALYSIS' | 'STRATEGIC_RECOMMENDATION'>
  userPrompt: string
  systemPrompt?: string
  cacheableSystemPrompt?: string  // cached across requests — use for large brand contexts
  maxTokens?: number
}

export async function synthesize(opts: SynthesizeOptions): Promise<string> {
  const client = getAnthropic()
  const { model } = TASK[opts.task]

  const systemBlocks: Anthropic.MessageParam['content'] = []

  const system: Anthropic.Messages.TextBlockParam[] = []
  if (opts.cacheableSystemPrompt) {
    system.push({
      type: 'text',
      text: opts.cacheableSystemPrompt,
      // @ts-ignore — cache_control valid in API, not yet in SDK types
      cache_control: { type: 'ephemeral' },
    })
  }
  if (opts.systemPrompt) {
    system.push({ type: 'text', text: opts.systemPrompt })
  }

  const response = await client.messages.create({
    model,
    max_tokens: opts.maxTokens ?? 2048,
    ...(system.length > 0 ? { system } : {}),
    messages: [{ role: 'user', content: opts.userPrompt }],
  })

  return response.content[0]?.type === 'text' ? response.content[0].text.trim() : ''
}

// ── Structured extraction helper (OpenAI) ─────────────────────────────────
// For parsing, classification, and structured output tasks.
// Pass a JSON schema description in systemPrompt — OpenAI will return valid JSON.

export interface ExtractOptions {
  task?: Extract<TaskKey, 'STRUCTURED_EXTRACTION' | 'SIGNAL_DETECTION' | 'QUERY_SUMMARY'>
  systemPrompt: string
  userPrompt: string
  maxTokens?: number
}

export async function extract<T = unknown>(opts: ExtractOptions): Promise<T> {
  const client = getOpenAI()
  const { model } = TASK[opts.task ?? 'STRUCTURED_EXTRACTION']

  const response = await client.chat.completions.create({
    model,
    max_tokens: opts.maxTokens ?? 1024,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: opts.systemPrompt },
      { role: 'user', content: opts.userPrompt },
    ],
  })

  const text = response.choices[0]?.message.content ?? '{}'
  return JSON.parse(text) as T
}

// ── Agent chat helper (OpenAI) ─────────────────────────────────────────────
// For streaming agent interactions in the UI — Crystal chat, agent Q&A.
// Returns an OpenAI stream; the route handler pipes it to the Fastify response.

export interface AgentChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AgentChatOptions {
  messages: AgentChatMessage[]
  tools?: OpenAI.Chat.ChatCompletionTool[]
  maxTokens?: number
}

export function streamAgentChat(opts: AgentChatOptions) {
  const client = getOpenAI()
  const { model } = TASK.AGENT_CHAT

  return client.chat.completions.create({
    model,
    max_tokens: opts.maxTokens ?? 1024,
    stream: true,
    messages: opts.messages,
    ...(opts.tools?.length ? { tools: opts.tools, tool_choice: 'auto' } : {}),
  })
}

// ── Tool execution helper (OpenAI) ────────────────────────────────────────
// For agentic workflows where the model needs to call tools (non-streaming).

export interface ToolExecutionOptions {
  systemPrompt: string
  userPrompt: string
  tools: OpenAI.Chat.ChatCompletionTool[]
  maxTokens?: number
}

export async function executeWithTools(opts: ToolExecutionOptions) {
  const client = getOpenAI()
  const { model } = TASK.TOOL_EXECUTION

  return client.chat.completions.create({
    model,
    max_tokens: opts.maxTokens ?? 2048,
    messages: [
      { role: 'system', content: opts.systemPrompt },
      { role: 'user', content: opts.userPrompt },
    ],
    tools: opts.tools,
    tool_choice: 'auto',
  })
}
