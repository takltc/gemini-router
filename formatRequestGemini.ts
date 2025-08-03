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
function convertMessages(messages: ClaudeMessage[]): GeminiContent[] {
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
        const toolName = toolNameMap.get(contentPart.tool_use_id);
        if (!toolName) {
          console.warn(
            `Could not find corresponding tool use for tool_result with id: ${contentPart.tool_use_id}`
          );
          continue;
        }
        parts.push({
          functionResponse: {
            name: toolName,
            response: {
              result: contentPart.content,
            },
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
  delete cleaned.additionalProperties;

  // Handle format field - Gemini only supports 'enum' and 'date-time' for STRING type
  if (cleaned.type === 'string' && cleaned.format) {
    if (cleaned.format !== 'enum' && cleaned.format !== 'date-time') {
      // Remove unsupported format values
      delete cleaned.format;
    }
  }

  // Recursively clean nested schemas
  if (cleaned.properties) {
    cleaned.properties = Object.entries(cleaned.properties).reduce(
      (acc, [key, value]) => {
        acc[key] = cleanSchema(value as Record<string, unknown>);
        return acc;
      },
      {} as Record<string, unknown>
    );
  }

  // Clean items if it's an array schema
  if (cleaned.items) {
    cleaned.items = cleanSchema(cleaned.items as Record<string, unknown>);
  }

  // Clean anyOf, oneOf, allOf
  ['anyOf', 'oneOf', 'allOf'].forEach((key) => {
    if (cleaned[key] && Array.isArray(cleaned[key])) {
      cleaned[key] = cleaned[key].map((item: Record<string, unknown>) => cleanSchema(item));
    }
  });

  return cleaned;
}

/**
 * Converts Claude tools format to Gemini function declarations
 * @param tools Claude format tools array
 * @returns Gemini format function declarations
 */
function convertTools(tools: ClaudeTool[]): GeminiTool | undefined {
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
    text = system.text || JSON.stringify(system);
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
  const { messages, system, temperature, tools, stream = true } = body;

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

  // Add generation config if temperature is specified
  if (temperature !== undefined) {
    geminiBody.generationConfig = {
      temperature: temperature,
    };
  }

  // Convert and add tools if present
  const convertedTools = convertTools(tools ?? []);
  if (convertedTools) {
    geminiBody.tools = [convertedTools];
  }

  if (!geminiBody.tools) {
    geminiBody.tools = [];
  }

  geminiBody.tools.push({ googleSearch: {} });

  // Note: Gemini uses stream=true as query parameter, not in body
  // Return both the body and stream flag for the caller to handle
  return {
    geminiBody,
    isStream: stream,
  };
}
