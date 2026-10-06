import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { CoverCreditError } from "../netlify/lib/coverCredit.mjs";
import {
  createCoverCreditUpgrade,
  handleUpgradeCheckout,
} from "../netlify/functions/upgrade-checkout.mjs";

const COVER_ID = "cs_test_coverpaid123";
const BUNDLE_PRICE = "price_test_bundle499";
const PRODUCT = "prod_test_bundle";
const ORIGIN = "https://quillbench.test";
const PAID_OCT_5 = 1791219600;
const EXPIRES_NOV_4 = 1793858399;

const ENV = {
  STRIPE_SECRET_KEY: "unit-test-secret",
  STRIPE_PRICE_STUDIO_BUNDLE: BUNDLE_PRICE,
  STRIPE_COUPON_COVER_CREDIT_99: "cover-credit-99",
  STRIPE_COUPON_COVER_CREDIT_179: "cover-credit-179",
  URL: ORIGIN,
};

function coupon(amountOff, products = [PRODUCT]) {
  return {
    id: amountOff === 17900 ? "cover-credit-179" : "cover-credit-99",
    amount_off: amountOff,
    percent_off: null,
    currency: "usd",
    duration: "once",
    valid: true,
    applies_to: { products },
  };
}

function coverSession(overrides = {}) {
  return {
    id: COVER_ID,
    payment_status: "paid",
    status: "complete",
    currency: "usd",
    amount_total: 9900,
    created: PAID_OCT_5 - 3600,
    metadata: { packageId: "cover-design" },
    customer_details: { email: "buyer@example.com" },
    payment_intent: {
      id: "pi_test_cover",
      created: PAID_OCT_5 - 60,
      metadata: {},
      latest_charge: { id: "ch_test_cover", created: PAID_OCT_5 },
    },
    ...overrides,
  };
}

function mockStripe(options = {}) {
  const cover = options.cover ?? coverSession();
  const calls = [];
  const updates = [];
  const piUpdates = [];
  let bundle = options.prior ?? null;
  const searchError = options.searchError ?? null;
  const coupons = options.coupons ?? {
    "cover-credit-99": coupon(9900),
    "cover-credit-179": coupon(17900),
  };
  const price = options.price ?? {
    id: BUNDLE_PRICE,
    unit_amount: 49900,
    currency: "usd",
    active: true,
    product: PRODUCT,
  };

  const stripe = {
    calls,
    updates,
    piUpdates,
    checkout: {
      sessions: {
        retrieve: async (id) => {
          if (id === cover.id) return cover;
          if (bundle && id === bundle.id) return bundle;
          const err = new Error("No such checkout.session");
          err.code = "resource_missing";
          err.statusCode = 404;
          throw err;
        },
        search: async () => {
          if (searchError) throw searchError;
          return { data: bundle ? [bundle] : [] };
        },
        create: async (fields, requestOptions) => {
          const baseKey = `cover-credit-${cover.id}`;
          if (
            options.replayExpired &&
            (requestOptions?.idempotencyKey === `${baseKey}-brand` ||
              requestOptions?.idempotencyKey === baseKey)
          ) {
            calls.push({ fields, requestOptions, replay: true });
            return {
              id: "cs_test_expired_replay",
              url: "https://checkout.stripe.com/c/pay/cs_test_expired_replay",
              status: "expired",
            };
          }
          const created = {
            id: options.nextId ?? "cs_test_bundle_new",
            url: "https://checkout.stripe.com/c/pay/cs_test_bundle_new",
            status: "open",
            payment_status: "unpaid",
            metadata: fields.metadata,
          };
          calls.push({ fields, requestOptions });
          bundle = created;
          return created;
        },
        update: async (id, params) => {
          updates.push({ id, params });
          if (id === cover.id) cover.metadata = { ...cover.metadata, ...params.metadata };
          return { id, ...params };
        },
      },
    },
    coupons: {
      retrieve: async (id) => {
        if (!coupons[id]) {
          const err = new Error("No such coupon");
          err.code = "resource_missing";
          throw err;
        }
        return coupons[id];
      },
    },
    prices: {
      retrieve: async (id) => {
        if (id !== BUNDLE_PRICE) {
          const err = new Error("No such price");
          err.code = "resource_missing";
          throw err;
        }
        return price;
      },
    },
    paymentIntents: {
      update: async (id, params) => {
        piUpdates.push({ id, params });
        return { id };
      },
    },
    promotionCodes: {
      list: async () => {
        throw new Error("SOFTLAUNCH50 must not be resolved");
      },
    },
  };
  return stripe;
}

async function upgrade(stripe, env, nowUnix, coverSessionId = COVER_ID) {
  return createCoverCreditUpgrade({
    stripe,
    coverSessionId,
    nowUnix,
    origin: ORIGIN,
    env,
  });
}

function createdFields(stripe) {
  const real = stripe.calls.find((call) => !call.replay);
  assert.ok(real, "expected a Checkout Session create");
  return real.fields;
}

test("$99 Cover credit charges $400 and does not stack SOFTLAUNCH50", async () => {
  const stripe = mockStripe();
  const result = await upgrade(stripe, ENV, PAID_OCT_5 + 10);
  assert.equal(result.expectedChargeCents, 40000);
  assert.equal(result.expectedChargeCents, 49900 - 9900);
  const fields = createdFields(stripe);
  assert.deepEqual(fields.discounts, [{ coupon: "cover-credit-99" }]);
  assert.equal(fields.allow_promotion_codes, undefined);
  assert.equal(fields.payment_method_types, undefined);
  assert.equal(JSON.stringify(fields).includes("SOFTLAUNCH50"), false);
  assert.deepEqual(fields.line_items, [{ price: BUNDLE_PRICE, quantity: 1 }]);
  assert.equal(fields.metadata.packageId, "studio-bundle");
  assert.equal(fields.metadata.cover_session_id, COVER_ID);
  assert.equal(fields.metadata.cover_paid_cents, "9900");
  assert.equal(fields.metadata.buyer_email, undefined);
  assert.equal(JSON.stringify(fields.metadata).includes("@"), false);
  assert.equal(
    fields.success_url,
    "https://quillbench.test/thank-you/?pkg=studio-bundle&session_id={CHECKOUT_SESSION_ID}",
  );
  assert.equal(fields.customer_email, "buyer@example.com");
  assert.equal(stripe.updates[0].params.metadata.cover_credit_session, result.sessionId);
  assert.equal(JSON.stringify(stripe.updates[0].params.metadata).includes("@"), false);
  assert.equal(stripe.piUpdates[0].id, "pi_test_cover");
});

test("$179 Cover credit charges $320", async () => {
  const stripe = mockStripe({ cover: coverSession({ amount_total: 17900 }) });
  const result = await upgrade(stripe, ENV, PAID_OCT_5);
  assert.equal(result.expectedChargeCents, 32000);
  assert.equal(result.expectedChargeCents, 49900 - 17900);
  assert.deepEqual(createdFields(stripe).discounts, [{ coupon: "cover-credit-179" }]);
  assert.equal(createdFields(stripe).metadata.cover_paid_cents, "17900");
});

test("client amount, coupon, and success URL cannot change the charge", async () => {
  const stripe = mockStripe();
  const event = {
    httpMethod: "POST",
    body: JSON.stringify({
      coverSessionId: COVER_ID,
      amount: 35000,
      coupon: "SOFTLAUNCH50",
      promotionCode: "SOFTLAUNCH50",
      priceId: "price_attacker",
      successUrl: "https://evil.example/phish",
    }),
  };
  const response = await handleUpgradeCheckout(event, {
    stripe,
    env: ENV,
    nowUnix: PAID_OCT_5,
  });
  assert.equal(response.statusCode, 200);
  const fields = createdFields(stripe);
  assert.deepEqual(fields.discounts, [{ coupon: "cover-credit-99" }]);
  assert.equal(fields.success_url.includes("evil.example"), false);
  assert.equal(fields.line_items[0].price, BUNDLE_PRICE);
  assert.equal(JSON.stringify(fields).includes("SOFTLAUNCH50"), false);
  assert.equal(fields.allow_promotion_codes, undefined);
});

test("the credit window uses the charge time, not the earlier session open time", async () => {
  const oct4 = 1791219600 - 86400;
  const stripe = mockStripe({
    cover: coverSession({
      created: oct4,
      payment_intent: {
        id: "pi_test_cover",
        created: oct4,
        metadata: {},
        latest_charge: { id: "ch_test_cover", created: PAID_OCT_5 },
      },
    }),
  });
  const result = await upgrade(stripe, ENV, EXPIRES_NOV_4);
  assert.equal(result.expectedChargeCents, 40000);
});

test("an amount other than $99 or $179 cannot be credited", async () => {
  const stripe = mockStripe({ cover: coverSession({ amount_total: 5000 }) });
  await assert.rejects(
    () => upgrade(stripe, ENV, PAID_OCT_5),
    (err) => err instanceof CoverCreditError && /cannot be credited/.test(err.message),
  );
  assert.equal(stripe.calls.length, 0);
});

test("unpaid Cover checkout is rejected", async () => {
  const stripe = mockStripe({
    cover: coverSession({ payment_status: "unpaid", status: "open" }),
  });
  await assert.rejects(
    () => upgrade(stripe, ENV, PAID_OCT_5),
    (err) => err instanceof CoverCreditError && err.statusCode === 400 && /not paid/.test(err.message),
  );
  assert.equal(stripe.calls.length, 0);
});

test("a paid session for the wrong package is rejected", async () => {
  const stripe = mockStripe({
    cover: coverSession({
      amount_total: 9900,
      metadata: { packageId: "full-edit" },
    }),
  });
  await assert.rejects(
    () => upgrade(stripe, ENV, PAID_OCT_5),
    (err) => err instanceof CoverCreditError && /not a Cover Design/.test(err.message),
  );
  assert.equal(stripe.calls.length, 0);
});

test("expired window is rejected, including the Oct 5 CDT → Nov 4 CST boundary", async () => {
  const stripe = mockStripe();
  await assert.rejects(
    () => upgrade(stripe, ENV, EXPIRES_NOV_4 + 1),
    (err) => err instanceof CoverCreditError && err.statusCode === 400 && /30-day/.test(err.message),
  );
  assert.equal(stripe.calls.length, 0);

  const onTime = mockStripe();
  const result = await upgrade(onTime, ENV, EXPIRES_NOV_4);
  assert.equal(result.expectedChargeCents, 40000);
});

test("a second use of the same Cover session is rejected", async () => {
  const stripe = mockStripe();
  const first = await upgrade(stripe, ENV, PAID_OCT_5);
  assert.equal(first.expectedChargeCents, 40000);
  await assert.rejects(
    () => upgrade(stripe, ENV, PAID_OCT_5 + 60),
    (err) => err instanceof CoverCreditError && err.statusCode === 409 && /already used/.test(err.message),
  );
  assert.equal(stripe.calls.filter((call) => !call.replay).length, 1);
});

test("a second use is rejected when Checkout search is unavailable", async () => {
  const stripe = mockStripe({ searchError: new Error("search down") });
  await upgrade(stripe, ENV, PAID_OCT_5);
  await assert.rejects(
    () => upgrade(stripe, ENV, PAID_OCT_5 + 30),
    (err) => err instanceof CoverCreditError && err.statusCode === 409,
  );
  assert.equal(stripe.calls.filter((call) => !call.replay).length, 1);
});

test("a paid prior Bundle session blocks another credit", async () => {
  const stripe = mockStripe({
    prior: {
      id: "cs_test_bundle_paid",
      status: "complete",
      payment_status: "paid",
      metadata: { cover_session_id: COVER_ID, packageId: "studio-bundle" },
    },
  });
  await assert.rejects(
    () => upgrade(stripe, ENV, PAID_OCT_5),
    (err) => err instanceof CoverCreditError && err.statusCode === 409,
  );
  assert.equal(stripe.calls.length, 0);
});

test("an expired unpaid upgrade can be started again", async () => {
  const stripe = mockStripe({
    prior: {
      id: "cs_test_bundle_expired",
      status: "expired",
      payment_status: "unpaid",
      metadata: { cover_session_id: COVER_ID },
    },
    replayExpired: true,
    nextId: "cs_test_bundle_retry",
  });
  const result = await upgrade(stripe, ENV, PAID_OCT_5 + 5);
  assert.equal(result.sessionId, "cs_test_bundle_retry");
  assert.equal(result.expectedChargeCents, 40000);
  assert.equal(stripe.calls.filter((call) => !call.replay).length, 1);
});

test("missing credit coupon env fails closed and does not open Checkout", async () => {
  const stripe = mockStripe();
  const env = { ...ENV, STRIPE_COUPON_COVER_CREDIT_99: "  " };
  await assert.rejects(
    () => upgrade(stripe, env, PAID_OCT_5),
    (err) => err instanceof CoverCreditError && err.statusCode === 503 && /not configured/.test(err.message),
  );
  assert.equal(stripe.calls.length, 0);
});

test("a coupon that is not the Cover amount is refused", async () => {
  const stripe = mockStripe({
    coupons: { "cover-credit-99": coupon(5000) },
  });
  await assert.rejects(
    () => upgrade(stripe, ENV, PAID_OCT_5),
    (err) => err instanceof CoverCreditError && /does not match/.test(err.message),
  );
  assert.equal(stripe.calls.length, 0);
});

test("a forged session id is rejected", async () => {
  const stripe = mockStripe();
  await assert.rejects(
    () => upgrade(stripe, ENV, PAID_OCT_5, "cs_test_missing"),
    (err) => err instanceof CoverCreditError && err.statusCode === 404,
  );
});

test("shipped function source does not embed a Stripe secret key", () => {
  const files = [
    "netlify/functions/upgrade-checkout.mjs",
    "netlify/lib/coverCredit.mjs",
  ];
  for (const file of files) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.equal(/sk_live|sk_test/.test(source), false, file);
  }
});
