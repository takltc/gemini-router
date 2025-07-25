// Server-side favicon generation for use in HTML templates
export function generateFaviconDataUrl(): string {
  // Generate a simple SVG favicon
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#f3f4f6"/><text x="16" y="22" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#4285f4" text-anchor="middle">Y</text></svg>`;

  // Use btoa for base64 encoding (available in Cloudflare Workers)
  return `data:image/svg+xml;base64,${btoa(svgContent)}`;
}

export const faviconDataUrl = generateFaviconDataUrl();
