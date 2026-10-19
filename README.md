# Maya Checkout Studio

Small client-server app that creates [PayMongo Checkout Sessions](https://docs.paymongo.com/reference/create_checkout_sessions).

- `server.js` – dependency-free Node server. `POST /api/checkout` validates the cart, calls PayMongo with the secret key (Basic auth), and returns the `checkout_url`. The secret key never reaches the browser.
- `public/` – browser client: build a cart, click Pay, get redirected to PayMongo's hosted checkout. `success.html` / `cancel.html` are the redirect targets.

## Run

```sh
cp .env.example .env   # then set PAYMONGO_SECRET_KEY (sk_test_... for test mode)
npm start              # requires Node >= 20.6
```

Open http://localhost:3000. In test mode use PayMongo's test card `4343 4343 4343 4345`.

Amounts are entered in pesos and converted to centavos; PayMongo's minimum per line item is PHP 20.00. `.env` is gitignored.
