# Collector
Software design component used to gather, coordinate, and aggregate data from multiple independent sources simultaneously.

## Implementation details
Should be created for each flow, it tried to reuse the same instance, but it brings
too much concurrency problems.\
So i decided to make it super light to be able to instantiate one for each flow.\
Current implantation includes only KeyColletor due to very common and clear usage.

## Usage example
```js
const fs = require("node:fs");
const SomeAsyncContext = async () => {
  const collector = new KeyCollector(["file", "api"]);
  // using errback (callback last, error first api)
  collector.take("file", fs.readFile, "file.txt"); 
  collector.wait("api", api.getData("url"));
  const data = await collector;
  data.file // bytes
  data.api  // result from api
};
```

## Error handling
### try/catch
```js
  const collector = new KeyCollector(["a", "b"]);
  collector.all({ a: api.callA(), b: api.callB() });
  try {
    const data = await collector;
    data.a;
    data.b;
  } catch(e){
    console.error(e);
  }
```
### thenable contract
```js
  const collector = new KeyCollector(["a", "b"]);
  collector.all({ a: api.callA(), b: api.callB() });
  const onSuccess = (data) => {
    data.a;
    data.b;
  };
  const onError = (error) => {
    error;
  };
  collector.then(onSuccess, onError);
```
