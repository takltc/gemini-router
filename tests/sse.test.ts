/**
 * Tests for SSE utilities
 * @author jizhejiang
 * @date 2025-01-27
 */

import { describe, it, expect, vi } from 'vitest';
import { enqueueSSE } from '../utils/sse';

describe('enqueueSSE', () => {
  it('should enqueue formatted SSE message', () => {
    // Mock controller
    const controller = {
      enqueue: vi.fn(),
    } as unknown as ReadableStreamDefaultController;

    const eventType = 'message';
    const data = { text: 'Hello world' };

    enqueueSSE(controller, eventType, data);

    expect(controller.enqueue).toHaveBeenCalledTimes(1);

    // Get the encoded message
    const callArg = (controller.enqueue as vi.Mock).mock.calls[0][0];

    // Decode the Uint8Array back to string
    const decoder = new TextDecoder();
    const encodedMessage = decoder.decode(callArg);

    expect(encodedMessage).toBe('event: message\ndata: {"text":"Hello world"}\n\n');
  });

  it('should handle complex data objects', () => {
    const controller = {
      enqueue: vi.fn(),
    } as unknown as ReadableStreamDefaultController;

    const eventType = 'content_block_start';
    const data = {
      type: 'content_block_start',
      index: 0,
      content_block: {
        type: 'text',
        text: '',
      },
    };

    enqueueSSE(controller, eventType, data);

    const callArg = (controller.enqueue as vi.Mock).mock.calls[0][0];
    const decoder = new TextDecoder();
    const encodedMessage = decoder.decode(callArg);

    expect(encodedMessage).toBe(
      'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\n'
    );
  });

  it('should handle arrays in data', () => {
    const controller = {
      enqueue: vi.fn(),
    } as unknown as ReadableStreamDefaultController;

    const eventType = 'test_event';
    const data = [1, 2, 3];

    enqueueSSE(controller, eventType, data);

    const callArg = (controller.enqueue as vi.Mock).mock.calls[0][0];
    const decoder = new TextDecoder();
    const encodedMessage = decoder.decode(callArg);

    expect(encodedMessage).toBe('event: test_event\ndata: [1,2,3]\n\n');
  });

  it('should handle null and undefined data', () => {
    const controller = {
      enqueue: vi.fn(),
    } as unknown as ReadableStreamDefaultController;

    enqueueSSE(controller, 'null_event', null);
    enqueueSSE(controller, 'undefined_event', undefined);

    expect(controller.enqueue).toHaveBeenCalledTimes(2);

    const decoder = new TextDecoder();

    const nullMessage = decoder.decode((controller.enqueue as vi.Mock).mock.calls[0][0]);
    expect(nullMessage).toBe('event: null_event\ndata: null\n\n');

    const undefinedMessage = decoder.decode((controller.enqueue as vi.Mock).mock.calls[1][0]);
    expect(undefinedMessage).toBe('event: undefined_event\ndata: undefined\n\n');
  });

  it('should handle special characters in data', () => {
    const controller = {
      enqueue: vi.fn(),
    } as unknown as ReadableStreamDefaultController;

    const data = {
      text: 'Line 1\nLine 2',
      special: 'Tab\there',
      unicode: '你好世界',
    };

    enqueueSSE(controller, 'special_chars', data);

    const callArg = (controller.enqueue as vi.Mock).mock.calls[0][0];
    const decoder = new TextDecoder();
    const encodedMessage = decoder.decode(callArg);

    expect(encodedMessage).toBe(
      'event: special_chars\ndata: {"text":"Line 1\\nLine 2","special":"Tab\\there","unicode":"你好世界"}\n\n'
    );
  });

  it('should encode message as UTF-8', () => {
    const controller = {
      enqueue: vi.fn(),
    } as unknown as ReadableStreamDefaultController;

    const data = { message: '🎉 Unicode emoji test 测试' };

    enqueueSSE(controller, 'unicode_test', data);

    const callArg = (controller.enqueue as vi.Mock).mock.calls[0][0];

    // Verify it's a Uint8Array
    expect(callArg).toBeInstanceOf(Uint8Array);

    // Verify content is correctly encoded
    const decoder = new TextDecoder();
    const decodedMessage = decoder.decode(callArg);
    expect(decodedMessage).toContain('🎉 Unicode emoji test 测试');
  });
});
