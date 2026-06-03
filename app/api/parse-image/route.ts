import { NextResponse } from "next/server";

export const runtime = "nodejs";

function parseDataUrl(dataUrl: string): { mimeType: string; buffer: Buffer } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);

  if (!match) {
    throw new Error("Invalid data URL format");
  }

  const mimeType = match[1];
  const base64 = match[2];
  return { mimeType, buffer: Buffer.from(base64, "base64") };
}

function isNoAudiogramMessage(value: unknown): boolean {
  return typeof value === "string" && /no audiogram provided/i.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export async function POST(request: Request) {
  try {
    const { imageDataUrl } = (await request.json()) as { imageDataUrl?: string };

    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return NextResponse.json({ error: "Image data URL is required" }, { status: 400 });
    }

    // Validate it's a data URL
    if (!imageDataUrl.startsWith("data:image/")) {
      return NextResponse.json(
        { error: "Invalid image format. Please upload a JPG, PNG, or other image file." },
        { status: 400 },
      );
    }

    // Forward the uploaded image to an external parsing webhook (n8n).
    // Use `PARSE_WEBHOOK_URL` env var when available, otherwise fall back to
    // the provided test webhook URL (use the user-provided test ID).
    const webhookUrl =
      process.env.PARSE_WEBHOOK_URL ||
      "https://n8n-service-xs54.onrender.com/webhook-test/scan-audiogram";

    try {
      const { mimeType, buffer } = parseDataUrl(imageDataUrl);
      const fileExtension = mimeType.split("/")[1] || "png";
      const formData = new FormData();
      formData.append("data", new Blob([new Uint8Array(buffer)], { type: mimeType }), `upload.${fileExtension}`);
      formData.append("mimeType", mimeType);

      const res = await fetch(webhookUrl, {
        method: "POST",
        body: formData,
      });

      const text = await res.text().catch(() => "");
      let payload: unknown = null;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch {
        payload = null;
      }

      const payloadRecord = isRecord(payload) ? payload : null;
      const upstreamMessage =
        isNoAudiogramMessage(payload) ||
        isNoAudiogramMessage(payloadRecord?.payload) ||
        isNoAudiogramMessage(payloadRecord?.error)
          ? "No audiogram provided"
          : null;

      if (upstreamMessage) {
        return NextResponse.json(
          { success: false, error: upstreamMessage, upstream: { status: res.status, payload: payloadRecord ?? payload, text } },
          { status: 422 },
        );
      }

      if (!res.ok) {
        console.error("Webhook forward non-OK", { webhookUrl, status: res.status, payload, text });
        return NextResponse.json(
          { success: false, error: `Webhook forward failed (${res.status})`, upstream: { status: res.status, payload: payloadRecord ?? payload, text } },
          { status: 502 },
        );
      }

      // Return whatever the webhook returned. If it uses a different shape,
      // consumers may need adjustment.
      return NextResponse.json({ success: true, payload: payloadRecord ?? payload ?? text }, { status: 200 });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Webhook request error", { webhookUrl, message, err });
      return NextResponse.json({ success: false, error: `Webhook request error: ${message}` }, { status: 502 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: `Server error: ${message}` }, { status: 500 });
  }
}
