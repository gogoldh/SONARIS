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

function containsNoAudiogram(value: unknown, depth = 0): boolean {
  if (depth > 6) return false;
  if (isNoAudiogramMessage(value)) return true;
  if (Array.isArray(value)) {
    for (const item of value) {
      if (containsNoAudiogram(item, depth + 1)) return true;
    }
    return false;
  }
  if (value && typeof value === "object") {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      try {
        if (containsNoAudiogram((value as Record<string, unknown>)[key], depth + 1)) return true;
      } catch {
        // ignore
      }
    }
  }
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function toRecordId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && value.trim() !== "") {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.trunc(numeric) : null;
  }

  return null;
}

function extractRecordIdFromPayload(payload: unknown): number | null {
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const recordId = extractRecordIdFromPayload(item);
      if (recordId !== null) {
        return recordId;
      }
    }

    return null;
  }

  if (typeof payload === "string") {
    const trimmed = payload.trim();
    if (!trimmed) {
      return null;
    }

    try {
      return extractRecordIdFromPayload(JSON.parse(trimmed));
    } catch {
      return null;
    }
  }

  if (!isRecord(payload)) {
    return null;
  }

  const directId = toRecordId(payload.id);
  if (directId !== null) {
    return directId;
  }

  const candidates = [payload.payload, payload.result, payload.analysis, payload.data];
  for (const candidate of candidates) {
    const recordId = extractRecordIdFromPayload(candidate);
    if (recordId !== null) {
      return recordId;
    }
  }

  return null;
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
      "https://n8n-service-xs54.onrender.com/webhook/scan-audiogram";

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
      const upstreamMessage = containsNoAudiogram(payload) || containsNoAudiogram(payloadRecord?.payload) || containsNoAudiogram(payloadRecord?.error)
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

      const responsePayload = payloadRecord ?? payload ?? text;
      const recordId = extractRecordIdFromPayload(responsePayload);

      if (!recordId) {
        console.error("Webhook returned no record id", { webhookUrl, payload: responsePayload, text });
        return NextResponse.json(
          { success: false, error: "N8N returned no record id." },
          { status: 502 },
        );
      }

      return NextResponse.json({ success: true, id: recordId }, { status: 200 });
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
