# Crystal Bullion backend

This Express backend provides simulated bullion prices, currency conversions, a calculator, price history, persistent price alerts, and the Goldyy chat endpoint. Prices and exchange rates are **demo data**, not live market information. No trading or payments are supported.

## Goldyy

`POST /api/ai/chat` accepts a question and optional limited context. The route and controller call `aiService`, which validates the request, adds relevant simulated prices from the existing price service, and calls [Groq Chat Completions](https://console.groq.com/docs/api-reference). The server keeps the API key private. Chat history remains in the mobile screen session; no AI conversation is stored in MongoDB.

The implementation uses Node.js 22's built-in `fetch`, so it needs no additional SDK package. The default model is Groq's production `openai/gpt-oss-20b` model. The model ID names the open-weight model; requests go to Groq, not the OpenAI API. You can select another supported Groq chat model with `GROQ_MODEL`.

## Setup

1. Use Node.js 22 or newer. Run `npm install` in `server/` if dependencies are not installed.
2. Add the following to the ignored `server/.env` file, preserving existing settings such as `MONGO_URI`:

   ```dotenv
   AI_PROVIDER=groq
   GROQ_MODEL=openai/gpt-oss-20b
   AI_TIMEOUT_MS=25000
   GROQ_API_KEY=your_private_groq_api_key_here
   ```

3. Run `npm run dev` or `npm start` from `server/`.
4. In `mobile/.env`, keep `EXPO_PUBLIC_API_BASE_URL` set to your reachable backend URL, for example `http://<LAN_IP>:5000`. Restart Expo after changing it and run `npx expo start` from `mobile/`.

The AI endpoint returns `503` until a valid server-side API key is configured. It does not fall back to preset replies.

## Test

With the backend running, send a request from PowerShell:

```powershell
Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:5000/api/ai/chat' -ContentType 'application/json' -Body '{"message":"Explain the difference between 24K and 22K gold","context":{}}'
```

A successful response is `{ "success": true, "reply": "..." }`. Empty or oversized messages return `400`; request limits return `429`; unavailable provider services return a safe error response. Live AI replies require network access, a valid key, and provider availability. AI answers can be mistaken, and application prices supplied to the model are simulated.
