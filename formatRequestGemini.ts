/**
 * Claude to Gemini request format converter
 * @author jizhejiang
 * @date 2025-07-25
 */

import type {
  ClaudeRequest,
  ClaudeMessage,
  ClaudeTool,
  GeminiContent,
  GeminiPart,
  GeminiRequest,
  GeminiTool,
  GeminiSystemInstruction,
} from './utils/types';

/**
 * Converts Claude format messages to Gemini format contents
 * @param messages Claude format messages array
 * @returns Gemini format contents array
 */
function convertMessages(messages: ClaudeMessage[]): GeminiContent[] {
  const geminiContents: GeminiContent[] = [];

  for (const message of messages) {
    // Map role: user -> user, assistant -> model
    const geminiRole = message.role === 'assistant' ? 'model' : 'user';

    if (!Array.isArray(message.content)) {
      // Simple text message
      if (typeof message.content === 'string') {
        geminiContents.push({
          role: geminiRole,
          parts: [{ text: message.content }],
        });
      }
      continue;
    }

    // Process complex content array
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
        // Convert Claude tool_use to Gemini functionCall
        parts.push({
          functionCall: {
            name: contentPart.name,
            args: contentPart.input,
          },
        });
      } else if (contentPart.type === 'tool_result') {
        // Convert Claude tool_result to Gemini functionResponse
        parts.push({
          functionResponse: {
            name: contentPart.tool_use_id, // Note: Gemini uses name, not ID
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
    cleaned.items = cleanSchema(cleaned.items);
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
  const { messages, system, temperature, tools, stream = false } = body;

  // Convert messages to contents
  const contents = convertMessages(messages);

  // Build Gemini request body
  const geminiBody: GeminiRequest = {
    contents: contents,
  };

  // Add system instruction if present
  const systemInstruction = formatSystemInstruction(system);
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
  const convertedTools = convertTools(tools);
  if (convertedTools) {
    geminiBody.tools = [convertedTools];
  }

  // Note: Gemini uses stream=true as query parameter, not in body
  // Return both the body and stream flag for the caller to handle
  return {
    geminiBody,
    isStream: stream,
  };
}
