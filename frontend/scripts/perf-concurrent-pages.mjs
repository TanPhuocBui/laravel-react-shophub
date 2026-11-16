// Real concurrent tabs. HTTP failures/timeouts are observed, never mocked.
export async function measureConcurrentPages({ call, base, debugPort }) {
  const results = [];
  for (let round = 1; round <= 5; round++) {
    const tabs = [];
    for (let index = 0; index < 3; index++) {
      const { targetId } = await call('Target.createTarget', { url: 'about:blank' });
      const target = (await (await fetch('http://localhost:' + debugPort + '/json/list')).json()).find((p) => p.id === targetId);
      const ws = new WebSocket(target.webSocketDebuggerUrl);
      await new Promise((done) => ws.addEventListener('open', done, { once: true }));
      let id = 0; const pending = new Map(), network = [];
      ws.addEventListener('message', ({ data }) => {
        const e = JSON.parse(data);
        if (e.id) { pending.get(e.id)?.(e.result); pending.delete(e.id); }
        if (e.method === 'Network.responseReceived' && e.params.response.url.includes('/api/')) network.push({ url: new URL(e.params.response.url).pathname, status: e.params.response.status });
        if (e.method === 'Network.loadingFailed' && !e.params.canceled) network.push({ error: e.params.errorText });
      });
      const send = (method, params = {}) => new Promise((done) => { const seq = ++id; pending.set(seq, done); ws.send(JSON.stringify({ id: seq, method, params })); });
      await send('Page.enable'); await send('Network.enable');
      const evaluate = async (fn) => (await send('Runtime.evaluate', { expression: '(' + fn + ')()', returnByValue: true })).result?.value;
      tabs.push({ targetId, ws, send, evaluate, network });
    }
    const start = Date.now();
    await Promise.all(tabs.map((t) => t.send('Page.navigate', { url: base + '/' })));
    const roundResults = await Promise.all(tabs.map(async (tab, index) => {
      let ready = false, failed = false;
      const end = Date.now() + 30000;
      while (Date.now() < end) {
        const state = await tab.evaluate(() => ({ ready: !!document.querySelector('.hero'), failed: !!document.querySelector('.state-panel [role="alert"]') }));
        if (state?.ready || state?.failed) { ready = state.ready; failed = state.failed; break; }
        await new Promise((done) => setTimeout(done, 25));
      }
      return { round, tab: index + 1, success: ready, failed, readyMs: Date.now() - start, reloads: 0, retries: 0, network: tab.network };
    }));
    for (const [index, tab] of tabs.entries()) if (!roundResults[index].success) {
      await tab.evaluate(() => document.querySelector('.state-panel button')?.click());
      roundResults[index].retries = 1;
      const end = Date.now() + 30000;
      while (Date.now() < end && !await tab.evaluate(() => !!document.querySelector('.hero'))) await new Promise((done) => setTimeout(done, 50));
      roundResults[index].recoveredWithoutReload = await tab.evaluate(() => !!document.querySelector('.hero'));
    }
    results.push(...roundResults);
    for (const tab of tabs) { tab.ws.close(); await call('Target.closeTarget', { targetId: tab.targetId }); }
    console.log('CONCURRENT ' + JSON.stringify(results.slice(-3).map(({ network: _network, ...sample }) => sample)));
    await new Promise((done) => setTimeout(done, 1000));
  }
  return results;
}
