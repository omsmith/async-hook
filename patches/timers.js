'use strict';

const timers = require('timers');

function TimeoutWrap() {}
function IntervalWrap() {}
function ImmediateWrap() {}

const timeoutMap = new Map();
const intervalMap = new Map();
const ImmediateMap = new Map();

module.exports = function patch() {
  patchTimer(this._hooks, this._state, 'setTimeout', 'clearTimeout', TimeoutWrap, timeoutMap, true);
  patchTimer(this._hooks, this._state, 'setInterval', 'clearInterval', IntervalWrap, intervalMap, false);
  patchTimer(this._hooks, this._state, 'setImmediate', 'clearImmediate', ImmediateWrap, ImmediateMap, true);

  global.setTimeout = timers.setTimeout;
  global.setInterval = timers.setInterval;
  global.setImmediate = timers.setImmediate;

  global.clearTimeout = timers.clearTimeout;
  global.clearInterval = timers.clearInterval;
  global.clearImmediate = timers.clearImmediate;
};

function patchTimer(hooks, state, setFn, clearFn, Handle, timerMap, singleCall) {
  const oldSetFn = timers[setFn];
  const oldClearFn = timers[clearFn];

  // overwrite set[Timeout]
  timers[setFn] = function () {
    if (!state.enabled) return oldSetFn.apply(timers, arguments);

    const args = Array.from(arguments);
    const callback = args[0];

    const handle = new Handle();
    const uid = --state.counter;
    let timerId;

    // call the init hook
    hooks.init.call(handle, 0, uid, null);

    // overwrite callback
    args[0] = function () {
      // call the pre hook
      hooks.pre.call(handle);

      callback.apply(this, arguments);

      // call the post hook
      hooks.post.call(handle);

      // call thie destroy hook if the callback will only be called once
      if (singleCall) {
        timerMap.delete(timerId);
        hooks.destroy.call(null, uid);
      }
    };

    timerId = oldSetFn.apply(timers, args);
    // Bind the timerId and uid for later use, in case the clear* function is
    // called.
    timerMap.set(timerId, uid);

    return timerId;
  };

  // overwrite clear[Timeout]
  timers[clearFn] = function (timerId) {
    // clear should call the destroy hook. Note if timerId doesn't exists
    // it is because asyncWrap wasn't enabled at the time.
    if (timerMap.has(timerId)) {
      const uid = timerMap.get(timerId);
      timerMap.delete(timerId);
      hooks.destroy.call(null, uid);
    }

    oldClearFn.apply(timers, arguments);
  };
}
