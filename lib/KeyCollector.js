'use strict';

const { array, iterator } = require("naughty-util");

class KeyCollector {
  #keys = null;
  #data = new Map();
  #cleanup = null;
  #resolve = null;
  #reject = null;
  #cause = null;

  constructor(keys) {
    this.#setKeys(keys);
  }

  #setKeys(keys) {
    if (!array.valid(keys)) {
      throw new Error('keys should be a valid array');
    }
    this.#keys = new Set(keys);
  }

  signal(signal) {
    if (signal == null) return this;
    const listener = () => void this.#fail(new Error('Aborted'));
    const cleanup = () =>
      void signal.removeEventListener("abort", listener);
    if (this.#cleanup !== null) {
      const prev = this.#cleanup;
      this.#cleanup = () => void (prev(), cleanup());
    } else {
      this.#cleanup = cleanup;
    }
    signal.addEventListener("abort", listener, { once: true });
    return this;
  }

  #fail(error) {
    if (this.collected || this.failed) return;
    this.#cause = error;
    this.#finish();
  }

  set(key, value) {
    if (this.collected || this.failed || !this.#keys.has(key)) return;
    this.#data.set(key, value);
    if (this.collected) this.#finish();
  }

  #finish() {
    if (this.#resolve === null) return;
    if (this.collected) {
      const data = {};
      for (const entry of this.#data) data[entry[0]] = entry[1];
      this.#resolve(data);
      return void this.#clean();
    }
    if (this.failed) {
      this.#reject(this.#cause);
      return void this.#clean();
    }
  }

  #clean() {
    this.#data.clear();
    this.#reject = this.#resolve = this.#cause = null;
    if (this.#cleanup) {
      this.#cleanup();
      this.#cleanup = null;
    }
  }

  get collected() {
    return this.#data.size === this.#keys.size;
  }

  get failed() {
    return this.#cause !== null;
  }

  then(resolve, reject) {
    this.#resolve = resolve;
    this.#reject = reject;
    this.#finish();
  }

  reassign(keys) {
    if (this.#data.size > 0) return this;
    this.#setKeys(keys);
    return this;
  }

  take(key, callback, ...args) {
    callback(...args, (err, data) => {
      if (err) this.#fail(err);
      else this.set(key, data);
    });
    return this;
  }

  wait(key, promise) {
    promise.then(data => this.set(key, data),
      err => this.#fail(err));
    return this;
  }

  all(dataset) {
    for (const entry of iterator.object.entries(dataset)) {
      entry[1].then(data => this.set(entry[0], data),
        err => this.#fail(err));
    }
    return this;
  }

  static from(keys) {
    return new KeyCollector(keys);
  }
}

module.exports = KeyCollector;
