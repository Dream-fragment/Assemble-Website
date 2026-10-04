/* ============================================================
   Assemble — 官網 Worker（assemble-website）
   ------------------------------------------------------------
   用途：純靜態站 + 一支 fetch script，只在安裝檔下載時計數。

   路由設定（wrangler.jsonc）：
     assets.directory   = "."              整個 repo 當靜態資源
     assets.binding     = "ASSETS"         env.ASSETS 可用
     assets.run_worker_first = ["/downloads/*"]
       → 只有 /downloads/* 會先跑這支 script；其餘頁面走純靜態快取。

   行為：
     - GET 且回 200 的 .exe / .dmg → D1 download_counts +1
     - 其他（.sha256、HEAD、206 續傳、304 重驗）→ 不計數
     - 一律用 env.ASSETS.fetch() 回原檔；計數失敗也絕不影響下載（fail-open）
   ============================================================ */

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const name = url.pathname.split('/').pop() || '';
        const lower = name.toLowerCase();
        const platform = lower.endsWith('.exe') ? 'windows'
            : lower.endsWith('.dmg') ? 'macos'
                : null;

        // 先取得檔案（保留 Range / ETag / 快取等原始行為）
        const response = await env.ASSETS.fetch(request);

        // 只在「真的送出檔案本體」時計數：GET + 200
        if (platform && request.method === 'GET' && response.status === 200 && env.DB) {
            const version = (name.match(/(\d+\.\d+\.\d+)/) || [])[1] || '';
            try {
                await env.DB.prepare(
                    'INSERT INTO download_counts (platform, version, count) ' +
                    'VALUES (?, ?, 1) ' +
                    'ON CONFLICT(platform, version) DO UPDATE SET ' +
                    '    count = download_counts.count + 1, ' +
                    '    updated_at = datetime(\'now\')'
                ).bind(platform, version).run();
            } catch (e) {
                console.error('download count failed:', e);
            }
        }

        // ★ 無條件回傳原始檔：就算上面任何一步失敗，下載照常
        return response;
    },
};
