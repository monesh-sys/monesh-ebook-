/*******************************************************
 * MONESH EBOOKS - COUPON API
 * Tech Blueprint Reward System
 *******************************************************/

const CONFIG = {
  SHEET_NAME: "Coupons",

  COUPON_PREFIX: "TECH50",

  DISCOUNT_PERCENT: 50,

  EXPIRY_DAYS: 30
};


/*******************************************************
 * GET REQUEST
 *******************************************************/

function doGet(e) {

  const p = e && e.parameter ? e.parameter : {};

  const action = String(p.action || "").trim();

  let data;


  try {

    if (action === "generate") {

      data = generateCoupon_(p.email);

    }

    else if (
      action === "validate" ||
      action === "validateCoupon"
    ) {

      data = validateCoupon_(p.coupon);

    }

    else if (
      action === "redeem" ||
      action === "redeemCoupon"
    ) {

      data = redeemCoupon_(
        p.coupon,
        p.orderId || ""
      );

    }

    else {

      data = {
        success: true,
        message: "Monesh Ebooks Coupon API is running."
      };

    }

  }

  catch (error) {

    data = {
      success: false,
      message: error.message || "Server error."
    };

  }


  return response_(data, p.callback);

}


/*******************************************************
 * POST REQUEST
 *******************************************************/

function doPost(e) {

  let p = {};

  try {

    if (e && e.postData && e.postData.contents) {

      const content =
        e.postData.contents.trim();

      if (content) {

        try {

          p = JSON.parse(content);

        }

        catch (jsonError) {

          p = e.parameter || {};

        }

      }

    }

    else {

      p = e.parameter || {};

    }

  }

  catch (error) {

    return jsonResponse_({
      success: false,
      message: "Invalid request."
    });

  }


  const action =
    String(p.action || "").trim();


  try {

    let data;


    if (action === "generate") {

      data = generateCoupon_(p.email);

    }

    else if (
      action === "validate" ||
      action === "validateCoupon"
    ) {

      data = validateCoupon_(p.coupon);

    }

    else if (
      action === "redeem" ||
      action === "redeemCoupon"
    ) {

      data = redeemCoupon_(
        p.coupon,
        p.orderId || ""
      );

    }

    else {

      data = {
        success: false,
        message: "Invalid action."
      };

    }


    return jsonResponse_(data);

  }

  catch (error) {

    return jsonResponse_({
      success: false,
      message: error.message || "Server error."
    });

  }

}


/*******************************************************
 * SETUP SHEET
 *******************************************************/

function setupSheets() {

  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  let sheet =
    ss.getSheetByName(CONFIG.SHEET_NAME);


  if (!sheet) {

    sheet =
      ss.insertSheet(CONFIG.SHEET_NAME);

  }


  const headers = [
    "Email",
    "Coupon",
    "Discount",
    "Created",
    "Expires",
    "Status",
    "UsedAt",
    "OrderId"
  ];


  const firstRow =
    sheet
      .getRange(1, 1, 1, headers.length)
      .getValues()[0];


  let needsHeaders = false;


  for (let i = 0; i < headers.length; i++) {

    if (firstRow[i] !== headers[i]) {

      needsHeaders = true;
      break;

    }

  }


  if (needsHeaders) {

    sheet
      .getRange(1, 1, 1, headers.length)
      .setValues([headers]);

  }


  sheet
    .getRange(1, 1, 1, headers.length)
    .setFontWeight("bold");


  return "Coupons sheet is ready.";

}


/*******************************************************
 * GENERATE COUPON
 *******************************************************/

function generateCoupon_(email) {

  email =
    String(email || "")
      .trim()
      .toLowerCase();


  if (!email) {

    return {
      success: false,
      message: "Email address is required."
    };

  }


  /* Basic email validation */

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {

    return {
      success: false,
      message: "Please enter a valid email address."
    };

  }


  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  let sheet =
    ss.getSheetByName(CONFIG.SHEET_NAME);


  if (!sheet) {

    setupSheets();

    sheet =
      ss.getSheetByName(CONFIG.SHEET_NAME);

  }


  /*
   * Lock prevents two requests from generating
   * duplicate coupons at the same time.
   */

  const lock =
    LockService.getScriptLock();


  lock.waitLock(10000);


  try {

    const data =
      sheet.getDataRange().getValues();


    /*
     * Check whether this email already has
     * a coupon.
     */

    for (let i = 1; i < data.length; i++) {

      const rowEmail =
        String(data[i][0] || "")
          .trim()
          .toLowerCase();


      if (rowEmail === email) {

        const existingCoupon =
          String(data[i][1] || "");


        const discount =
          Number(data[i][2]) || CONFIG.DISCOUNT_PERCENT;


        const expires =
          data[i][4];


        const status =
          String(data[i][5] || "UNUSED");


        /*
         * If the old coupon is still valid,
         * return it.
         */

        if (
          status !== "USED" &&
          (!expires || new Date(expires) > new Date())
        ) {

          return {
            success: true,
            existing: true,
            coupon: existingCoupon,
            discount: discount,
            expires: expires instanceof Date
              ? expires.toISOString()
              : String(expires),
            message:
              "You already have a coupon."
          };

        }

      }

    }


    /*
     * Create new coupon
     */

    const coupon =
      createUniqueCoupon_(sheet);


    const created =
      new Date();


    const expires =
      new Date(
        created.getTime() +
        CONFIG.EXPIRY_DAYS *
        24 *
        60 *
        60 *
        1000
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

  }

  finally {

    lock.releaseLock();

  }

}


/*******************************************************
 * CREATE UNIQUE COUPON
 *******************************************************/

function createUniqueCoupon_(sheet) {

  const existing =
    sheet
      .getRange(
        2,
        2,
        Math.max(sheet.getLastRow() - 1, 1),
        1
      )
      .getValues()
      .flat();


  for (let attempt = 0; attempt < 20; attempt++) {

    const random =
      Utilities
        .getUuid()
        .replace(/-/g, "")
        .substring(0, 8)
        .toUpperCase();


    const coupon =
      CONFIG.COUPON_PREFIX +
      "-" +
      random;


    if (!existing.includes(coupon)) {

      return coupon;

    }

  }


  throw new Error(
    "Could not create a unique coupon. Please try again."
  );

}


/*******************************************************
 * VALIDATE COUPON
 *******************************************************/

function validateCoupon_(coupon) {

  coupon =
    String(coupon || "")
      .trim()
      .toUpperCase();


  if (!coupon) {

    return {
      success: false,
      valid: false,
      message: "Coupon is required."
    };

  }


  const sheet =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(CONFIG.SHEET_NAME);


  if (!sheet) {

    return {
      success: false,
      valid: false,
      message: "Coupons sheet not found."
    };

  }


  const data =
    sheet.getDataRange().getValues();


  for (let i = 1; i < data.length; i++) {

    const rowCoupon =
      String(data[i][1] || "")
        .trim()
        .toUpperCase();


    if (rowCoupon === coupon) {

      const email =
        String(data[i][0] || "");


      const discount =
        Number(data[i][2]) ||
        CONFIG.DISCOUNT_PERCENT;


      const expires =
        data[i][4];


      const status =
        String(data[i][5] || "UNUSED")
          .toUpperCase();


      /* Already used */

      if (status === "USED") {

        return {
          success: true,
          valid: false,
          message: "This coupon has already been used."
        };

      }


      /* Expired */

      if (
        expires &&
        new Date(expires).getTime() < Date.now()
      ) {

        return {
          success: true,
          valid: false,
          message: "This coupon has expired."
        };

      }


      return {

        success: true,

        valid: true,

        coupon: coupon,

        email: email,

        discount: discount,

        expires:
          expires instanceof Date
            ? expires.toISOString()
            : String(expires),

        message:
          "Coupon is valid."

      };

    }

  }


  return {

    success: true,

    valid: false,

    message: "Invalid coupon code."

  };

}


/*******************************************************
 * REDEEM COUPON
 *******************************************************/

function redeemCoupon_(coupon, orderId) {

  coupon =
    String(coupon || "")
      .trim()
      .toUpperCase();


  orderId =
    String(orderId || "").trim();


  if (!coupon) {

    return {
      success: false,
      message: "Coupon is required."
    };

  }


  const lock =
    LockService.getScriptLock();


  lock.waitLock(10000);


  try {

    const sheet =
      SpreadsheetApp
        .getActiveSpreadsheet()
        .getSheetByName(CONFIG.SHEET_NAME);


    if (!sheet) {

      return {
        success: false,
        message: "Coupons sheet not found."
      };

    }


    const data =
      sheet.getDataRange().getValues();


    for (let i = 1; i < data.length; i++) {

      const rowCoupon =
        String(data[i][1] || "")
          .trim()
          .toUpperCase();


      if (rowCoupon === coupon) {

        const rowNumber =
          i + 1;


        const status =
          String(data[i][5] || "UNUSED")
            .toUpperCase();


        /* Already used */

        if (status === "USED") {

          return {

            success: false,

            redeemed: false,

            message:
              "This coupon has already been used."

          };

        }


        const expires =
          data[i][4];


        /* Expired */

        if (
          expires &&
          new Date(expires).getTime() < Date.now()
        ) {

          sheet
            .getRange(rowNumber, 6)
            .setValue("EXPIRED");


          return {

            success: false,

            redeemed: false,

            message:
              "This coupon has expired."

          };

        }


        /*
         * Mark coupon as USED
         */

        sheet
          .getRange(rowNumber, 6)
          .setValue("USED");


        sheet
          .getRange(rowNumber, 7)
          .setValue(new Date());


        sheet
          .getRange(rowNumber, 8)
          .setValue(orderId);


        return {

          success: true,

          redeemed: true,

          coupon: coupon,

          message:
            "Coupon redeemed successfully."

        };

      }

    }


    return {

      success: false,

      redeemed: false,

      message:
        "Invalid coupon code."

    };

  }

  finally {

    lock.releaseLock();

  }

}


/*******************************************************
 * JSONP / JSON RESPONSE
 *******************************************************/

function response_(data, callback) {

  const json =
    JSON.stringify(data);


  callback =
    String(callback || "");


  /*
   * JSONP callback validation
   */

  if (
    /^[A-Za-z_$][A-Za-z0-9_$\.]*$/.test(callback)
  ) {

    return ContentService
      .createTextOutput(
        callback + "(" + json + ");"
      )
      .setMimeType(
        ContentService.MimeType.JAVASCRIPT
      );

  }


  return ContentService
    .createTextOutput(json)
    .setMimeType(
      ContentService.MimeType.JSON
    );

}


/*******************************************************
 * NORMAL JSON RESPONSE
 *******************************************************/

function jsonResponse_(data) {

  return ContentService
    .createTextOutput(
      JSON.stringify(data)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );

}
