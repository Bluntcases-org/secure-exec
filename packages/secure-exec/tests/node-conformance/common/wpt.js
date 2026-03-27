'use strict';

function getAssert() {
  return require('assert');
}

function test(fn, _description) {
  fn();
}

function assert_equals(actual, expected, message) {
  getAssert().strictEqual(actual, expected, message);
}

function assert_array_equals(actual, expected, message) {
  getAssert().deepStrictEqual(actual, expected, message);
}

function assert_unreached(message) {
  getAssert().fail(message || 'Reached unreachable code');
}

module.exports = {
  harness: {
    test,
    assert_equals,
    assert_array_equals,
    assert_unreached,
  },
};
