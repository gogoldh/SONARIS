type ThresholdExtractionResult = {
  success: boolean;
  leftThresholds?: [number, number, number, number];
  rightThresholds?: [number, number, number, number];
  confidence?: "high" | "medium" | "low";
  notes?: string;
  error?: string;
};

/**
 * Converts a PDF to image data URL using pdf-lib (browser-side or fallback)
 * For now, returns undefined - PDFs should be converted client-side before sending
 */
export async function convertPdfToImage(_pdfDataUrl: string): Promise<string | undefined> {
  void _pdfDataUrl;
  // In MVP, we ask users to convert PDF to image client-side
  // Future: Add pdf2image library if needed
  return undefined;
}

/**
 * Extracts hearing thresholds from an audiogram image using Claude Vision
 * Expects thresholds at standard frequencies: 500 Hz, 1000 Hz, 2000 Hz, 4000 Hz
 */
export async function extractThresholdsFromAudiogram(
  _imageDataUrl: string,
): Promise<ThresholdExtractionResult> {
  void _imageDataUrl;
  // Audiogram extraction via Anthropic/Claude is disabled in this build to
  // avoid a hard dependency on `@anthropic-ai/sdk`. Callers should either
  // implement their own server-side extraction or configure a webhook.
  return {
    success: false,
    error:
      "Audiogram extraction disabled: install @anthropic-ai/sdk and set ANTHROPIC_API_KEY, or configure an external webhook for parsing.",
    confidence: "low",
  };
}
