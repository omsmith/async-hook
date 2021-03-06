'use strict';

const assert = require('assert');

const existing = global._asyncHook = {
  version: '0.0.0'
};

try {
  require('../');
} catch (e) {
  assert.equal(e.message, 'Conflicting version of async-hook found');
}
