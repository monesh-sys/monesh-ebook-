/*******************************************************
 * MONESH EBOOKS — TECH BLUEPRINT SUBSCRIBER REWARD
 *
 * Google Apps Script + Google Sheets backend.
 *
 * BEFORE DEPLOYING:
 * 1. Create a Google Sheet.
 * 2. Open Extensions → Apps Script.
 * 3. Paste this entire file.
 * 4. Change CONFIG values.
 * 5. Run setupSheets() once and authorize it.
 * 6. Deploy as Web app:
 *      Execute as: Me
 *      Who has access: Anyone
 * 7. Put the Web App URL into js/subscriber.js.
 *
 * The browser sends a temporary YouTube OAuth access token.
 * This script uses it only to verify the user's own account.
 *******************************************************/

const CONFIG = {
  // Your Tech Blueprint channel handle.
  CHANNEL_HANDLE: "@techblueprint-01",

  // Create a YouTube Data API key in Google Cloud and paste it here.
  // Restrict the key to YouTube Data API v3 if possible.
  YOUTUBE_API_KEY: "YOUR_YOUTUBE_DATA_API_KEY",

  // How much discount each verified subscriber receives.
  DISCOUNT_PERCENT: 50,

  // Coupon validity in days. Set 0 for no expiry.
  COUPON_VALID_DAYS: 30,

  // Coupon prefix shown to customers.
  COUPON_PREFIX: "TECH50",

  // Sheet names.
  SUBSCRIBERS_SHEET: "Subscribers",
  COUPONS_SHEET: "Coupons"
};

function doGet() {
  return json_({
    success: true,
    service: "Monesh Ebooks Subscriber Reward",
    message: "Service is running."
  });
}

function doPost(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    const action = params.action || "";

    if (action === "verifySubscriber") {
      return json_(verifySubscriber_(params.accessToken || ""));
    }

    if (action === "validateCoupon") {
      return json_(validateCoupon_(params.code || ""));
    }

    if (action === "redeemCoupon") {
      return json_(redeemCoupon_(params.code || "", params.orderId || ""));
    }

    return json_({ success: false, message: "Unknown action." });
  } catch (error) {
    console.error(error);
    return json_({ success: false, message: "Server error: " + error.message });
  }
}

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let subscribers = ss.getSheetByName(CONFIG.SUBSCRIBERS_SHEET);
  if (!subscribers) subscribers = ss.insertSheet(CONFIG.SUBSCRIBERS_SHEET);
  subscribers.clear();
  subscribers.appendRow([
    "CreatedAt", "YouTubeChannelId", "SubscriptionId",
    "CouponCode", "Status"
  ]);

  let coupons = ss.getSheetByName(CONFIG.COUPONS_SHEET);
  if (!coupons) coupons = ss.insertSheet(CONFIG.COUPONS_SHEET);
  coupons.clear();
  coupons.appendRow([
    "CreatedAt", "CouponCode", "YouTubeChannelId",
    "DiscountPercent", "ExpiresAt", "Status",
    "UsedAt", "OrderId"
  ]);
}

function verifySubscriber_(accessToken) {
  if (!accessToken) {
    return { success: false, message: "Missing YouTube authorization token." };
  }

  // Get the authenticated user's own YouTube channel.
  const mine = youtubeGet_(
    "https://www.googleapis.com/youtube/v3/channels" +
    "?part=id&mine=true",
    accessToken
  );

  if (!mine.items || !mine.items.length) {
    return {
      success: false,
      message: "This Google account does not have a YouTube channel. Please use a Google/YouTube account that can subscribe."
    };
  }

  const userChannelId = mine.items[0].id;

  // Resolve Tech Blueprint's current channel ID from the handle.
  // channels.list supports forHandle, so no hard-coded channel ID is required.
  const target = youtubeGet_(
    "https://www.googleapis.com/youtube/v3/channels" +
    "?part=id&forHandle=" + encodeURIComponent(CONFIG.CHANNEL_HANDLE),
    null
  );

  if (!target.items || !target.items.length) {
    return { success: false, message: "Tech Blueprint channel could not be resolved." };
  }

  const targetChannelId = target.items[0].id;

  // Check the authenticated user's subscriptions.
  const subs = youtubeGet_(
    "https://www.googleapis.com/youtube/v3/subscriptions" +
    "?part=id,snippet&mine=true&forChannelId=" +
    encodeURIComponent(targetChannelId) +
    "&maxResults=1",
    accessToken
  );

  const subscribed = !!(subs.items && subs.items.length);

  if (!subscribed) {
    return {
      success: false,
      message: "Subscription not found. Subscribe to Tech Blueprint first, then try Verify again."
    };
  }

  const subscriptionId = subs.items[0].id;
  const result = createOrReturnCoupon_(userChannelId, subscriptionId);

  return {
    success: true,
    message: "Subscription verified.",
    coupon: result
  };
}

function createOrReturnCoupon_(userChannelId, subscriptionId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const subscribers = ss.getSheetByName(CONFIG.SUBSCRIBERS_SHEET);
  const coupons = ss.getSheetByName(CONFIG.COUPONS_SHEET);

  if (!subscribers || !coupons) {
    throw new Error("Sheets are not initialized. Run setupSheets() first.");
  }

  // Prevent duplicate rewards for the same YouTube channel identity.
  const subscriberRows = subscribers.getDataRange().getValues();
  for (let i = 1; i < subscriberRows.length; i++) {
    if (String(subscriberRows[i][1]) === String(userChannelId)) {
      const existingCode = String(subscriberRows[i][3] || "");
      const coupon = findCoupon_(coupons, existingCode);
      if (coupon && coupon.status !== "USED") {
        return coupon;
      }
    }
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    // Re-check after acquiring the lock.
    const rows = subscribers.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][1]) === String(userChannelId)) {
        const existing = findCoupon_(coupons, String(rows[i][3] || ""));
        if (existing && existing.status !== "USED") return existing;
      }
    }

    const now = new Date();
    const expiresAt = CONFIG.COUPON_VALID_DAYS > 0
      ? new Date(now.getTime() + CONFIG.COUPON_VALID_DAYS * 86400000)
      : "";

    const code = generateUniqueCoupon_(coupons);

    subscribers.appendRow([
      now, userChannelId, subscriptionId, code, "ACTIVE"
    ]);

    coupons.appendRow([
      now,
      code,
      userChannelId,
      CONFIG.DISCOUNT_PERCENT,
      expiresAt,
      "UNUSED",
      "",
      ""
    ]);

    return {
      code,
      discount: CONFIG.DISCOUNT_PERCENT,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      status: "UNUSED"
    };
  } finally {
    lock.releaseLock();
  }
}

function validateCoupon_(rawCode) {
  const code = normalizeCode_(rawCode);
  if (!code) return { success: false, valid: false, message: "Enter a coupon code." };

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.COUPONS_SHEET);
  if (!sheet) throw new Error("Coupons sheet not found.");

  const coupon = findCoupon_(sheet, code);
  if (!coupon) return { success: true, valid: false, message: "Coupon not found." };

  if (coupon.status === "USED") {
    return { success: true, valid: false, message: "This coupon has already been used." };
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
    markExpired_(sheet, coupon.row);
    return { success: true, valid: false, message: "This coupon has expired." };
  }

  return {
    success: true,
    valid: true,
    discount: coupon.discount,
    code: coupon.code,
    expiresAt: coupon.expiresAt || null
  };
}

function redeemCoupon_(rawCode, orderId) {
  const code = normalizeCode_(rawCode);
  if (!code || !orderId) {
    return { success: false, redeemed: false, message: "Coupon code and order ID are required." };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.COUPONS_SHEET);
    if (!sheet) throw new Error("Coupons sheet not found.");

    const coupon = findCoupon_(sheet, code);
    if (!coupon) return { success: true, redeemed: false, message: "Coupon not found." };

    if (coupon.status === "USED") {
      return { success: true, redeemed: false, message: "Coupon already used." };
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
      markExpired_(sheet, coupon.row);
      return { success: true, redeemed: false, message: "Coupon expired." };
    }

    // Column indexes: G=UsedAt, H=OrderId, F=Status.
    sheet.getRange(coupon.row, 6).setValue("USED");
    sheet.getRange(coupon.row, 7).setValue(new Date());
    sheet.getRange(coupon.row, 8).setValue(orderId);

    return {
      success: true,
      redeemed: true,
      code: coupon.code,
      discount: coupon.discount,
      message: "Coupon redeemed successfully."
    };
  } finally {
    lock.releaseLock();
  }
}

function findCoupon_(sheet, code) {
  if (!code) return null;
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (normalizeCode_(rows[i][1]) === code) {
      return {
        row: i + 1,
        code: String(rows[i][1]),
        discount: Number(rows[i][3]) || 0,
        expiresAt: rows[i][4] ? new Date(rows[i][4]).toISOString() : null,
        status: String(rows[i][5] || "UNUSED")
      };
    }
  }
  return null;
}

function markExpired_(sheet, row) {
  sheet.getRange(row, 6).setValue("EXPIRED");
}

function generateUniqueCoupon_(sheet) {
  let code;
  do {
    code = CONFIG.COUPON_PREFIX + "-" + randomPart_();
  } while (findCoupon_(sheet, code));
  return code;
}

function randomPart_() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function normalizeCode_(code) {
  return String(code || "").trim().toUpperCase();
}

function youtubeGet_(url, accessToken) {
  // Public channel lookup uses the API key.
  // User-specific subscription lookup uses the OAuth Bearer token.
  if (!accessToken) {
    if (!CONFIG.YOUTUBE_API_KEY || CONFIG.YOUTUBE_API_KEY.startsWith("YOUR_")) {
      throw new Error("YouTube Data API key is not configured.");
    }
    url += (url.indexOf("?") >= 0 ? "&" : "?") +
      "key=" + encodeURIComponent(CONFIG.YOUTUBE_API_KEY);
  }

  const options = {
    method: "get",
    muteHttpExceptions: true,
    headers: accessToken ? { Authorization: "Bearer " + accessToken } : {}
  };

  const response = UrlFetchApp.fetch(url, options);
  const status = response.getResponseCode();
  const text = response.getContentText();

  if (status < 200 || status >= 300) {
    let message = "YouTube API request failed.";
    try {
      const error = JSON.parse(text);
      message = error.error && error.error.message ? error.error.message : message;
    } catch (_) {}
    throw new Error(message);
  }

  return JSON.parse(text);
}

function json_(object) {
  return ContentService
    .createTextOutput(JSON.stringify(object))
    .setMimeType(ContentService.MimeType.JSON);
}
