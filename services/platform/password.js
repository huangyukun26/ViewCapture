import crypto from "node:crypto";

const PASSWORD_VERSION = "pbkdf2_sha256";
const DEFAULT_ITERATIONS = 150000;
const KEY_LENGTH = 32;
const DIGEST = "sha256";

function assertPassword(value) {
  if (typeof value !== "string" || value.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
}

export function hashPassword(password) {
  assertPassword(password);
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, DEFAULT_ITERATIONS, KEY_LENGTH, DIGEST)
    .toString("hex");
  return `${PASSWORD_VERSION}$${DEFAULT_ITERATIONS}$${salt}$${hash}`;
}

export function verifyPassword(password, encodedHash) {
  if (typeof encodedHash !== "string") {
    return false;
  }
  const parts = encodedHash.split("$");
  if (parts.length !== 4) {
    return false;
  }
  const [version, iterationText, salt, expectedHashHex] = parts;
  if (version !== PASSWORD_VERSION) {
    return false;
  }
  const iterations = Number.parseInt(iterationText, 10);
  if (!Number.isFinite(iterations) || iterations <= 0) {
    return false;
  }
  const candidate = crypto
    .pbkdf2Sync(password, salt, iterations, KEY_LENGTH, DIGEST)
    .toString("hex");
  const expected = Buffer.from(expectedHashHex, "hex");
  const actual = Buffer.from(candidate, "hex");
  if (expected.length !== actual.length) {
    return false;
  }
  return crypto.timingSafeEqual(expected, actual);
}
