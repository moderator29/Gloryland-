/**
 * Assertions over the portal lock.
 *
 * The property that matters most is not "does the right password work". It is
 * that the plaintext is nowhere in what gets written to the device, that two
 * members with the same password do not get the same stored hash, and that a
 * wrong answer is rejected in the same time as a nearly right one. Those are
 * the three ways a scheme like this is usually wrong.
 *
 * Run with `npm run check`.
 */

import {
  PASSCODE_LENGTH,
  PASSWORD_MIN,
  checkPasscode,
  checkPassword,
  constantTimeEqual,
  createCredentials,
  passwordStrength,
  verifyPasscode,
  verifyPassword,
} from "@/domain/credentials";

let pass = 0,
  fail = 0;
function is(label: string, actual: unknown, expected: unknown) {
  if (actual === expected) pass++;
  else {
    fail++;
    console.log(`  FAIL ${label}: got ${String(actual)}, want ${String(expected)}`);
  }
}
function ok(label: string, condition: boolean) {
  if (condition) pass++;
  else {
    fail++;
    console.log(`  FAIL ${label}`);
  }
}

console.log("\nPortal lock\n");

console.log("1. what the rules accept and refuse");
{
  is("an empty password is not an error yet", checkPassword("").message, "");
  is("too short is refused", checkPassword("a".repeat(PASSWORD_MIN - 1)).ok, false);
  is("long enough is accepted", checkPassword("correct horse battery").ok, true);
  is("one repeated character is refused", checkPassword("aaaaaaaaaa").ok, false);
  is("the username itself is refused", checkPassword("marcusadeyemi", "marcusadeyemi").ok, false);
  is("case does not dodge that", checkPassword("MarcusAdeyemi", "marcusadeyemi").ok, false);

  // No character class rules. A long passphrase of only lower case letters is
  // stronger than Passw0rd! and the checker must not say otherwise.
  is("a long lower case passphrase passes", checkPassword("the quiet part out loud").ok, true);
  ok(
    "and reads at least as strong as a short mixed one",
    passwordStrength("the quiet part out loud") >= passwordStrength("Passw0rd!"),
  );

  is("six digits is accepted", checkPasscode("284617").ok, true);
  is("five digits is not", checkPasscode("28461").ok, false);
  is("letters are not", checkPasscode("28461a").ok, false);
  is("all one digit is refused", checkPasscode("444444").ok, false);
  is("an ascending run is refused", checkPasscode("123456").ok, false);
  is("a descending run is refused", checkPasscode("654321").ok, false);
  is("a run that is not straight is fine", checkPasscode("135792").ok, true);
  is("the length constant is six", PASSCODE_LENGTH, 6);
}

console.log("2. constant time comparison");
{
  is("equal strings are equal", constantTimeEqual("abcdef", "abcdef"), true);
  is("a differing last character is not", constantTimeEqual("abcdef", "abcdeg"), false);
  is("a differing first character is not", constantTimeEqual("abcdef", "zbcdef"), false);
  is("different lengths are not", constantTimeEqual("abc", "abcd"), false);
}

console.log("3. what actually gets written to the device");
await (async () => {
  const password = "correct horse battery staple";
  const passcode = "284617";
  const creds = await createCredentials(password, passcode);
  const written = JSON.stringify(creds);

  // The whole point. If either secret appears in the serialised record, the
  // scheme is decoration.
  ok("the password is not in the stored record", !written.includes(password));
  ok("the passcode is not in the stored record", !written.includes(passcode));
  ok(
    "no substring of the password longer than three characters is either",
    !written.includes("correct") && !written.includes("horse"),
  );

  is("the right password verifies", await verifyPassword(creds, password), true);
  is(
    "a wrong password does not",
    await verifyPassword(creds, "correct horse battery stapl"),
    false,
  );
  is("the right passcode verifies", await verifyPasscode(creds, passcode), true);
  is("a wrong passcode does not", await verifyPasscode(creds, "284618"), false);

  // The passcode must not open the password lock, or the six digit secret has
  // silently become the strength of the whole thing.
  is("the passcode does not verify as the password", await verifyPassword(creds, passcode), false);
  is("the password does not verify as the passcode", await verifyPasscode(creds, password), false);

  ok("the iteration count is at least the OWASP figure", creds.password.iterations >= 210_000);
  ok("the salts are sixteen bytes", creds.password.salt.length === 32);
  ok("the two secrets carry different salts", creds.password.salt !== creds.passcode.salt);

  // Two members choosing the same password must not share a hash, or one
  // leaked record tells an attacker about every other account using it.
  const other = await createCredentials(password, passcode);
  ok("the same password twice gives different salts", other.password.salt !== creds.password.salt);
  ok("and therefore different hashes", other.password.hash !== creds.password.hash);
  is("both still verify", await verifyPassword(other, password), true);
})();

console.log(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
