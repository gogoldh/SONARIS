import { NextResponse } from "next/server";

// Server endpoint that forwards an image data URL to Roboflow detect API
// Requires these environment variables to be set:
// - ROBOFLOW_API_KEY
// - ROBOFLOW_MODEL (example: "your-project/1")

export async function POST(request: Request) {
  try {
    const { imageDataUrl } = (await request.json()) as { imageDataUrl?: string };

    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return NextResponse.json({ error: "imageDataUrl is required" }, { status: 400 });
    }

    const apiKey = process.env.ROBOFLOW_API_KEY;
    const model = process.env.ROBOFLOW_MODEL;

    if (!apiKey || !model) {
      return NextResponse.json(
        { error: "Roboflow not configured. Set ROBOFLOW_API_KEY and ROBOFLOW_MODEL in env." },
        { status: 500 },
      );
    }

    // Roboflow detect endpoint; this uses the hosted infer endpoint which accepts an image field
    // Note: If your Roboflow subscription provides a different endpoint, update accordingly.
    const endpoint = `https://detect.roboflow.com/${encodeURIComponent(model)}?api_key=${encodeURIComponent(apiKey)}`;

    const form = new FormData();
    // Roboflow accepts multipart form 'image' with either a URL or raw file; we send the data URL
    form.append("image", imageDataUrl);

    const res = await fetch(endpoint, {
      method: "POST",
      body: form as any,
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Roboflow inference failed: ${res.status} ${text}` }, { status: 502 });
    }

    const payload = await res.json();

    // Payload typically contains `predictions` array with {x, y, width, height, confidence, class}
    return NextResponse.json({ success: true, payload }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Server error: ${message}` }, { status: 500 });
  }
}
