/**
 * Server-Sent Events (SSE) utilities
 * @author jizhejiang
 * @date 2025-01-27
 */

/**
 * Enqueue a Server-Sent Event to the stream controller
 * @param controller - ReadableStream controller
 * @param eventType - Type of the SSE event
 * @param data - Data payload for the event
 */
export function enqueueSSE(
  controller: ReadableStreamDefaultController,
  eventType: string,
  data: Record<string, unknown> | Record<string, unknown>[] | string | number | null | undefined
): void {
  const sseMessage = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(new TextEncoder().encode(sseMessage));
}
