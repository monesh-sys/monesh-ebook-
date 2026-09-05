const COUPON_API =
  "https://script.google.com/macros/s/AKfycbyM-BtpyoxPTmXaKWFa85BN4x2gDcK5abzxWeR0MRGLXkwr07yvSY1FWwJ6_cPWLS0/exec";

const YOUTUBE_URL =
  "https://www.youtube.com/@techblueprint-01";

const subscribeButton =
  document.getElementById("subscribeYoutube");

const rewardButton =
  document.getElementById("getCoupon");

const emailInput =
  document.getElementById("subscriberEmail");

const result =
  document.getElementById("couponResult");

const couponBox =
  document.getElementById("couponBox");


function showResult(message, success = false) {

  if (!result) return;

  result.textContent = message;

  result.className =
    success
      ? "coupon-success"
      : "coupon-error";
}


if (subscribeButton) {

  subscribeButton.addEventListener("click", () => {

    window.open(
      YOUTUBE_URL,
      "_blank",
      "noopener,noreferrer"
    );

  });

}


if (rewardButton) {

  rewardButton.addEventListener("click", async () => {

    const email =
      emailInput.value.trim();

    if (!email) {

      showResult(
        "Please enter your email address."
      );

      emailInput.focus();

      return;
    }


    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {

      showResult(
        "Please enter a valid email address."
      );

      return;
    }


    if (
      !COUPON_API ||
      COUPON_API.includes("PASTE_YOUR")
    ) {

      showResult(
        "Apps Script URL has not been added yet."
      );

      return;
    }


    rewardButton.disabled = true;

    rewardButton.textContent =
      "Generating...";


    try {

      const url =
        COUPON_API +
        "?action=generate&email=" +
        encodeURIComponent(email);


      const response =
        await fetch(url);


      if (!response.ok) {

        throw new Error(
          "Server returned " +
          response.status
        );

      }


      const data =
        await response.json();


      if (!data.success) {

        showResult(
          data.message ||
          "Could not generate coupon."
        );

        return;
      }


      couponBox.textContent =
        data.coupon;

      couponBox.style.display =
        "block";


      showResult(
        `${data.discount}% OFF coupon created successfully!`,
        true
      );


      localStorage.setItem(
        "moneshCoupon",
        data.coupon
      );


    } catch (error) {

      console.error(
        "Coupon error:",
        error
      );

      showResult(
        "Could not connect to the coupon server. Check your Apps Script deployment and URL."
      );

    } finally {

      rewardButton.disabled = false;

      rewardButton.textContent =
        "Get My Coupon";

    }

  });

}
