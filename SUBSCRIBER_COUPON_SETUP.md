# Monesh Ebooks — Tech Blueprint Subscriber Coupon

This update adds a subscriber reward flow to the existing static Monesh Ebooks website.

## What it does

1. Customer opens `subscriber.html`.
2. Customer subscribes to Tech Blueprint: https://www.youtube.com/@techblueprint-01
3. Customer clicks **Verify Subscription**.
4. Google OAuth grants the site a YouTube read-only token.
5. Google Apps Script checks the authenticated user's YouTube subscriptions.
6. If subscribed, Google Sheets stores the user's YouTube channel ID and a unique coupon.
7. The customer applies the coupon at checkout.
8. The server marks the coupon `USED` when the payment reference is submitted.

The coupon backend uses Google Sheets and Apps Script. The website itself remains GitHub Pages-compatible.

## IMPORTANT: configure these before publishing

### A. Google Cloud

Create a Google Cloud project.

Enable:
- YouTube Data API v3

Create an OAuth 2.0 Client ID for a **Web application**.

Authorized JavaScript origin:
- `https://monesh-sys.github.io`

For local testing you can also add:
- `http://localhost`
- your exact local development origin if applicable

OAuth scope used by the website:
- `https://www.googleapis.com/auth/youtube.readonly`

Google may require OAuth app verification for public apps using sensitive scopes. During testing, add your test accounts to the OAuth consent screen's test users as appropriate.

Also create a YouTube Data API key for public channel lookup.

### B. Google Sheet + Apps Script

1. Create a Google Sheet.
2. Open **Extensions → Apps Script**.
3. Copy `Code.gs` from this project into Apps Script.
4. In `CONFIG`, set:

```text
YOUTUBE_API_KEY = your YouTube Data API key
DISCOUNT_PERCENT = 50
COUPON_VALID_DAYS = 30
```

5. Save.
6. Run `setupSheets()` once from the Apps Script editor and approve the requested permissions.
7. Deploy → New deployment → Web app.
8. Execute as: **Me**
9. Who has access: **Anyone**
10. Copy the Web app URL.

### C. Website configuration

Open:

`js/rewards-config.js`

Replace:

```js
GOOGLE_CLIENT_ID: "YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com",
APPS_SCRIPT_URL: "YOUR_APPS_SCRIPT_WEB_APP_URL",
```

with your real values.

Do NOT put the YouTube API key or an OAuth client secret into website JavaScript.

### D. Test

Open:

`subscriber.html`

Subscribe to Tech Blueprint and click **Verify Subscription**.

A successful result should show a coupon like:

`TECH50-ABCD1234`

Then open the cart, apply the coupon, and continue to checkout.

## Google Sheet columns

### Subscribers

- CreatedAt
- YouTubeChannelId
- SubscriptionId
- CouponCode
- Status

### Coupons

- CreatedAt
- CouponCode
- YouTubeChannelId
- DiscountPercent
- ExpiresAt
- Status
- UsedAt
- OrderId

## Security note

The current Monesh Ebooks checkout is a client-side/demo UPI flow. This integration prevents the same coupon from being redeemed twice on the Apps Script backend, but a static GitHub Pages checkout cannot by itself guarantee that the customer actually paid the displayed amount.

For production payments, the payment/order server should calculate the final amount and verify the payment before granting the ebook. Do not rely on a browser-calculated amount as the final source of truth.

## Files added/changed

- `subscriber.html`
- `js/subscriber.js`
- `js/rewards-config.js`
- `Code.gs`
- `index.html`
- `cart.html`
- `payment.html`
- `css/style.css`
