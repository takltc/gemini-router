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
          usage: { input_tokens: 0, output_tokens: 0 },
        },
      };
      enqueueSSE(controller, 'message_start', messageStart);

      let contentBlockIndex = 0;
      let hasStartedTextBlock = false;
      let isToolUse = false;
      let currentToolCallId: string | null = null;
      // Track last-sent args JSON per tool call to avoid duplicate deltas
      const lastArgsSent = new Map<string, string>();
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let lastFinishReason:
        | 'STOP'
        | 'MAX_TOKENS'
        | 'FUNCTION_CALL'
        | 'SAFETY'
        | 'RECITATION'
        | 'OTHER'
        | undefined;
      const sources: { title: string; url: string }[] = [];

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
                const trimmed = line.trim();
                if (!trimmed) continue;
                let payload = trimmed;
                if (trimmed.startsWith('data: ')) {
                  payload = trimmed.slice(6).trim();
                }
                if (payload === '[DONE]') continue;
                if (payload.startsWith('{') || payload.startsWith('[')) {
                  try {
                    const parsed = JSON.parse(payload);
                    processGeminiChunk(parsed);
                  } catch {
                    // ignore
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

          // Process complete lines in order (support both SSE-style and raw NDJSON)
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            let payload = trimmed;
            if (trimmed.startsWith('data: ')) {
              payload = trimmed.slice(6).trim();
            }
            if (payload === '[DONE]') continue;
            if (payload.startsWith('{') || payload.startsWith('[')) {
              try {
                const parsed = JSON.parse(payload);
                processGeminiChunk(parsed);
              } catch {
                // Ignore incomplete JSON line; let buffer accumulate
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
        if (candidate.finishReason) {
          lastFinishReason = candidate.finishReason;
        }

        // Collect grounding sources (web)
        if (candidate.groundingMetadata?.groundingChunks) {
          for (const gc of candidate.groundingMetadata.groundingChunks) {
            if (gc.web) {
              const title = gc.web.title;
              const url = gc.web.uri;
              if (!sources.some((s) => s.url === url)) {
                sources.push({ title, url });
              }
            }
          }
        }

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
              lastArgsSent.set(toolCallId, '');

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
              const last = lastArgsSent.get(currentToolCallId || '') || '';
              let partial = argsJson;
              if (argsJson.startsWith(last)) {
                partial = argsJson.slice(last.length);
              }
              if (partial.length > 0 || last.length === 0) {
                enqueueSSE(controller, 'content_block_delta', {
                  type: 'content_block_delta',
                  index: contentBlockIndex,
                  delta: {
                    type: 'input_json_delta',
                    partial_json: partial.length > 0 ? partial : argsJson,
                  },
                });
                lastArgsSent.set(currentToolCallId || '', argsJson);
              }
            }
          }
        }
        // Note: do not inject groundingMetadata chunks into SSE to avoid non-standard content types
      }

      // Append sources as plain text at end if any
      if (sources.length > 0) {
        if (isToolUse) {
          enqueueSSE(controller, 'content_block_stop', {
            type: 'content_block_stop',
            index: contentBlockIndex,
          });
          isToolUse = false;
          currentToolCallId = null;
          contentBlockIndex++;
        }
        if (!hasStartedTextBlock) {
          enqueueSSE(controller, 'content_block_start', {
            type: 'content_block_start',
            index: contentBlockIndex,
            content_block: { type: 'text', text: '' },
          });
          hasStartedTextBlock = true;
        }
        const suffix = ['\n\nSources:']
          .concat(sources.map((s) => `- ${s.title} (${s.url})`))
          .join('\n');
        enqueueSSE(controller, 'content_block_delta', {
          type: 'content_block_delta',
          index: contentBlockIndex,
          delta: { type: 'text_delta', text: suffix },
        });
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
          stop_reason:
            lastFinishReason === 'FUNCTION_CALL'
              ? 'tool_use'
              : lastFinishReason === 'MAX_TOKENS'
                ? 'max_tokens'
                : 'end_turn',
          stop_sequence: null,
        },
        usage: {
          input_tokens: totalInputTokens || 0,
          output_tokens: totalOutputTokens || 0,
        },
      });

      enqueueSSE(controller, 'message_stop', {
        type: 'message_stop',
      });

      controller.close();
    },
  });
}
