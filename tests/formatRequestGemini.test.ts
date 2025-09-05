/**
 * Tests for formatRequestGemini converter
 * @author jizhejiang
 * @date 2025-01-27
 */

import { describe, it, expect } from 'vitest';
import { formatClaudeToGemini } from '../formatRequestGemini';
import type { ClaudeRequest } from '../utils/types';

describe('formatClaudeToGemini', () => {
  it('should convert simple text message', () => {
    const claudeRequest: ClaudeRequest = {
      model: 'claude-3-opus-20240229',
      messages: [
        {
          role: 'user',
          content: 'Hello, how are you?',
        },
      ],
    };

    const result = formatClaudeToGemini(claudeRequest);

    expect(result.geminiBody.contents).toHaveLength(1);
    expect(result.geminiBody.contents[0]).toEqual({
      role: 'user',
      parts: [{ text: 'Hello, how are you?' }],
    });
    expect(result.isStream).toBe(false);
  });

  it('should convert assistant messages to model role', () => {
    const claudeRequest: ClaudeRequest = {
      model: 'claude-3-opus-20240229',
      messages: [
        {
          role: 'user',
          content: 'Hello',
        },
        {
          role: 'assistant',
          content: 'Hi there! How can I help you today?',
        },
      ],
    };

    const result = formatClaudeToGemini(claudeRequest);

    expect(result.geminiBody.contents).toHaveLength(2);
    expect(result.geminiBody.contents[0].role).toBe('user');
    expect(result.geminiBody.contents[1].role).toBe('model');
  });

  it('should handle complex content with text parts', () => {
    const claudeRequest: ClaudeRequest = {
      model: 'claude-3-opus-20240229',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'This is a text part',
            },
          ],
        },
      ],
    };

    const result = formatClaudeToGemini(claudeRequest);

    expect(result.geminiBody.contents[0].parts).toEqual([{ text: 'This is a text part' }]);
  });

  it('should convert tool_use to functionCall', () => {
    const claudeRequest: ClaudeRequest = {
      model: 'claude-3-opus-20240229',
      messages: [
        {
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'toolu_123',
              name: 'get_weather',
              input: { location: 'Paris' },
            },
          ],
        },
      ],
    };

    const result = formatClaudeToGemini(claudeRequest);

    expect(result.geminiBody.contents[0].parts[0]).toEqual({
      functionCall: {
        name: 'get_weather',
        args: { location: 'Paris' },
      },
    });
  });

  it('should convert tool_result to functionResponse', () => {
    const claudeRequest: ClaudeRequest = {
      model: 'claude-3-opus-20240229',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'toolu_123',
              content: 'Sunny, 25°C',
            },
          ],
        },
      ],
    };

    const result = formatClaudeToGemini(claudeRequest);

    expect(result.geminiBody.contents[0].parts[0]).toEqual({
      functionResponse: {
        name: 'toolu_123',
        response: { result: 'Sunny, 25°C' },
      },
    });
  });

  it('should map tool_result.tool_use_id to prior tool_use name when available', () => {
    const claudeRequest: ClaudeRequest = {
      model: 'claude-3-opus-20240229',
      messages: [
        {
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'toolu_abc',
              name: 'get_time',
              input: { tz: 'UTC' },
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'toolu_abc',
              content: { now: '2025-09-04T00:00:00Z' },
            },
          ],
        },
      ],
    };

    const result = formatClaudeToGemini(claudeRequest);
    const parts = result.geminiBody.contents[1].parts as any[];
    expect(parts[0].functionResponse.name).toBe('get_time');
  });

  it('should handle system instructions', () => {
    const claudeRequest: ClaudeRequest = {
      model: 'claude-3-opus-20240229',
      messages: [],
      system: 'You are a helpful assistant',
    };

    const result = formatClaudeToGemini(claudeRequest);

    expect(result.geminiBody.systemInstruction).toEqual({
      parts: [{ text: 'You are a helpful assistant' }],
    });
  });

  it('should handle array of system instructions', () => {
    const claudeRequest: ClaudeRequest = {
      model: 'claude-3-opus-20240229',
      messages: [],
      system: [{ text: 'Rule 1: Be helpful' }, { text: 'Rule 2: Be concise' }],
    };

    const result = formatClaudeToGemini(claudeRequest);

    expect(result.geminiBody.systemInstruction).toEqual({
      parts: [{ text: 'Rule 1: Be helpful\nRule 2: Be concise' }],
    });
  });

  it('should include temperature in generationConfig', () => {
    const claudeRequest: ClaudeRequest = {
      model: 'claude-3-opus-20240229',
      messages: [],
      temperature: 0.7,
    };

    const result = formatClaudeToGemini(claudeRequest);

    expect(result.geminiBody.generationConfig).toEqual({
      temperature: 0.7,
    });
  });

  it('should convert tools to functionDeclarations', () => {
    const claudeRequest: ClaudeRequest = {
      model: 'claude-3-opus-20240229',
      messages: [],
      tools: [
        {
          name: 'get_weather',
          description: 'Get weather information',
          input_schema: {
            type: 'object',
            properties: {
              location: { type: 'string' },
            },
          },
        },
      ],
    };

    const result = formatClaudeToGemini(claudeRequest);

    expect(result.geminiBody.tools).toEqual([
      {
        functionDeclarations: [
          {
            name: 'get_weather',
            description: 'Get weather information',
            parameters: {
              type: 'object',
              properties: {
                location: { type: 'string' },
              },
            },
          },
        ],
      },
    ]);
  });

  it('should handle stream flag', () => {
    const claudeRequest: ClaudeRequest = {
      model: 'claude-3-opus-20240229',
      messages: [],
      stream: true,
    };

    const result = formatClaudeToGemini(claudeRequest);

    expect(result.isStream).toBe(true);
  });
});
