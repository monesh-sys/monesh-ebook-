const CONFIG = {
  SHEET_NAME: "Coupons",
  COUPON_PREFIX: "TECH50",
  DISCOUNT_PERCENT: 50,
  EXPIRY_DAYS: 30
};


// ===============================
// GET REQUEST
// ===============================

function doGet(e) {

  try {

    const action =
      e && e.parameter
        ? e.parameter.action
        : "";

    if (action === "generate") {

      return jsonResponse(
        generateCoupon(
          e.parameter.email || ""
        )
      );

    }

    if (
      action === "validate" ||
      action === "validateCoupon"
    ) {

      return jsonResponse(
        validateCoupon(
          e.parameter.coupon ||
          e.parameter.code ||
          ""
        )
      );

    }

    if (
      action === "redeem" ||
      action === "redeemCoupon"
    ) {

      return jsonResponse(
        redeemCoupon(
          e.parameter.coupon ||
          e.parameter.code ||
          "",
          e.parameter.orderId || ""
        )
      );

    }

    return jsonResponse({
      success: true,
      message: "Monesh Ebooks Coupon API is running."
    });

  } catch (error) {

    return jsonResponse({
      success: false,
      message: error.message
    });

  }

}


// ===============================
// POST REQUEST
// ===============================

function doPost(e) {

  try {

    const data =
      e && e.parameter
        ? e.parameter
        : {};

    const action =
      data.action || "";

    if (action === "generate") {

      return jsonResponse(
        generateCoupon(
          data.email || ""
        )
      );

    }

    if (
      action === "validate" ||
      action === "validateCoupon"
    ) {

      return jsonResponse(
        validateCoupon(
          data.coupon ||
          data.code ||
          ""
        )
      );

    }

    if (
      action === "redeem" ||
      action === "redeemCoupon"
    ) {

      return jsonResponse(
        redeemCoupon(
          data.coupon ||
          data.code ||
          "",
          data.orderId || ""
        )
      );

    }

    return jsonResponse({
      success: false,
      message: "Invalid action."
    });

  } catch (error) {

    return jsonResponse({
      success: false,
      message: error.message
    });

  }

}


// ===============================
// CREATE SHEET
// ===============================

function setupSheets() {

  const ss =
    SpreadsheetApp.getActiveSpreadsheet();

  let sheet =
    ss.getSheetByName(
      CONFIG.SHEET_NAME
    );

  if (!sheet) {

    sheet =
      ss.insertSheet(
        CONFIG.SHEET_NAME
      );

  }

  sheet.clear();

  sheet.appendRow([
    "Email",
    "Coupon",
    "Discount",
    "Created",
    "Expires",
    "Status",
    "UsedAt",
    "OrderId"
  ]);

  sheet
    .getRange("A1:H1")
    .setFontWeight("bold");

  return "Coupon sheet created successfully.";

}


// ===============================
// GENERATE COUPON
// ===============================

function generateCoupon(email) {

  email =
    String(email || "")
      .trim()
      .toLowerCase();


  if (!isValidEmail(email)) {

    return {
      success: false,
      message:
        "Please enter a valid email address."
    };

  }


  const ss =
    SpreadsheetApp.getActiveSpreadsheet();

  const sheet =
    ss.getSheetByName(
      CONFIG.SHEET_NAME
    );


  if (!sheet) {

    return {
      success: false,
      message:
        "Coupons sheet is missing. Run setupSheets() first."
    };

  }


  const lock =
    LockService.getScriptLock();

  lock.waitLock(10000);


  try {

    const rows =
      sheet
        .getDataRange()
        .getValues();


    // Check existing email

    for (
      let i = 1;
      i < rows.length;
      i++
    ) {

      const existingEmail =
        String(rows[i][0] || "")
          .trim()
          .toLowerCase();


      if (
        existingEmail === email
      ) {

        const status =
          String(rows[i][5] || "");


        if (status === "USED") {

          return {
            success: false,
            message:
              "This email has already used its coupon."
          };

        }


        return {

          success: true,

          existing: true,

          coupon:
            String(rows[i][1]),

          discount:
            Number(rows[i][2]),

          message:
            "You already received your coupon."

        };

      }

    }


    // Create new coupon

    const coupon =
      createCoupon();


    const created =
      new Date();


    const expires =
      new Date(created);


    expires.setDate(
      expires.getDate() +
      CONFIG.EXPIRY_DAYS
    );


    sheet.appendRow([

      email,

      coupon,

      CONFIG.DISCOUNT_PERCENT,

      created,

      expires,

      "UNUSED",

      "",

      ""

    ]);


    return {

      success: true,

      existing: false,

      coupon: coupon,

      discount:
        CONFIG.DISCOUNT_PERCENT,

      expires:
        expires.toISOString(),

      message:
        "Coupon created successfully!"

    };


  } finally {

    lock.releaseLock();

  }

}


// ===============================
// VALIDATE COUPON
// ===============================

function validateCoupon(coupon) {

  coupon =
    normalizeCoupon(coupon);


  if (!coupon) {

    return {

      success: false,

      valid: false,

      message:
        "Enter a coupon code."

    };

  }


  const sheet =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(
        CONFIG.SHEET_NAME
      );


  if (!sheet) {

    return {

      success: false,

      valid: false,

      message:
        "Coupons sheet not found."

    };

  }


  const rows =
    sheet
      .getDataRange()
      .getValues();


  for (
    let i = 1;
    i < rows.length;
    i++
  ) {

    const code =
      normalizeCoupon(
        rows[i][1]
      );


    if (code === coupon) {

      const status =
        String(
          rows[i][5] || ""
        );


      if (status === "USED") {

        return {

          success: true,

          valid: false,

          message:
            "This coupon has already been used."

        };

      }


      const expires =
        rows[i][4]
          ? new Date(rows[i][4])
          : null;


      if (
        expires &&
        new Date() > expires
      ) {

        sheet
          .getRange(i + 1, 6)
          .setValue("EXPIRED");


        return {

          success: true,

          valid: false,

          message:
            "This coupon has expired."

        };

      }


      return {

        success: true,

        valid: true,

        coupon: coupon,

        code: coupon,

        discount:
          Number(rows[i][2]),

        message:
          "Coupon is valid."

      };

    }

  }


  return {

    success: true,

    valid: false,

    message:
      "Invalid coupon."

  };

}


// ===============================
// REDEEM COUPON
// ===============================

function redeemCoupon(
  coupon,
  orderId
) {

  coupon =
    normalizeCoupon(coupon);


  if (!coupon) {

    return {

      success: false,

      redeemed: false,

      message:
        "Coupon code is required."

    };

  }


  const lock =
    LockService.getScriptLock();

  lock.waitLock(10000);


  try {

    const sheet =
      SpreadsheetApp
        .getActiveSpreadsheet()
        .getSheetByName(
          CONFIG.SHEET_NAME
        );


    if (!sheet) {

      return {

        success: false,

        redeemed: false,

        message:
          "Coupons sheet not found."

      };

    }


    const rows =
      sheet
        .getDataRange()
        .getValues();


    for (
      let i = 1;
      i < rows.length;
      i++
    ) {

      const code =
        normalizeCoupon(
          rows[i][1]
        );


      if (code === coupon) {

        const status =
          String(
            rows[i][5] || ""
          );


        if (status === "USED") {

          return {

            success: false,

            redeemed: false,

            message:
              "Coupon has already been used."

          };

        }


        const expires =
          rows[i][4]
            ? new Date(rows[i][4])
            : null;


        if (
          expires &&
          new Date() > expires
        ) {

          sheet
            .getRange(i + 1, 6)
            .setValue("EXPIRED");


          return {

            success: false,

            redeemed: false,

            message:
              "Coupon has expired."

          };

        }


        // Mark as USED

        sheet
          .getRange(i + 1, 6)
          .setValue("USED");


        sheet
          .getRange(i + 1, 7)
          .setValue(new Date());


        sheet
          .getRange(i + 1, 8)
          .setValue(
            orderId || ""
          );


        return {

          success: true,

          redeemed: true,

          coupon: coupon,

          discount:
            Number(rows[i][2]),

          message:
            "Coupon redeemed successfully."

        };

      }

    }


    return {

      success: false,

      redeemed: false,

      message:
        "Invalid coupon."

    };


  } finally {

    lock.releaseLock();

  }

}


// ===============================
// CREATE UNIQUE COUPON
// ===============================

function createCoupon() {

  const random =
    Utilities
      .getUuid()
      .replace(/-/g, "")
      .substring(0, 8)
      .toUpperCase();


  return (
    CONFIG.COUPON_PREFIX +
    "-" +
    random
  );

}


// ===============================
// NORMALIZE
// ===============================

function normalizeCoupon(code) {

  return String(
    code || ""
  )
    .trim()
    .toUpperCase();

}


// ===============================
// EMAIL VALIDATION
// ===============================

function isValidEmail(email) {

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    .test(email);

}


// ===============================
// JSON RESPONSE
// ===============================

function jsonResponse(data) {

  return ContentService

    .createTextOutput(
      JSON.stringify(data)
    )

    .setMimeType(
      ContentService.MimeType.JSON
    );

}
