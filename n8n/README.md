# n8n workflows for SONARIS

This folder contains a starter n8n workflow you can import and adapt: `analyze-reworked.json`.

Quick import
- Open your n8n instance and go to Workflows → Import → Paste JSON → Import.

Required configuration
- Provide these secrets/credentials in n8n Credentials or Static Data before enabling the workflow:
  - `LLM_API_KEY` — your LLM API key (Qwen/Gemini/other)
  - `LLM_URL` — model endpoint URL if not using the default placeholder
  - AWS S3 credentials (set as n8n AWS credentials or env vars): `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET`, `AWS_REGION`

How it works (template)
- Incoming POST to `/webhook/analyze-reworked` with JSON payload (must include `image_url` or `url`) → `Webhook` node
- `Download Image` fetches the image and stores it as binary on the workflow
- `Upload to S3` uploads the binary to your configured S3 bucket and sets `s3_url` on the item
- `Build LLM Payload` creates a prompt referencing the uploaded `s3_url`
- `LLM Analyze` calls your LLM endpoint with the prompt (uses `LLM_API_KEY`)
- `Postgres Insert` stores the analysis JSON into the `analysis_results` table
- `Set Response` returns the processed JSON payload to the caller

Example curl (replace domain and secret):
```
curl -X POST https://n8n.example.com/webhook/analyze-reworked \
  -H "Content-Type: application/json" \
  -d '{"image_url":"https://example.com/image.jpg"}'
```

Example using the provided hosted webhook URL:
```
curl -X POST https://n8n-service-xs54.onrender.com/webhook-test/f566dca1-1e70-46fd-a589-92acc25939d3 \
  -H "Content-Type: application/json" \
  -d '{"image_url":"https://example.com/image.jpg"}'
```

Notes & next steps
- This is a template to adapt to your data schema and LLM provider.
- Create a Postgres credential in n8n and ensure the `analysis_results` table exists with columns `(id serial primary key, s3_url text, result_json jsonb, created_at timestamptz default now())`.
- Add `LLM_API_KEY`, `LLM_URL`, `S3_BUCKET`, `AWS_REGION`, and AWS credentials as n8n static data or credentials before powering the workflow.
- Add a HMAC or header-based secret check in the `Webhook` node for security (recommended).
- I can also update your Next.js API routes to call this webhook securely and poll for results.
