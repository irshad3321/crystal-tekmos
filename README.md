# Crystal Bullion

Crystal Bullion is a React Native mobile adaptation of the [Crystal bullion website](https://crystal.tekmostechnology.com/). A customer can compare gold and silver quotes, estimate a purchase by weight and purity, save a price alert, ask Goldyy a question, or prepare a wholesale enquiry in WhatsApp.

## Frontend and backend

The Expo app uses TypeScript, React Native components and Expo Router. Its Market, Calculator, Wholesale and Alerts tabs share the selected currency and latest quotes. A shared fetch client calls the Express backend over HTTPS. Switching between grams and troy ounces uses the downloaded quote immediately. The app keeps the last successful prices if a refresh fails.

I used **MVC (Model–View–Controller) with a separate service layer** for the Express backend. React Native screens provide the view. On the server, routes dispatch requests to controllers, which call services and return JSON. Services handle pricing calculations, history, alert conditions and AI requests. For example, when the API receives a new alert, the alert controller passes it to the alert service, which checks its condition and uses the Mongoose `Alert` model to save it in MongoDB.

The Node.js API uses JavaScript ES modules and runs in Docker on EC2 behind Nginx. GoldAPI.dev supplies spot references, and Groq handles conversational requests. The mobile app stores its own alerts and preferences in AsyncStorage.

## Price calculation and assumptions

1. **Normalize the quote.** The backend reads XAU (gold) and XAG (silver) in USD. It uses a validated per-gram quote when available, or divides the troy-ounce quote by 31.1034768. It then converts the per-gram reference to AED, the internal base currency.
2. **Apply purity and spread.** For provider-backed gold, the dealer’s selling price (ask) is the 24K reference multiplied by `fineness / 999`. Crystal uses 999 for 24K, 916 for 22K, 875 for 21K and 750 for 18K. Silver 999 uses its own spot reference. The dealer’s buying price (bid) applies the configured demo buy-to-sell ratio for that metal and purity.
3. **Convert currency and weight.** The price service converts AED to the selected currency (AED, USD, OMR, SAR or INR) using simulated exchange rates and rounds the per-gram price to two decimals. The calculator converts the entered weight to grams: 11.6638 g per tola, 31.1035 g per calculator ounce and 1,000 g per kilogram. The mobile form also supports a ten-tola bar (116.638 g).
4. **Estimate the purchase.** Multiply grams by the selected ask, then add VAT if enabled. For example, using the configured **demo** 22K ask of AED 454.85/g, four grams cost AED 1,819.40. Optional 5% VAT adds AED 90.97, giving **AED 1,910.37**. The mobile calculator works directly from the displayed quote. The server calculator rounds the base, tax and total separately and accepts a custom VAT percentage.

The backend reuses spot quotes for 90 seconds and labels each row `LIVE_SPOT`, `CACHED_LIVE_SPOT` or `SIMULATED_DEMO`. A failed provider request retains the last valid quote for that metal, or falls back to configured demo prices. Exchange rates and dealer spreads remain simulated. Graph history is generated for illustration and ends at the reference ask. Country estimates exclude local duties, making charges and shop premiums. The VAT toggle is a prototype assumption. A WhatsApp enquiry requires the dealer to confirm the final price.

## Data structures and APIs

| Endpoint | Main data and purpose |
| --- | --- |
| `GET /api/health` | Reports Express reachability. |
| `GET /api/prices`, `GET /api/prices/:metal` | Accept a currency query. Each row carries metal, purity label, numeric fineness, buy and sell prices, source and quote timestamp. |
| `GET /api/prices/history` | Accepts metal, fineness (`purity`), currency and range. Returns ordered timestamp/price points with simulated-history metadata. |
| `POST /api/calculator` | Accepts metal, purity, weight, unit, currency and VAT settings. Returns grams, rate, base amount, VAT and total. |
| `GET/POST /api/alerts`, `GET/PATCH/DELETE /api/alerts/:id` | MongoDB records contain metal, purity, currency, target, above/below condition, status and timestamps. Conditions are evaluated on requests. |
| `POST /api/ai/chat` | Accepts a message and optional context; returns a reply. |

## Goldyy AI and security

Goldyy uses the price service directly for recognized country-rate and comparison questions, so its figures follow the same rules as the dashboard. For conversational questions, Express sends server-owned instructions, relevant prices and up to eight recent chat messages to Groq Chat Completions. The default model is `openai/gpt-oss-20b`, configurable with `GROQ_MODEL`. This gives users natural-language explanations while keeping quote arithmetic in testable application code.

Provider keys and MongoDB credentials stay on the backend. The app receives the public API URL. The backend validates supported inputs, bounds chat history, applies an in-memory chat rate limit and times out provider requests. Model tool calls are disabled. The prototype alert API has no authentication or record ownership; private customer alerts would require both before production use.

## Run and verify

From `mobile/`, run `npm ci`, set `EXPO_PUBLIC_API_BASE_URL` in `.env` to the backend HTTPS origin, then run `npx expo start`. Open the app in a compatible Expo Go client or press `w` for web. For a self-hosted backend, see the [server setup and deployment guide](server/README.md) and [environment example](server/.env.example).

Run `npx tsc --noEmit` and `npm run lint` in `mobile/`. In `server/`, install dependencies with `npm install` and run `node --test tests/aiCountryPrices.test.js` to check country pricing against the price service, including simulated and cached provider cases.
