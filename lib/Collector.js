"use strict";

const ONCE = { once: true };

class Collector {
  #data = null;
  #collected = 0;
  #cleanup = null;
  #resolve = null;
  #reject = null;
  #cause = null;

  constructor(collect) {
    this.#data = new Array(collect);
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
    signal.addEventListener("abort", listener, ONCE);
    return this;
  }

  #fail(error) {
    if (this.resolved) return;
    this.#cause = error;
    this.#finish();
  }

  set(value) {
    if (this.resolved) return false;
    this.#data[this.#collected++] = value;
    if (this.collected) this.#finish();
    return true;
  }

  #finish() {
    if (this.collected) {
      if (this.#resolve === null) return;
      this.#resolve(this.#data);
      return void this.#clean();
    }
    if (this.failed) {
      if (this.#reject === null) return;
      this.#reject(this.#cause);
      return void this.#clean();
    }
  }

  #clean() {
    if (this.#cleanup === null) return;
    this.#cleanup();
    this.#cleanup = null;
  }

  get collected() {
    return this.#collected === this.#data.length;
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

  take(callback, ...args) {
    callback(...args, (err, data) => {
      if (err) this.#fail(err);
      else this.set(data);
    });
    return this;
  }

  wait(promise) {
    promise.then(data => this.set(data),
      err => this.#fail(err));
    return this;
  }

  all(promises) {
    for (const promise of promises) this.wait(promise);
    return this;
  }

  static from(collect) {
    return new Collector(collect);
  }
}

module.exports = Collector;
