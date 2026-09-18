"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { describe, it } = require("node:test");
const { KeyCollector } = require("../main");
const { async } = require("naughty-util");

const FILE = "./KeyCollector.js";
const FILEPATH = path.join(__dirname, FILE);

describe("KeyCollector", async () => {
  await it("errback", async () => {
    const c = KeyCollector.from(["file", "file2"]);
    c.take("file", fs.readFile, FILEPATH);
    c.take("file2", fs.readFile, FILEPATH);
    const data = await c;
    assert.ok(data.file != null);
    assert.ok(data.file2 != null);
  });

  await it("signal", async () => {
    const c = KeyCollector.from(["file", "file2", "delay"]);
    c.signal(AbortSignal.timeout(0));
    c.take("file", fs.readFile, FILEPATH);
    c.take("file2", fs.readFile, FILEPATH);
    c.set("delay", await async.pause(100));
    await assert.rejects(
      async () => void await c,
      { message: "Aborted" }
    );
  });

  await it("all", async () => {
    const f = async () => (await async.pause(555), 1);
    const f1 = async () => (await async.pause(444), "test");
    const c = KeyCollector.from(["f", "f1", "file"]);
    c.all({ f: f(), f1: f1() });
    c.take("file", fs.readFile, FILEPATH);
    await c;
  });

  await it("wait", async () => {
    const p0 = Promise.withResolvers();
    const p1 = Promise.withResolvers();
    const p2 = Promise.withResolvers();
    const c = new KeyCollector(["p0", "p1"]);
    setTimeout(() => {
      p0.resolve(0);
    }, 250);
    setTimeout(() => {
      p1.resolve(1);
    }, 300);
    setTimeout(() => {
      p2.resolve(2);
    }, 333);
    c.wait("p0", p0.promise);
    c.wait("p1", p1.promise);
    c.wait("p2", p1.promise);
    const data = await c;
    assert.ok(data.p0 != null);
    assert.ok(data.p1 != null);
    assert.ok(data.p2 == null);
  });

  await it("many signals", async () => {
    const c = new KeyCollector(["p0"]);
    c.signal(AbortSignal.timeout(1000));
    c.signal();
    const contr = new AbortController();
    setTimeout(() => {
      c.set("p0", 1);
    }, 350);
    c.signal(contr.signal);
    setTimeout(() => {
      contr.abort();
    }, 100);
    await assert.rejects(
      async () => void await c,
      { message: "Aborted" }
    );
  });

  await it("reassign", async () => {
    const c = new KeyCollector(["p0"]);
    setTimeout(() => {
      c.set("p0", 1);
    }, 350);
    const { p0 } = await c;
    assert.equal(p0, 1);
    assert.throws(() => {
      c.reassign()
    }, { message: "keys should be a valid array" });
    c.reassign(["a", "b"]);
    setTimeout(() => {
      c.set("a", 1);
      c.set("b", 2);
    }, 350);
    const { a, b } = await c;
    assert.equal(a, 1);
    assert.equal(b, 2);
  });

  await it("failing", () => {
    const c = new KeyCollector(["a", "b", "c"]);
    assert.rejects(async () => {
      await c
        .wait("b", async.reject(125))
        .wait("a", async.resolve(50, 1))
        .wait("c", async.resolve(250, 2));
    }, { message: "Promise reject timeout" });
  });
});
