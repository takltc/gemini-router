/**
 * Tests for formatResponseGemini converter
 * @author jizhejiang
 * @date 2025-01-27
 */

import { describe, it, expect } from 'vitest';
import { formatGeminiToClaude } from '../formatResponseGemini';
import type { GeminiResponse } from '../utils/types';

describe('formatGeminiToClaude', () => {
  it('should convert simple text response', () => {
    const geminiResponse: GeminiResponse = {
      candidates: [
        {
          content: {
            parts: [{ text: 'Hello! I can help you with that.' }],
          },
          finishReason: 'STOP',
        },
      ],
      usageMetadata: {
        promptTokenCount: 10,
        candidatesTokenCount: 20,
      },
    };

    const result = formatGeminiToClaude(geminiResponse, 'gemini-pro');

    expect(result.type).toBe('message');
    expect(result.role).toBe('assistant');
    expect(result.model).toBe('gemini-pro');
    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toEqual({
      type: 'text',
      text: 'Hello! I can help you with that.',
    });
    expect(result.stop_reason).toBe('end_turn');
    expect(result.usage).toEqual({
      input_tokens: 10,
      output_tokens: 20,
    });
  });

  it('should convert function call response', () => {
    const geminiResponse: GeminiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                functionCall: {
                  name: 'get_weather',
                  args: { location: 'Tokyo' },
                },
              },
            ],
          },
          finishReason: 'FUNCTION_CALL',
        },
      ],
    };

    const result = formatGeminiToClaude(geminiResponse, 'gemini-pro');

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('tool_use');
    expect(result.content[0].name).toBe('get_weather');
    expect(result.content[0].input).toEqual({ location: 'Tokyo' });
    expect(result.stop_reason).toBe('tool_use');
  });

  it('should generate tool_use id when missing', () => {
    const geminiResponse: GeminiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                functionCall: {
                  name: 'do_something',
                  args: { a: 1 },
                },
              },
            ],
          },
          finishReason: 'FUNCTION_CALL',
        },
      ],
    };

    const result = formatGeminiToClaude(geminiResponse, 'gemini-pro');
    expect(result.content[0].type).toBe('tool_use');
    expect(result.content[0].id).toMatch(/^toolu_/);
  });

  it('should handle function response', () => {
    const geminiResponse: GeminiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                functionResponse: {
                  name: 'get_weather',
                  response: { temperature: 22, condition: 'sunny' },
                  id: 'func_123',
                },
              },
            ],
          },
        },
      ],
    };

    const result = formatGeminiToClaude(geminiResponse, 'gemini-pro');

    expect(result.content[0].type).toBe('tool_result');
    expect(result.content[0].tool_use_id).toBe('func_123');
    expect(result.content[0].content).toEqual({
      temperature: 22,
      condition: 'sunny',
    });
  });

  it('should generate ID when not provided', () => {
    const geminiResponse: GeminiResponse = {
      candidates: [
        {
          content: {
            parts: [{ text: 'Test' }],
          },
        },
      ],
    };

    const result = formatGeminiToClaude(geminiResponse, 'gemini-pro');

    expect(result.id).toMatch(/^msg_\d+$/);
  });

  it('should throw error when no candidates', () => {
    const geminiResponse: GeminiResponse = {
      candidates: [],
    };

    expect(() => formatGeminiToClaude(geminiResponse, 'gemini-pro')).toThrow(
      'No candidates found in Gemini response'
    );
  });

  it('should map finish reasons correctly', () => {
    const testCases = [
      { finishReason: 'STOP' as const, expected: 'end_turn' },
      { finishReason: 'MAX_TOKENS' as const, expected: 'max_tokens' },
      { finishReason: 'FUNCTION_CALL' as const, expected: 'tool_use' },
      { finishReason: 'SAFETY' as const, expected: 'stop_sequence' },
      { finishReason: 'RECITATION' as const, expected: 'stop_sequence' },
      { finishReason: 'OTHER' as const, expected: 'stop_sequence' },
    ];

    testCases.forEach(({ finishReason, expected }) => {
      const geminiResponse: GeminiResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: 'Test' }],
            },
            finishReason,
          },
        ],
      };

      const result = formatGeminiToClaude(geminiResponse, 'gemini-pro');
      expect(result.stop_reason).toBe(expected);
    });
  });

  it('should handle multiple parts in response', () => {
    const geminiResponse: GeminiResponse = {
      candidates: [
        {
          content: {
            parts: [
              { text: 'First part. ' },
              { text: 'Second part.' },
              {
                functionCall: {
                  name: 'calculate',
                  args: { x: 1, y: 2 },
                },
              },
            ],
          },
        },
      ],
    };

    const result = formatGeminiToClaude(geminiResponse, 'gemini-pro');

    expect(result.content).toHaveLength(3);
    expect(result.content[0]).toEqual({
      type: 'text',
      text: 'First part. ',
    });
    expect(result.content[1]).toEqual({
      type: 'text',
      text: 'Second part.',
    });
    expect(result.content[2].type).toBe('tool_use');
    expect(result.content[2].name).toBe('calculate');
  });

  it('should handle missing usage metadata', () => {
    const geminiResponse: GeminiResponse = {
      candidates: [
        {
          content: {
            parts: [{ text: 'Test' }],
          },
        },
      ],
    };

    const result = formatGeminiToClaude(geminiResponse, 'gemini-pro');

    expect(result.usage).toEqual({
      input_tokens: 0,
      output_tokens: 0,
    });
  });
});
