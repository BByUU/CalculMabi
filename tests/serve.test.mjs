import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreviewServer} from '../scripts/serve.mjs';

test('本機預覽使用圖片 MIME，測試頁僅於測試模式提供', async t => {
  for (const testMode of [false, true]) {
    const server=createPreviewServer({testMode});
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    t.after(()=>new Promise(resolve=>server.close(resolve)));
    const base=`http://127.0.0.1:${server.address().port}`;
    for (const [file, mime] of [['calculmabi-icon.png','image/png'],['weapons-line/staff.webp','image/webp']]) {
      const response=await fetch(`${base}/assets/${file}`);
      assert.equal(response.status,200);
      assert.equal(response.headers.get('content-type'),mime);
      await response.arrayBuffer();
    }
    const response=await fetch(`${base}/__tests__/browser.html`);
    assert.equal(response.status,testMode?200:404);
    await response.text();
    const escaped=await fetch(`${base}/%2e%2e%2fpackage.json`);
    assert.equal(escaped.status,403);
    await escaped.text();
  }
});
