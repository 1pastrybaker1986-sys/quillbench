import assert from "node:assert/strict";
import test from "node:test";
import {
  chicagoWallTimeToUnix,
  coverCreditExpiresAtUnix,
  isWithinCoverCreditWindow,
} from "../netlify/lib/coverCredit.mjs";

/** 2026-10-05 12:00:00 America/Chicago (CDT, UTC-5). */
const PAID_OCT_5_NOON = 1791219600;
/** 2026-11-04 23:59:59 America/Chicago (CST, UTC-6). */
const EXPIRES_NOV_4 = 1793858399;

function chicagoStamp(unixSeconds) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(unixSeconds * 1000));
  const bag = Object.fromEntries(parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
  return `${bag.year}-${bag.month}-${bag.day} ${bag.hour}:${bag.minute}:${bag.second}`;
}

test("Cover paid Oct 5 CDT expires Nov 4 11:59:59 PM CST", () => {
  assert.equal(coverCreditExpiresAtUnix(PAID_OCT_5_NOON), EXPIRES_NOV_4);
  assert.equal(chicagoStamp(EXPIRES_NOV_4), "2026-11-04 23:59:59");
  assert.notEqual(coverCreditExpiresAtUnix(PAID_OCT_5_NOON), PAID_OCT_5_NOON + 30 * 86400);
});

test("the whole paid calendar day shares one Chicago expiry", () => {
  const start = chicagoWallTimeToUnix(2026, 10, 5, 0, 0, 0);
  const end = chicagoWallTimeToUnix(2026, 10, 5, 23, 59, 59);
  assert.equal(coverCreditExpiresAtUnix(start), EXPIRES_NOV_4);
  assert.equal(coverCreditExpiresAtUnix(end), EXPIRES_NOV_4);
  assert.equal(chicagoStamp(start), "2026-10-05 00:00:00");
  assert.equal(chicagoStamp(end), "2026-10-05 23:59:59");
});

test("a Cover paid the calendar day before expires a day earlier", () => {
  const oct4 = chicagoWallTimeToUnix(2026, 10, 4, 23, 59, 59);
  const expires = coverCreditExpiresAtUnix(oct4);
  assert.equal(expires, chicagoWallTimeToUnix(2026, 11, 3, 23, 59, 59));
  assert.equal(chicagoStamp(expires), "2026-11-03 23:59:59");
  assert.notEqual(expires, EXPIRES_NOV_4);
});

test("the expiry second is inside the window and the next second is not", () => {
  assert.equal(isWithinCoverCreditWindow(PAID_OCT_5_NOON, EXPIRES_NOV_4), true);
  assert.equal(isWithinCoverCreditWindow(PAID_OCT_5_NOON, EXPIRES_NOV_4 + 1), false);
  assert.equal(isWithinCoverCreditWindow(PAID_OCT_5_NOON, PAID_OCT_5_NOON), true);
});

test("DST fall-back is not modeled as paidAt + 30 days of seconds", () => {
  const paid = chicagoWallTimeToUnix(2026, 10, 5, 1, 36, 57);
  const plusThirtyUtcDays = paid + 30 * 86400;
  const expires = coverCreditExpiresAtUnix(paid);
  assert.equal(expires, EXPIRES_NOV_4);
  assert.notEqual(chicagoStamp(plusThirtyUtcDays), "2026-11-04 23:59:59");
  assert.equal(chicagoStamp(expires), "2026-11-04 23:59:59");
});
