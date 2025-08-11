/**
 * Claude to Gemini request format converter
 * @author jizhejiang
 * @date 2025-07-25
 */

import type {
  ClaudeMessage,
  ClaudeRequest,
  ClaudeTool,
  GeminiContent,
  GeminiPart,
  GeminiRequest,
  GeminiSystemInstruction,
  GeminiTool,
} from './utils/types';

/**
 * Converts Claude format messages to Gemini format contents
 * @param messages Claude format messages array
 * @returns Gemini format contents array
 */
function convertMessages(messages: ClaudeMessage[] = []): GeminiContent[] {
  const geminiContents: GeminiContent[] = [];
  const toolNameMap = new Map<string, string>();

  for (const message of messages) {
    const geminiRole = message.role === 'assistant' ? 'model' : 'user';

    if (!Array.isArray(message.content)) {
      if (typeof message.content === 'string') {
        geminiContents.push({
          role: geminiRole,
          parts: [{ text: message.content }],
        });
      }
      continue;
    }

    const parts: GeminiPart[] = [];

    for (const contentPart of message.content) {
      if (contentPart.type === 'text') {
        parts.push({
          text:
            typeof contentPart.text === 'string'
              ? contentPart.text
              : JSON.stringify(contentPart.text),
        });
      } else if (contentPart.type === 'tool_use') {
        if (contentPart.id && contentPart.name) {
          toolNameMap.set(contentPart.id, contentPart.name);
        }
        parts.push({
          functionCall: {
            name: contentPart.name,
            args: contentPart.input,
          },
        });
      } else if (contentPart.type === 'tool_result' && contentPart.tool_use_id) {
        // Prefer mapped tool name from prior tool_use; fallback to tool_use_id per tests
        const toolName = toolNameMap.get(contentPart.tool_use_id) || contentPart.tool_use_id;
        const response =
          typeof contentPart.content === 'string'
            ? { result: contentPart.content }
            : contentPart.content ?? {};
        parts.push({
          functionResponse: {
            name: toolName,
            response,
          },
        });
      }
    }

    if (parts.length > 0) {
      geminiContents.push({
        role: geminiRole,
        parts: parts,
      });
    }
  }

  return geminiContents;
}

/**
 * Removes additionalProperties and unsupported format values from JSON Schema for Gemini compatibility
 * @param schema JSON Schema object
 * @returns Cleaned schema compatible with Gemini
 */
function cleanSchema(schema: Record<string, unknown>): Record<string, unknown> {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  // Create a copy to avoid mutating the original
  const cleaned = { ...schema };

  // Remove additionalProperties
  delete (cleaned as any).additionalProperties;

  // Handle format field - Gemini only supports 'enum' and 'date-time' for STRING type
  if ((cleaned as any).type === 'string' && (cleaned as any).format) {
    if ((cleaned as any).format !== 'enum' && (cleaned as any).format !== 'date-time') {
      // Remove unsupported format values
      delete (cleaned as any).format;
    }
  }

  // Recursively clean nested schemas
  if ((cleaned as any).properties) {
    (cleaned as any).properties = Object.entries((cleaned as any).properties).reduce(
      (acc, [key, value]) => {
        (acc as any)[key] = cleanSchema(value as Record<string, unknown>);
        return acc;
      },
      {} as Record<string, unknown>
    );
  }

  // Clean items if it's an array schema
  if ((cleaned as any).items) {
    (cleaned as any).items = cleanSchema((cleaned as any).items as Record<string, unknown>);
  }

  // Clean anyOf, oneOf, allOf
  ;(['anyOf', 'oneOf', 'allOf'] as const).forEach((key) => {
    if ((cleaned as any)[key] && Array.isArray((cleaned as any)[key])) {
      (cleaned as any)[key] = (cleaned as any)[key].map((item: Record<string, unknown>) =>
        cleanSchema(item)
      );
    }
  });

  return cleaned;
}

/**
 * Converts Claude tools format to Gemini function declarations
 * @param tools Claude format tools array
 * @returns Gemini format function declarations
 */
function convertTools(tools: ClaudeTool[] = []): GeminiTool | undefined {
  if (!tools || tools.length === 0) {
    return undefined;
  }

  return {
    functionDeclarations: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: cleanSchema(tool.input_schema),
    })),
  };
}

/**
 * Formats system messages for Gemini
 * @param system Claude system message(s)
 * @returns Formatted system instruction object with parts
 */
function formatSystemInstruction(
  system: string | { text: string } | { text: string }[]
): GeminiSystemInstruction | undefined {
  if (!system) {
    return undefined;
  }

  let text: string;

  if (typeof system === 'string') {
    text = system;
  } else if (Array.isArray(system)) {
    text = system.map((item) => (typeof item === 'string' ? item : item.text)).join('\n');
  } else {
    text = (system as { text?: string }).text || JSON.stringify(system);
  }

  // Return in Gemini's expected format with parts array
  return {
    parts: [{ text }],
  };
}

/**
 * Converts Claude (Anthropic) request format to Gemini format
 * @param body Claude format request body
 * @returns Object containing Gemini format request body and stream flag
 */
export function formatClaudeToGemini(body: ClaudeRequest): {
  geminiBody: GeminiRequest;
  isStream: boolean;
} {
  const { messages = [], system, temperature, top_p, top_k, max_tokens, stop_sequences, tools, stream = false } = body;

  // Convert messages to contents
  const contents = convertMessages(messages);

  // Build Gemini request body
  const geminiBody: GeminiRequest = {
    contents: contents,
  };

  // Add system instruction if present
  const systemInstruction = formatSystemInstruction(
    system as
      | string
      | { text: string }
      | {
          text: string;
        }[]
  );
  if (systemInstruction) {
    geminiBody.systemInstruction = systemInstruction;
  }

  // Add/merge generation config from Claude params
  const generationConfig: NonNullable<GeminiRequest['generationConfig']> = {};
  if (temperature !== undefined) {
    generationConfig.temperature = temperature;
  }
  if (top_p !== undefined) {
    generationConfig.topP = top_p;
  }
  if (top_k !== undefined) {
    generationConfig.topK = top_k;
  }
  if (max_tokens !== undefined) {
    generationConfig.maxOutputTokens = max_tokens;
  }
  if (stop_sequences && Array.isArray(stop_sequences) && stop_sequences.length > 0) {
    // @ts-expect-error: stopSequences is supported by Gemini generationConfig
    (generationConfig as any).stopSequences = stop_sequences;
  }
  if (Object.keys(generationConfig).length > 0) {
    geminiBody.generationConfig = generationConfig;
  }

  // Convert and add tools if present
  const convertedTools = convertTools(tools ?? []);
  if (convertedTools) {
    geminiBody.tools = [convertedTools];
  }

  // Note: Gemini uses stream=true as query parameter, not in body
  // Return both the body and stream flag for the caller to handle
  return {
    geminiBody,
    isStream: Boolean(stream),
  };
}
