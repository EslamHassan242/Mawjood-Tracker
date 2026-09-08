import { test } from "node:test";
import assert from "node:assert/strict";
import { captainAccountInput } from "../src/lib/captain-account-input";
import { canWrite } from "../src/lib/permissions";

test('only Admin and SuperAdmin have captain write access', () => {
  for (const role of ['ADMIN', 'SUPER_ADMIN']) assert.equal(canWrite(role), true);
  for (const role of ['CAPTAIN', 'MODERATOR', '', 'UNKNOWN']) assert.equal(canWrite(role), false);
});
test('profile changes preserve passwords and permit explicit deactivation', () => {
  assert.deepEqual(captainAccountInput({ name: ' Ahmed ', email: ' captain@example.com ', isActive: false }), {
    name: 'Ahmed', email: 'captain@example.com', isActive: false,
  });
  assert.deepEqual(captainAccountInput({ isActive: true }), { isActive: true });
});
test('rejects role changes, hash injection, malformed profiles, and empty updates', () => {
  for (const body of [{ role: 'ADMIN' }, { passwordHash: 'injected' }, { name: ' ' }, { email: 'invalid' }, { isActive: 'true' }, {}, null])
    assert.throws(() => captainAccountInput(body));
});
test('password reset enforces length including bcrypt UTF-8 byte limit', () => {
  for (const password of ['', 'short', ' '.repeat(10), 'a'.repeat(73), 'س'.repeat(37)])
    assert.throws(() => captainAccountInput({ password }));
  const password = 'new secure password';
  assert.deepEqual(captainAccountInput({ password }), { password });
});
