/*************************************************
 * MONESH EBOOKS - COUPON API
 * Tech Blueprint Reward Coupon System
 *************************************************/

const CONFIG = {
  SHEET_NAME: "Coupons",
  COUPON_PREFIX: "TECH50",
  DISCOUNT_PERCENT: 50,
  EXPIRY_DAYS: 30
};


/*************************************************
 * GET API
 *************************************************/

function doGet(e) {
  try {
    const p = (e && e.parameter) ? e.parameter : {};

    const action = String(p.action || "").trim();

    // Generate coupon
    if (action === "generate") {
      const result = generateCoupon_(p.email);
      return response_(result, p.callback);
    }

    // Validate coupon
    if (
      action === "validate" ||
      action === "validateCoupon"
    ) {
      const result = validateCoupon_(p.coupon);
      return response_(result, p.callback);
    }

    // Redeem coupon
    if (
      action === "redeem" ||
      action === "redeemCoupon"
    ) {
      const result = redeemCoupon_(
        p.coupon,
        p.orderId || ""
      );

      return response_(result, p.callback);
    }

    // API status
    return response_({
      success: true,
      message: "Monesh Ebooks Coupon API is running."
    }, p.callback);

  } catch (error) {

    return response_({
      success: false,
      message: error.message
    });
  }
}


/*************************************************
 * POST API
 *************************************************/

function doPost(e) {
  try {

    let data = {};

    /*
     * Handle JSON requests
     */
    if (
      e &&
      e.postData &&
      e.postData.contents
    ) {

      const body = String(
        e.postData.contents
      ).trim();

      if (body.startsWith("{")) {

        data = JSON.parse(body);

      } else {

        /*
         * Handle application/x-www-form-urlencoded
         *
         * Example:
         * action=validateCoupon&coupon=TECH50-12345678
         */

        data = e.parameter || {};
      }

    } else {

      data = e.parameter || {};
    }


    const action = String(
      data.action || ""
    ).trim();


    /*
     * Generate coupon
     */
    if (action === "generate") {

      const result = generateCoupon_(
        data.email
      );

      return response_(
        result,
        data.callback
      );
    }


    /*
     * Validate coupon
     */
    if (
      action === "validate" ||
      action === "validateCoupon"
    ) {

      const result = validateCoupon_(
        data.coupon
      );

      return response_(
        result,
        data.callback
      );
    }


    /*
     * Redeem coupon
     */
    if (
      action === "redeem" ||
      action === "redeemCoupon"
    ) {

      const result = redeemCoupon_(
        data.coupon,
        data.orderId || ""
      );

      return response_(
        result,
        data.callback
      );
    }


    /*
     * Unknown action
     */
    return response_({
      success: false,
      message: "Unknown action: " + action
    }, data.callback);


  } catch (error) {

    return response_({
      success: false,
      message: error.message
    });
  }
}


/*************************************************
 * CREATE / SETUP GOOGLE SHEET
 *************************************************/

function setupSheets() {

  const ss =
    SpreadsheetApp.getActiveSpreadsheet();

  let sheet =
    ss.getSheetByName(CONFIG.SHEET_NAME);


  /*
   * Create sheet if it doesn't exist
   */
  if (!sheet) {

    sheet =
      ss.insertSheet(CONFIG.SHEET_NAME);
  }


  /*
   * Headers
   */
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


  /*
   * Add headers if sheet is empty
   */
  if (sheet.getLastRow() === 0) {

    sheet
      .getRange(
        1,
        1,
        1,
        headers.length
      )
      .setValues([headers]);
  }


  return sheet;
}


/*************************************************
 * GENERATE COUPON
 *************************************************/

function generateCoupon_(email) {

  email = String(
    email || ""
  ).trim().toLowerCase();


  /*
   * Validate email
   */
  if (!email) {

    return {
      success: false,
      message: "Email is required."
    };
  }


  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


  if (!emailRegex.test(email)) {

    return {
      success: false,
      message: "Please enter a valid email address."
    };
  }


  const lock =
    LockService.getScriptLock();


  try {

    /*
     * Prevent duplicate generation
     */
    lock.waitLock(10000);


    const sheet =
      setupSheets();


    const lastRow =
      sheet.getLastRow();


    /*
     * Check if email already has a coupon
     */
    if (lastRow >= 2) {

      const values =
        sheet
          .getRange(
            2,
            1,
            lastRow - 1,
            8
          )
          .getValues();


      for (
        let i = 0;
        i < values.length;
        i++
      ) {

        const rowEmail =
          String(
            values[i][0] || ""
          )
          .trim()
          .toLowerCase();


        if (rowEmail === email) {

          const coupon =
            String(
              values[i][1] || ""
            ).trim();


          const discount =
            Number(
              values[i][2] ||
              CONFIG.DISCOUNT_PERCENT
            );


          const expires =
            values[i][4];


          const status =
            String(
              values[i][5] || "UNUSED"
            ).toUpperCase();


          /*
           * If coupon is still active,
           * return existing coupon.
           */
          if (
            status !== "USED" &&
            !isExpired_(expires)
          ) {

            return {
              success: true,
              existing: true,
              coupon: coupon,
              discount: discount,
              expires: formatDate_(expires),
              message:
                "Your coupon already exists."
            };
          }
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
      new Date(created);


    expires.setDate(
      expires.getDate() +
      CONFIG.EXPIRY_DAYS
    );


    /*
     * Save coupon
     */
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
        formatDate_(expires),
      message:
        "Coupon created successfully!"
    };


  } finally {

    try {
      lock.releaseLock();
    } catch (err) {}
  }
}


/*************************************************
 * CREATE UNIQUE COUPON
 *************************************************/

function createUniqueCoupon_(sheet) {

  let coupon = "";
  let exists = true;


  while (exists) {

    /*
     * UUID
     */
    const uuid =
      Utilities
        .getUuid()
        .replace(/-/g, "")
        .substring(0, 8)
        .toUpperCase();


    coupon =
      CONFIG.COUPON_PREFIX +
      "-" +
      uuid;


    exists =
      couponExists_(sheet, coupon);
  }


  return coupon;
}


/*************************************************
 * CHECK COUPON EXISTS
 *************************************************/

function couponExists_(sheet, coupon) {

  const lastRow =
    sheet.getLastRow();


  if (lastRow < 2) {
    return false;
  }


  const coupons =
    sheet
      .getRange(
        2,
        2,
        lastRow - 1,
        1
      )
      .getValues();


  for (
    let i = 0;
    i < coupons.length;
    i++
  ) {

    if (
      String(
        coupons[i][0] || ""
      )
      .trim()
      .toUpperCase() ===
      coupon.toUpperCase()
    ) {

      return true;
    }
  }


  return false;
}


/*************************************************
 * VALIDATE COUPON
 *************************************************/

function validateCoupon_(coupon) {

  coupon =
    String(
      coupon || ""
    )
    .trim()
    .toUpperCase();


  /*
   * Basic validation
   */
  if (!coupon) {

    return {
      success: false,
      valid: false,
      message: "Coupon is required."
    };
  }


  const sheet =
    setupSheets();


  const lastRow =
    sheet.getLastRow();


  if (lastRow < 2) {

    return {
      success: true,
      valid: false,
      message: "Coupon not found."
    };
  }


  const values =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        8
      )
      .getValues();


  for (
    let i = 0;
    i < values.length;
    i++
  ) {

    const rowCoupon =
      String(
        values[i][1] || ""
      )
      .trim()
      .toUpperCase();


    if (rowCoupon === coupon) {

      const discount =
        Number(
          values[i][2] ||
          CONFIG.DISCOUNT_PERCENT
        );


      const expires =
        values[i][4];


      const status =
        String(
          values[i][5] || "UNUSED"
        ).toUpperCase();


      /*
       * Already used
       */
      if (status === "USED") {

        return {
          success: true,
          valid: false,
          used: true,
          discount: discount,
          message:
            "This coupon has already been used."
        };
      }


      /*
       * Expired
       */
      if (isExpired_(expires)) {

        return {
          success: true,
          valid: false,
          expired: true,
          discount: discount,
          message:
            "This coupon has expired."
        };
      }


      /*
       * Valid
       */
      return {
        success: true,
        valid: true,
        coupon: coupon,
        discount: discount,
        expires:
          formatDate_(expires),
        message:
          "Coupon is valid."
      };
    }
  }


  /*
   * Coupon not found
   */
  return {
    success: true,
    valid: false,
    message:
      "Invalid coupon code."
  };
}


/*************************************************
 * REDEEM COUPON
 *************************************************/

function redeemCoupon_(
  coupon,
  orderId
) {

  coupon =
    String(
      coupon || ""
    )
    .trim()
    .toUpperCase();


  orderId =
    String(
      orderId || ""
    ).trim();


  if (!coupon) {

    return {
      success: false,
      redeemed: false,
      message:
        "Coupon is required."
    };
  }


  const lock =
    LockService.getScriptLock();


  try {

    /*
     * Prevent two users/orders
     * from redeeming at the same time.
     */
    lock.waitLock(10000);


    const sheet =
      setupSheets();


    const lastRow =
      sheet.getLastRow();


    if (lastRow < 2) {

      return {
        success: false,
        redeemed: false,
        message:
          "Coupon not found."
      };
    }


    const values =
      sheet
        .getRange(
          2,
          1,
          lastRow - 1,
          8
        )
        .getValues();


    for (
      let i = 0;
      i < values.length;
      i++
    ) {

      const rowCoupon =
        String(
          values[i][1] || ""
        )
        .trim()
        .toUpperCase();


      if (rowCoupon === coupon) {

        const rowNumber =
          i + 2;


        const status =
          String(
            values[i][5] || "UNUSED"
          ).toUpperCase();


        const expires =
          values[i][4];


        const discount =
          Number(
            values[i][2] ||
            CONFIG.DISCOUNT_PERCENT
          );


        /*
         * Already used
         */
        if (status === "USED") {

          return {
            success: true,
            redeemed: false,
            alreadyUsed: true,
            message:
              "This coupon has already been used."
          };
        }


        /*
         * Expired
         */
        if (isExpired_(expires)) {

          return {
            success: true,
            redeemed: false,
            expired: true,
            message:
              "This coupon has expired."
          };
        }


        /*
         * Mark coupon as USED
         */
        const usedAt =
          new Date();


        sheet
          .getRange(
            rowNumber,
            6
          )
          .setValue("USED");


        sheet
          .getRange(
            rowNumber,
            7
          )
          .setValue(usedAt);


        sheet
          .getRange(
            rowNumber,
            8
          )
          .setValue(orderId);


        return {
          success: true,
          redeemed: true,
          coupon: coupon,
          discount: discount,
          orderId: orderId,
          message:
            "Coupon redeemed successfully!"
        };
      }
    }


    /*
     * Not found
     */
    return {
      success: false,
      redeemed: false,
      message:
        "Invalid coupon code."
    };


  } finally {

    try {
      lock.releaseLock();
    } catch (err) {}
  }
}


/*************************************************
 * CHECK EXPIRY
 *************************************************/

function isExpired_(dateValue) {

  if (!dateValue) {
    return true;
  }


  const date =
    new Date(dateValue);


  if (isNaN(date.getTime())) {
    return true;
  }


  return date.getTime() <
    new Date().getTime();
}


/*************************************************
 * FORMAT DATE
 *************************************************/

function formatDate_(dateValue) {

  const date =
    new Date(dateValue);


  if (isNaN(date.getTime())) {
    return "";
  }


  return date.toISOString();
}


/*************************************************
 * API RESPONSE
 *
 * Supports:
 *
 * Normal JSON:
 * {"success":true}
 *
 * JSONP:
 * callback123({"success":true});
 *************************************************/

function response_(
  data,
  callback
) {

  const json =
    JSON.stringify(data);


  callback =
    String(
      callback || ""
    );


  /*
   * JSONP callback validation
   */
  if (
    /^[A-Za-z_$][A-Za-z0-9_$\.]*$/
      .test(callback)
  ) {

    return ContentService
      .createTextOutput(
        callback +
        "(" +
        json +
        ");"
      )
      .setMimeType(
        ContentService.MimeType.JAVASCRIPT
      );
  }


  /*
   * Normal JSON
   */
  return ContentService
    .createTextOutput(json)
    .setMimeType(
      ContentService.MimeType.JSON
    );
}


/*************************************************
 * SIMPLE JSON RESPONSE
 *************************************************/

function jsonResponse_(data) {

  return ContentService
    .createTextOutput(
      JSON.stringify(data)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );
}
