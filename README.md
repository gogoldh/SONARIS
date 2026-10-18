Sonaris

Workflow-first audiogram analysis and RIZIV criteria screening

Sonaris is a decision-support project for audiology and hearing-care professionals. Its primary component is an n8n automation workflow that processes audiogram images, extracts audiometric data using AI, calculates Pure Tone Average (PTA), retrieves RIZIV criteria, and evaluates the extracted measurements against those criteria.

The web frontend is a supporting interface that allows users to submit audiograms and view the workflow's results.

Important: Sonaris is a screening and decision-support tool. Its output is not a diagnosis and does not confirm eligibility for reimbursement. Clinical decisions remain the responsibility of a qualified healthcare professional.

1. Project priorities

The project is organized around two components:

Core component: n8n workflow

The n8n workflow contains the main application logic and is the primary focus for development and maintenance.

It is responsible for:

Receiving audiogram images through a webhook.

Validating and preparing incoming data.

Using Google Gemini to analyze audiogram images.

Extracting structured audiometric threshold data.

Validating the AI-generated output.

Calculating left-ear and right-ear PTA values.

Retrieving and processing relevant RIZIV criteria.

Comparing patient measurements against implemented screening criteria.

Returning a structured JSON result to the caller.

The workflow is designed to separate AI-based image interpretation from deterministic calculations and criteria matching.

Supporting component: web frontend

The frontend is a Next.js application that provides a user interface for the workflow.

Its responsibilities include:

Accepting an audiogram image from the user.

Sending the image to the backend API.

Displaying the analysis result.

Presenting screening information and relevant disclaimers.

The frontend should not be treated as the source of truth for PTA calculations or RIZIV criteria matching. Those responsibilities belong to the backend workflow.

2. Architecture

Audiogram image
      |
      v
Next.js frontend
      |
      v
Next.js API route
      |
      v
n8n webhook
      |
      v
Input validation and preparation
      |
      v
Google Gemini image analysis
      |
      v
Structured output validation
      |
      v
PTA calculation
      |
      v
RIZIV criteria retrieval
      |
      v
Deterministic criteria matching
      |
      v
Structured JSON response
      |
      v
Frontend result display

Separation of responsibilities

AI processing: Gemini interprets the audiogram image and extracts structured measurements.

Deterministic processing: JavaScript logic validates data, calculates PTA values, and evaluates the implemented criteria.

Criteria retrieval: A separate n8n workflow retrieves and processes the relevant RIZIV criteria so that criteria updates can be handled independently of the AI extraction process.

Presentation: The frontend submits input and displays the returned results.

This separation is intended to improve maintainability, traceability, and the ability to test calculations independently of image interpretation.

3. Technology stack

Component

Technology

Workflow automation

n8n

Workflow hosting

Render

AI image analysis

Google Gemini

Frontend

Next.js

Frontend hosting

Vercel

Communication

HTTPS webhook and JSON

Criteria source

RIZIV

The exact versions, additional dependencies, and infrastructure configuration should be verified against the current deployment and repository.

4. Repository

Frontend source code:

https://github.com/gogoldh/SONARIS

The frontend repository is the starting point for inspecting and running the user interface. The n8n workflow is the primary implementation to inspect when modifying the analysis process, calculations, or criteria matching.

The current workflow export should be maintained alongside the project documentation, or in a dedicated workflow repository if the team prefers to version workflow changes separately.

5. n8n workflow

Main processing workflow

The main workflow accepts an incoming request and coordinates the analysis process.

Its logical stages are:

Webhook input: Receive the submitted audiogram.

Input validation: Check the incoming request and prepare the image for processing.

AI analysis: Send the image to Gemini to extract audiometric information.

Output validation: Validate the returned structured data before calculations.

PTA calculation: Calculate PTA values for the left and right ears using the configured frequencies.

Criteria retrieval: Obtain the relevant RIZIV criteria through the criteria-processing workflow.

Criteria matching: Compare the extracted measurements with the implemented conditions.

Response formatting: Return a structured result to the caller.

The exact node names and branching behavior should be taken from the current n8n workflow export.

Criteria-processing workflow

The criteria-processing workflow retrieves information from the relevant RIZIV source and converts it into a structure that can be processed by the main workflow.

Keeping criteria retrieval separate from the image-analysis process makes it easier to inspect and update the criteria independently.

Changes to reimbursement criteria should be verified against the official source before being deployed.

Workflow maintenance principles

Keep AI extraction separate from deterministic calculations.

Validate AI output before using it in calculations.

Handle missing, invalid, or ambiguous measurements explicitly.

Keep criteria rules understandable and independently testable.

Preserve source information and retrieval timestamps where available.

Return consistent JSON responses.

Test workflow changes before updating the production workflow.

6. Webhook and response contract

The deployed n8n webhook is currently configured at:

https://n8n-service-xs54.onrender.com/webhook/sonaris

The frontend submits the image through its Next.js API route, which forwards the request to n8n.

Successful response

The current response structure includes a top-level success indicator and a result object. The result contains fields such as:

Field

Purpose

status

Screening outcome

message

Human-readable explanation

pta.left

Left-ear PTA

pta.right

Right-ear PTA

pta.frequencies

Frequencies used in the calculation

confidence

AI analysis confidence value

flags

Items that may require additional review

criteria.authority

Criteria authority

criteria.sourceUrl

Source of the criteria

criteria.checkedAt

Criteria retrieval timestamp

requiresClinicalContext

Indicates that clinical context is required

disclaimer

Limitations of the screening result

Example response:

{
  "success": true,
  "result": {
    "status": "NO_THRESHOLD_MATCH",
    "message": "The measured PTA values do not meet the threshold categories currently checked by Sonaris.",
    "pta": {
      "left": 20,
      "right": 16.7,
      "frequencies": [500, 1000, 2000]
    },
    "confidence": 0.98,
    "flags": [],
    "criteria": {
      "authority": "RIZIV",
      "sourceUrl": "https://www.riziv.fgov.be/nl/thema-s/verzorging-kosten-en-terugbetaling/medische-hulpmiddelen-medisch-materiaal/implantaten-en-medische-hulpmiddelen/vergoeding-van-cochleaire-implantaten",
      "checkedAt": "2026-10-13T14:33:34.531Z"
    },
    "requiresClinicalContext": true,
    "disclaimer": "Decision-support screening only. This result is not a diagnosis or confirmation of reimbursement eligibility."
  }
}

This is an example of the response format, not a complete specification of every possible workflow outcome. Developers should inspect the current workflow and document all supported statuses, error responses, and required fields before changing the contract.

Important: If the response structure changes, update the frontend normalizer and its tests to match. Avoid silently changing field names or status meanings.

7. Development setup

Frontend

Prerequisites:

Node.js compatible with the project's configured Next.js version.

npm or the package manager specified by the repository.

Access to the required backend webhook.

To get started:

git clone https://github.com/gogoldh/SONARIS.git
cd SONARIS
npm install

Configure the required environment variables using the project's deployment configuration and existing environment-variable references.

The frontend uses:

PARSE_WEBHOOK_URL

This variable should contain the n8n production webhook URL when running against the production workflow.

Create a local .env.local file for local configuration. Do not commit it.

Run the development server:

npm run dev

Open http://localhost:3000 in a browser.

Check package.json for the available scripts and the exact Node.js requirements before setting up a development environment.

n8n

To work on the backend workflow:

Obtain access to the n8n instance and the relevant workflow.

Export the current workflow as JSON before making changes.

Import the workflow into a development environment where possible.

Configure the required credentials and environment-specific settings.

Test the workflow with representative audiogram inputs.

Verify the output JSON and calculations.

Deploy changes only after validation.

The workflow depends on external services and credentials, including Google Gemini and the RIZIV criteria source. These must be configured in the target environment.

8. Environment variables and credentials

The production environment uses Vercel for the frontend and Render for n8n hosting.

Configuration may include:

PARSE_WEBHOOK_URL for the frontend's backend endpoint.

Google Gemini credentials configured through n8n.

Any credentials or settings required by the criteria-retrieval workflow.

Database or persistence configuration used by the n8n deployment.

Verify the actual variable names and requirements in the current implementation before configuring another environment.

Security requirements:

Never commit API keys, passwords, tokens, or production secrets.

Do not include credential values in workflow exports or screenshots.

Use platform-managed environment variables and n8n credentials.

Restrict access to production workflows and deployments.

Avoid using real patient data in development or testing unless the environment and processing are appropriately authorized and protected.

9. Testing and validation

The workflow should be tested independently of the frontend wherever possible.

Recommended test cases:

Valid, clearly readable audiogram.

Unreadable or incomplete audiogram.

Missing or invalid image input.

Missing, malformed, or implausible extracted thresholds.

Correct PTA calculation for both ears.

Criteria match and no-match scenarios.

Missing or unavailable criteria source.

Low-confidence extraction or review flags.

Malformed AI output.

Backend timeout or external service failure.

Correct propagation of success and error responses to the frontend.

For each test, record the input, expected calculation, expected screening outcome, and actual response.

Clinical and reimbursement-related rules should be checked against authoritative requirements and reviewed by appropriately qualified people before real-world use.

10. Limitations and clinical responsibility

Sonaris depends on the quality of the uploaded image, the accuracy of AI-extracted measurements, the implemented calculation logic, and the correctness and completeness of the criteria retrieved.

A successful workflow execution does not automatically mean that the clinical interpretation or reimbursement assessment is correct.

The result must be treated as decision support only. The complete official criteria and relevant patient context must be considered by the healthcare professional.

11. Priorities for developers taking over

Review the main n8n workflow and its node-level logic.

Review the criteria-retrieval workflow and its source handling.

Verify PTA calculations and frequency selection.

Document every supported status and response field.

Add or improve automated tests for calculations and criteria matching.

Verify error handling and external service failures.

Review security, logging, privacy, and credential handling.

Confirm that the frontend correctly displays every supported workflow outcome.

Document deployment and rollback procedures.

12. Handover checklist

Access to the GitHub repository.

Current main n8n workflow exported and backed up.

Criteria-retrieval workflow exported and backed up.

Workflow credentials configured securely in the target environment.

Vercel and Render access arranged.

Local frontend setup verified.

Webhook request and response contract verified.

PTA calculations tested against known examples.

Criteria matching validated against approved test cases.

Known issues and outstanding work documented.

Project principle: The n8n workflow is the core of Sonaris. The frontend is a supporting interface. Development should prioritize reliable data extraction, transparent calculations, maintainable criteria matching, and safe handling of clinical information.