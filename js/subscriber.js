const COUPON_API =
  "https://script.google.com/macros/s/AKfycbzP9DmdaONAVA23WF21aLvm3OdEKu0BnT3wLbE-okTA-2Jlf4-JckOYWUyJ9XP4wvI/exec";

const YOUTUBE_URL =
  "https://www.youtube.com/@techblueprint-01";


document.addEventListener("DOMContentLoaded", () => {

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


  if (subscribeButton) {

    subscribeButton.addEventListener("click", () => {

      window.open(
        YOUTUBE_URL,
        "_blank"
      );

    });

  }


  if (rewardButton) {

    rewardButton.addEventListener(
      "click",
      async () => {

        const email =
          emailInput.value.trim();

        if (!email) {

          showResult(
            "Please enter your email address.",
            false
          );

          return;
        }


        rewardButton.disabled = true;

        rewardButton.textContent =
          "Generating coupon...";


        try {

          const response =
            await fetch(COUPON_API, {

              method: "POST",

              headers: {
                "Content-Type":
                  "text/plain;charset=utf-8"
              },

              body: JSON.stringify({
                action: "generate",
                email: email
              })

            });


          const data =
            await response.json();


          if (!data.success) {

            showResult(
              data.message,
              false
            );

            return;
          }


          couponBox.textContent =
            data.coupon;

          couponBox.style.display =
            "block";


          showResult(
            `You received ${data.discount}% OFF!`,
            true
          );


          localStorage.setItem(
            "moneshCoupon",
            data.coupon
          );


        } catch (error) {

          console.error(error);

          showResult(
            "Unable to connect to coupon server.",
            false
          );

        } finally {

          rewardButton.disabled = false;

          rewardButton.textContent =
            "Get My Coupon";

        }

      }
    );

  }


  function showResult(message, success) {

    if (!result) return;

    result.textContent = message;

    result.className =
      success
        ? "coupon-success"
        : "coupon-error";

  }

});
