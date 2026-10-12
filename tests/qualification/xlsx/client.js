window.bytesFromBase64 = (encoded) => {
  const binary = atob(encoded),
    bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};
// No application UI, persistence or customer-file handling.
window.probe = (request, timeout = 15000) =>
  new Promise((resolve) => {
    const start = performance.now(),
      worker = new Worker("/worker.mjs", { type: "module" });
    let ticks = 0;
    const stages = [];
    const heartbeat = setInterval(() => ticks++, 10);
    const finish = (result) => {
      clearTimeout(timer);
      clearInterval(heartbeat);
      worker.terminate();
      resolve({ ...result, wallMs: performance.now() - start, ticks, stages });
    };
    const timer = setTimeout(
      () => finish({ ok: false, error: "WATCHDOG_CANCELLED" }),
      timeout,
    );
    worker.onmessage = (e) => {
      if (e.data.stage) stages.push(e.data.stage);
      else finish(e.data);
    };
    worker.onerror = () => finish({ ok: false, error: "WORKER_ERROR" });
    worker.postMessage(request);
  });
