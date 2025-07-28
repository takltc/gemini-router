/**
 * Gemini to Claude stream response converter
 * @author jizhejiang
 * @date 2025-01-27
 */

import { enqueueSSE } from './utils/sse';
import type { GeminiStreamChunk } from './utils/types';

export function streamGeminiToAnthropic(
  geminiStream: ReadableStream,
  model: string
): ReadableStream {
  const messageId = 'msg_' + Date.now();

  return new ReadableStream({
    async start(controller) {
      // Send message_start event
      const messageStart = {
        type: 'message_start',
        message: {
          id: messageId,
          type: 'message',
          role: 'assistant',
          content: [],
          model,
          stop_reason: null,
          stop_sequence: null,
          usage: { input_tokens: 1, output_tokens: 1 },
        },
      };
      enqueueSSE(controller, 'message_start', messageStart);

      let contentBlockIndex = 0;
      let hasStartedTextBlock = false;
      let isToolUse = false;
      let currentToolCallId: string | null = null;
      let toolCallJsonMap = new Map<string, string>();
      let totalInputTokens = 0;
      let totalOutputTokens = 0;

      const reader = geminiStream.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            // Process any remaining data in buffer
            if (buffer.trim()) {
              const lines = buffer.split('\n');
              for (const line of lines) {
                if (line.trim() && line.startsWith('data: ')) {
                  const data = line.slice(6).trim();
                  if (data === '[DONE]') continue;

                  try {
                    const parsed = JSON.parse(data);
                    processGeminiChunk(parsed);
                  } catch {
                    // Parse error
                  }
                }
              }
            }
            break;
          }

          // Decode chunk and add to buffer
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          // Process complete lines from buffer
          const lines = buffer.split('\n');
          // Keep the last potentially incomplete line in buffer
          buffer = lines.pop() || '';

          // Process complete lines in order
          for (const line of lines) {
            if (line.trim() && line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                processGeminiChunk(parsed);
              } catch {
                // Parse error
                continue;
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      function processGeminiChunk(chunk: GeminiStreamChunk) {
        // Extract usage metadata if available
        if (chunk.usageMetadata) {
          totalInputTokens = chunk.usageMetadata.promptTokenCount || totalInputTokens;
          totalOutputTokens = chunk.usageMetadata.candidatesTokenCount || totalOutputTokens;
        }

        // Process candidates
        const candidate = chunk.candidates?.[0];
        if (!candidate) return;

        // Process content parts
        const parts = candidate.content?.parts || [];

        for (const part of parts) {
          if ('text' in part && part.text !== undefined) {
            // Handle text content
            if (isToolUse) {
              // Close previous tool use block
              enqueueSSE(controller, 'content_block_stop', {
                type: 'content_block_stop',
                index: contentBlockIndex,
              });
              isToolUse = false;
              currentToolCallId = null;
              contentBlockIndex++;
            }

            if (!hasStartedTextBlock) {
              // Start new text block
              enqueueSSE(controller, 'content_block_start', {
                type: 'content_block_start',
                index: contentBlockIndex,
                content_block: {
                  type: 'text',
                  text: '',
                },
              });
              hasStartedTextBlock = true;
            }

            // Send text delta
            if ('text' in part && part.text) {
              enqueueSSE(controller, 'content_block_delta', {
                type: 'content_block_delta',
                index: contentBlockIndex,
                delta: {
                  type: 'text_delta',
                  text: part.text || '',
                },
              });
            }
          } else if ('functionCall' in part && part.functionCall) {
            // Handle function call
            if (hasStartedTextBlock) {
              // Close previous text block
              enqueueSSE(controller, 'content_block_stop', {
                type: 'content_block_stop',
                index: contentBlockIndex,
              });
              hasStartedTextBlock = false;
              contentBlockIndex++;
            }

            // Generate tool call ID if not provided
            const toolCallId =
              part.functionCall.id ||
              `toolu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            if (toolCallId !== currentToolCallId) {
              if (isToolUse) {
                // Close previous tool use block
                enqueueSSE(controller, 'content_block_stop', {
                  type: 'content_block_stop',
                  index: contentBlockIndex,
                });
                contentBlockIndex++;
              }

              isToolUse = true;
              currentToolCallId = toolCallId;
              toolCallJsonMap.set(toolCallId, '');

              // Start new tool use block
              const toolBlock = {
                type: 'tool_use',
                id: toolCallId,
                name: part.functionCall.name ?? '',
                input: {},
              };

              enqueueSSE(controller, 'content_block_start', {
                type: 'content_block_start',
                index: contentBlockIndex,
                content_block: toolBlock,
              });
            }

            // Send function arguments as input_json_delta
            if ('functionCall' in part && part.functionCall.args) {
              const argsJson = JSON.stringify(part.functionCall.args);
              const currentJson = toolCallJsonMap.get(currentToolCallId || '') || '';
              toolCallJsonMap.set(currentToolCallId || '', currentJson + argsJson);

              enqueueSSE(controller, 'content_block_delta', {
                type: 'content_block_delta',
                index: contentBlockIndex,
                delta: {
                  type: 'input_json_delta',
                  partial_json: argsJson,
                },
              });
            }
          }
        }

        // Handle groundingMetadata if present (for citations)
        if (candidate.groundingMetadata?.groundingChunks) {
          // This could be handled as text content with citations
          // For now, we'll skip this as it's not part of the standard flow
        }
      }

      // Close last content block
      if (isToolUse || hasStartedTextBlock) {
        enqueueSSE(controller, 'content_block_stop', {
          type: 'content_block_stop',
          index: contentBlockIndex,
        });
      }

      // Send message_delta and message_stop
      enqueueSSE(controller, 'message_delta', {
        type: 'message_delta',
        delta: {
          stop_reason: isToolUse ? 'tool_use' : 'end_turn',
          stop_sequence: null,
        },
        usage: {
          input_tokens: totalInputTokens || 100,
          output_tokens: totalOutputTokens || 150,
        },
      });

      enqueueSSE(controller, 'message_stop', {
        type: 'message_stop',
      });

      controller.close();
    },
  });
}
