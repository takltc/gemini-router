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
            : (contentPart.content ?? ({} as Record<string, unknown>));
        parts.push({
          functionResponse: {
            name: toolName,
            response: response as Record<string, unknown>,
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
  const cleaned: Record<string, unknown> = { ...schema };

  type MutableSchema = Record<string, unknown> & {
    additionalProperties?: unknown;
    type?: unknown;
    format?: unknown;
    properties?: Record<string, unknown>;
    items?: unknown;
    anyOf?: unknown[];
    oneOf?: unknown[];
    allOf?: unknown[];
  };

  const s = cleaned as MutableSchema;

  // Remove additionalProperties
  delete s.additionalProperties;

  // Handle format field - Gemini only supports 'enum' and 'date-time' for STRING type
  if (s.type === 'string' && s.format) {
    if (s.format !== 'enum' && s.format !== 'date-time') {
      // Remove unsupported format values
      delete s.format;
    }
  }

  // Recursively clean nested schemas
  if (s.properties) {
    s.properties = Object.entries(s.properties).reduce(
      (acc: Record<string, unknown>, [key, value]) => {
        acc[key] = cleanSchema(value as Record<string, unknown>);
        return acc;
      },
      {} as Record<string, unknown>
    );
  }

  // Clean items if it's an array schema
  if (s.items) {
    s.items = cleanSchema(s.items as Record<string, unknown>);
  }

  // Clean anyOf, oneOf, allOf
  (['anyOf', 'oneOf', 'allOf'] as const).forEach((key) => {
    if (s[key] && Array.isArray(s[key])) {
      s[key] = (s[key] as unknown[]).map((item) => cleanSchema(item as Record<string, unknown>));
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

  // Check for web_search tool
  const hasWebSearch = tools.some((tool) => tool.name === 'web_search');

  if (hasWebSearch) {
    // Filter out web_search tool from function declarations
    const functionTools = tools.filter((tool) => tool.name !== 'web_search');

    // Create tool object with both function declarations and googleSearch
    const geminiTool: GeminiTool = {
      functionDeclarations: functionTools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: cleanSchema(tool.input_schema),
      })),
      googleSearch: {},
    };

    // If there are no other tools besides web_search, remove empty functionDeclarations
    if (functionTools.length === 0) {
      delete geminiTool.functionDeclarations;
    }

    return geminiTool;
  }

  // Default behavior for function declarations only
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
  const {
    messages = [],
    system,
    temperature,
    top_p,
    top_k,
    max_tokens,
    stop_sequences,
    tools,
    stream = false,
  } = body;

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
    generationConfig.stopSequences = stop_sequences;
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
