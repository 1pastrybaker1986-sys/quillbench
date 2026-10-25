import { test } from "node:test";
import assert from "node:assert/strict";
import { runMagicLinkFlow, isAlreadyRegistered } from "../src/lib/magicLinkFlow.ts";

const pw = () => "x";
function fake(signupErr?: unknown, recoverErr?: unknown) {
  const calls: string[] = [];
  return { calls, auth: {
    signup: async (e: string) => { calls.push("signup:" + e); if (signupErr) throw signupErr; return {}; },
    // Netlify answers 200 {} even for unknown users — must not be treated as "exists".
    requestPasswordRecovery: async (e: string) => { calls.push("recover:" + e); if (recoverErr) throw recoverErr; return {}; },
  } };
}
const exists = { status: 422, json: { code: 422, msg: "A user with this email address has already been registered" } };

test("new user → signup, never recover", async () => {
  const f = fake();
  const r = await runMagicLinkFlow(f.auth, " New@Example.com ", pw);
  assert.deepEqual(r.ok && r.kind, "signup");
  assert.deepEqual(f.calls, ["signup:new@example.com"]);
});
test("existing user (422) → recover link", async () => {
  const f = fake(exists);
  const r = await runMagicLinkFlow(f.auth, "a@b.co", pw);
  assert.equal(r.ok && r.kind, "recovery");
  assert.deepEqual(f.calls, ["signup:a@b.co", "recover:a@b.co"]);
});
test("other signup error → fail, no recover", async () => {
  const f = fake({ status: 500, json: { msg: "boom" } });
  const r = await runMagicLinkFlow(f.auth, "a@b.co", pw);
  assert.equal(r.ok, false);
  assert.deepEqual(f.calls, ["signup:a@b.co"]);
});
test("existing user but recover fails → fail", async () => {
  const r = await runMagicLinkFlow(fake(exists, new Error("x")).auth, "a@b.co", pw);
  assert.equal(r.ok, false);
});
test("invalid email → no calls", async () => {
  const f = fake();
  assert.equal((await runMagicLinkFlow(f.auth, "nope", pw)).ok, false);
  assert.equal(f.calls.length, 0);
});
test("isAlreadyRegistered", () => {
  assert.equal(isAlreadyRegistered(exists), true);
  assert.equal(isAlreadyRegistered({ status: 422, json: { msg: "Password should be at least 6 characters" } }), false);
  assert.equal(isAlreadyRegistered(new Error("network")), false);
});
