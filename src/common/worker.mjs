import workerThreads from "node:worker_threads";

import { Invoke } from "./invoke.mjs";

const i = new Invoke();
const fn = await i.loadFn(workerThreads.workerData.fnDef);

workerThreads.parentPort.on("message", async (messageData) => {
  const { args, port } = messageData;
  let res;

  try {
    res = await fn(...args);
  } catch (err) {
    port.postMessage(err);
  }

  port.postMessage(res);
});
