/*
  Monesh Ebooks — Tech Blueprint subscriber reward
  IMPORTANT: replace GOOGLE_CLIENT_ID and APPS_SCRIPT_URL before publishing.
*/
const SUBSCRIBER_CONFIG = {
  ...window.MONESH_REWARD_CONFIG,
  YOUTUBE_CHANNEL_HANDLE: "@techblueprint-01"
};

const verifyButton = document.getElementById("verifyButton");
const statusBox = document.getElementById("status");
const couponBox = document.getElementById("couponBox");
const couponCode = document.getElementById("couponCode");
const couponDiscount = document.getElementById("couponDiscount");
const copyButton = document.getElementById("copyButton");

let tokenClient = null;

function setStatus(message, type="") {
  statusBox.className = "reward-status" + (type ? " " + type : "");
  statusBox.textContent = message;
}

function configurationReady() {
  return !SUBSCRIBER_CONFIG.GOOGLE_CLIENT_ID.startsWith("YOUR_") &&
         !SUBSCRIBER_CONFIG.APPS_SCRIPT_URL.startsWith("YOUR_");
}

function startVerification() {
  if (!configurationReady()) {
    setStatus("Setup is not finished yet. Add your Google OAuth Client ID and Apps Script Web App URL in js/subscriber.js.", "error");
    return;
  }

  if (!window.google || !google.accounts || !google.accounts.oauth2) {
    setStatus("Google Sign-In is still loading. Please wait a moment and try again.", "error");
    return;
  }

  if (!tokenClient) {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: SUBSCRIBER_CONFIG.GOOGLE_CLIENT_ID,
      scope: "https://www.googleapis.com/auth/youtube.readonly",
      callback: async (tokenResponse) => {
        if (tokenResponse.error) {
          setStatus("Google authorization was not completed.", "error");
          verifyButton.disabled = false;
          return;
        }
        await verifySubscription(tokenResponse.access_token);
      }
    });
  }

  verifyButton.disabled = true;
  setStatus("Google will ask for permission to view your YouTube account. No password is shared with Monesh Ebooks.");
  tokenClient.requestAccessToken({prompt: ""});
}

async function verifySubscription(accessToken) {
  try {
    setStatus("Checking your Tech Blueprint subscription…");

    const body = new URLSearchParams({
      action: "verifySubscriber",
      accessToken
    });

    const response = await fetch(SUBSCRIBER_CONFIG.APPS_SCRIPT_URL, {
      method: "POST",
      body
    });

    const data = await response.json();

    if (!data.success) {
      setStatus(data.message || "Subscription could not be verified.", "error");
      verifyButton.disabled = false;
      return;
    }

    couponCode.textContent = data.coupon.code;
    couponDiscount.textContent = `${data.coupon.discount}% off — one-time use`;
    couponBox.style.display = "block";
    setStatus("Subscription verified ✓ Your unique coupon is ready.", "success");

    // Store only the coupon code locally for convenience. The server remains the source of truth.
    localStorage.setItem("moneshSubscriberCoupon", data.coupon.code);
    localStorage.setItem("moneshSubscriberCouponDiscount", String(data.coupon.discount));

    verifyButton.disabled = true;
  } catch (error) {
    console.error(error);
    setStatus("Could not contact the reward server. Check your Apps Script URL and deployment.", "error");
    verifyButton.disabled = false;
  }
}

copyButton.addEventListener("click", async () => {
  const code = couponCode.textContent.trim();
  if (!code || code === "—") return;
  try {
    await navigator.clipboard.writeText(code);
    copyButton.textContent = "Copied ✓";
    setTimeout(() => copyButton.textContent = "Copy Coupon", 1500);
  } catch {
    setStatus("Copy failed. Select the coupon code and copy it manually.", "error");
  }
});

verifyButton.addEventListener("click", startVerification);
