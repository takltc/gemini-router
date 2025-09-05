/**
 * Gemini to Claude response format converter
 * @author jizhejiang
 * @date 2025-07-25
 */

import type { GeminiResponse, ClaudeResponse } from './utils/types';

/**
 * Convert Gemini API response to Claude API response format
 * @param res - Gemini API response object
 * @param model - Model name
 * @returns Claude API response format
 */
export function formatGeminiToClaude(res: GeminiResponse, model: string): ClaudeResponse {
  // Extract the first candidate from Gemini response
  const candidate = res.candidates?.[0];
  if (!candidate) {
    throw new Error('No candidates found in Gemini response');
  }

  // Initialize Claude response structure
  const claudeResponse: ClaudeResponse = {
    id: res.id || `msg_${Date.now()}`,
    type: 'message',
    role: 'assistant',
    model: model,
    content: [],
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: {
      input_tokens: res.usageMetadata?.promptTokenCount || 0,
      output_tokens: res.usageMetadata?.candidatesTokenCount || 0,
    },
  };

  // Ensure content is never empty
  if (!candidate.content?.parts || candidate.content.parts.length === 0) {
    claudeResponse.content.push({
      type: 'text',
      text: '',
    });
  }

  // Convert Gemini parts to Claude content array
  const parts = candidate.content?.parts || [];

  for (const part of parts) {
    if ('text' in part && part.text) {
      // Text content
      claudeResponse.content.push({
        type: 'text',
        text: part.text,
      });
    } else if ('functionCall' in part && part.functionCall) {
      // Function call - convert to tool_use
      const toolId =
        part.functionCall.id || `toolu_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      claudeResponse.content.push({
        type: 'tool_use',
        id: toolId,
        name: part.functionCall.name,
        input: part.functionCall.args || {},
      });
      // Update stop_reason for function calls
      claudeResponse.stop_reason = 'tool_use';
    } else if ('functionResponse' in part && part.functionResponse) {
      // Function response - convert to tool_result
      claudeResponse.content.push({
        type: 'tool_result',
        tool_use_id: part.functionResponse.id || `toolu_${Date.now()}`,
        content: part.functionResponse.response,
      });
    }
  }

  // Optionally surface grounding metadata (web results) as a standard tool_result block
  if (candidate.groundingMetadata?.groundingChunks) {
    const groundingChunks = candidate.groundingMetadata.groundingChunks;
    const sources: { title: string; url: string }[] = [];
    for (const chunk of groundingChunks) {
      if (chunk.web) {
        const webChunk = chunk.web;
        claudeResponse.content.push({
          type: 'tool_result',
          tool_use_id: `search_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
          content: [
            {
              type: 'web_search_result',
              title: webChunk.title,
              url: webChunk.uri,
            },
          ],
        });
        if (!sources.some((s) => s.url === webChunk.uri)) {
          sources.push({ title: webChunk.title, url: webChunk.uri });
        }
      }
    }
    // Also append a human-readable sources list as plain text for compat
    if (sources.length > 0) {
      const suffix = ['\n\nSources:']
        .concat(sources.map((s) => `- ${s.title} (${s.url})`))
        .join('\n');
      claudeResponse.content.push({ type: 'text', text: suffix });
    }
  }

  // Handle finish reason mapping
  if (candidate.finishReason) {
    switch (candidate.finishReason) {
      case 'STOP':
        claudeResponse.stop_reason = 'end_turn';
        break;
      case 'MAX_TOKENS':
        claudeResponse.stop_reason = 'max_tokens';
        break;
      case 'FUNCTION_CALL':
        claudeResponse.stop_reason = 'tool_use';
        break;
      case 'SAFETY':
      case 'RECITATION':
      case 'OTHER':
        claudeResponse.stop_reason = 'stop_sequence';
        break;
      default:
        claudeResponse.stop_reason = 'end_turn';
    }
  }

  return claudeResponse;
}
