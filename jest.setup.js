jest.mock("bigint-buffer", () => ({
  toBigIntLE: () => BigInt(0),
  toBigIntBE: () => BigInt(0),
}));

const crypto = require('crypto');

const { TextEncoder, TextDecoder } = require('util');

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: arr => crypto.randomFillSync(arr),
  },
});



try {
  const noble = require('@noble/hashes/utils');
  if (noble) {
    noble.randomBytes = length => {
      return crypto.randomBytes(length);
    };
  }
} catch (e) {
  console.warn('Could not patch @noble/hashes');
}

// Force axios to use Node HTTP adapter in Jest (jsdom defines XMLHttpRequest by default).
if (typeof global.XMLHttpRequest !== 'undefined') {
  // @ts-ignore
  global.XMLHttpRequest = undefined;
}
