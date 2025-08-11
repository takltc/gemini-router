/**
 * Type definitions for Claude and Gemini API formats
 * @author jizhejiang
 * @date 2025-01-27
 */

// ================= Claude Types =================

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | ClaudeContent[];
}

export interface ClaudeContent {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  // For tool_use
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  // For tool_result
  tool_use_id?: string;
  content?: string | Record<string, unknown>;
}

export interface ClaudeTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface ClaudeRequest {
  model: string;
  messages: ClaudeMessage[];
  system?: string | ClaudeSystemMessage[];
  temperature?: number;
  top_p?: number;
  top_k?: number;
  max_tokens?: number;
  stop_sequences?: string[];
  tools?: ClaudeTool[];
  stream?: boolean;
}

export interface ClaudeSystemMessage {
  text: string;
}

export interface ClaudeResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  model: string;
  content: ClaudeContent[];
  stop_reason: 'end_turn' | 'max_tokens' | 'tool_use' | 'stop_sequence';
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

// ================= Gemini Types =================

export interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

export type GeminiPart = GeminiTextPart | GeminiFunctionCallPart | GeminiFunctionResponsePart;

export interface GeminiTextPart {
  text: string;
}

export interface GeminiFunctionCallPart {
  functionCall: {
    name?: string;
    args?: Record<string, unknown>;
    id?: string;
  };
}

export interface GeminiFunctionResponsePart {
  functionResponse: {
    name: string;
    response: Record<string, unknown>;
    id?: string;
  };
}

export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface GeminiTool {
  functionDeclarations?: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }[];
  googleSearch?: Record<string, never>;
}

export interface GeminiSystemInstruction {
  parts: GeminiTextPart[];
}

export interface GeminiRequest {
  contents: GeminiContent[];
  systemInstruction?: GeminiSystemInstruction;
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    topK?: number;
  };
  tools?: GeminiTool[];
}

export interface GeminiCandidate {
  content?: {
    parts: GeminiPart[];
  };
  finishReason?: 'STOP' | 'MAX_TOKENS' | 'FUNCTION_CALL' | 'SAFETY' | 'RECITATION' | 'OTHER';
  groundingMetadata?: {
    groundingChunks?: unknown[];
  };
}

export interface GeminiResponse {
  candidates?: GeminiCandidate[];
  id?: string;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

// ================= Stream Types =================

export interface GeminiStreamChunk {
  candidates?: GeminiCandidate[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
}

export interface OpenAIStreamDelta {
  content?: string;
  tool_calls?: {
    id?: string;
    function?: {
      name?: string;
      arguments?: string;
    };
  }[];
}

export interface OpenAIStreamChunk {
  choices?: {
    delta?: OpenAIStreamDelta;
  }[];
}

// ================= SSE Event Types =================

export interface SSEMessageStart {
  type: 'message_start';
  message: {
    id: string;
    type: 'message';
    role: 'assistant';
    content: unknown[];
    model: string;
    stop_reason: null;
    stop_sequence: null;
    usage: {
      input_tokens: number;
      output_tokens: number;
    };
  };
}

export interface SSEContentBlockStart {
  type: 'content_block_start';
  index: number;
  content_block: {
    type: 'text' | 'tool_use';
    text?: string;
    id?: string;
    name?: string;
    input?: Record<string, unknown>;
  };
}

export interface SSEContentBlockDelta {
  type: 'content_block_delta';
  index: number;
  delta: {
    type: 'text_delta' | 'input_json_delta';
    text?: string;
    partial_json?: string;
  };
}

export interface SSEContentBlockStop {
  type: 'content_block_stop';
  index: number;
}

export interface SSEMessageDelta {
  type: 'message_delta';
  delta: {
    stop_reason: 'end_turn' | 'tool_use';
    stop_sequence: null;
  };
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface SSEMessageStop {
  type: 'message_stop';
}
