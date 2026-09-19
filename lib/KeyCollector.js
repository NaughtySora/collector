'use strict';

const { array, iterator } = require("naughty-util");

const ONCE = { once: true };

class KeyCollector {
  #data = {};
  #collected = 0;
  #keys = null;
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
    if (this.resolved || signal == null) return this;
    const listener = () => void this.#fail(new Error('Aborted'));
    const cleanup = () =>
      void signal.removeEventListener("abort", listener);
    if (this.#cleanup !== null) {
      const prev = this.#cleanup;
      this.#cleanup = () => void (prev(), cleanup());
    } else {
      this.#cleanup = cleanup;
    }
    signal.addEventListener("abort", listener, ONCE);
    return this;
  }

  #fail(error) {
    if (this.resolved) return;
    this.#cause = error;
    this.#finish();
  }

  set(key, value) {
    if (this.resolved || !this.#keys.has(key)) return false;
    this.#data[key] = value;
    this.#collected++;
    if (this.collected) this.#finish();
    return true;
  }

  #finish() {
    if (this.collected) {
      if (this.#resolve === null) return;
      this.#resolve(this.#data);
      this.#resolve = null;
      return void this.#clean();
    }
    if (this.failed) {
      if (this.#reject === null) return;
      this.#reject(this.#cause);
      this.#reject = null;
      return void this.#clean();
    }
  }

  #clean() {
    if (this.#cleanup === null) return;
    this.#cleanup();
    this.#cleanup = null;
  }

  get collected() {
    return this.#collected === this.#keys.size;
  }

  get failed() {
    return this.#cause !== null;
  }

  get resolved() {
    return this.collected || this.failed;
  }

  then(resolve, reject) {
    if (this.#resolve !== null) {
      const head = this.#resolve;
      this.#resolve = value => void (head(value), resolve(value));
    } else {
      this.#resolve = resolve;
    }
    if (this.#reject !== null) {
      const head = this.#reject;
      this.#reject = value => void (head(value), reject(value));
    } else {
      this.#reject = reject;
    }
    this.#finish();
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
