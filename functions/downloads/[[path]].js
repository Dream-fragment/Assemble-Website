/* ============================================================
   Assemble — 安裝檔下載計數（Cloudflare Pages Function）
   ------------------------------------------------------------
   路徑：functions/downloads/[[path]].js
   攔截：https://assemblenotes.com/downloads/*

   行為：
     - 使用者點 download.html 的「Download for Windows / Mac」時，
       請求會先經過這裡，把 +1 寫進 Cloudflare D1（download_counts 表）。
     - 之後「無條件」用 env.ASSETS.fetch() 回傳原始靜態檔，
       計數失敗也絕不影響下載（fail-open）。

   檔名判斷：
     AssembleSetup-<ver>.exe        → windows
     Assemble-<ver>-universal.dmg   → macos
     其他（.sha256、HEAD、Range 續傳 206、重驗 304）→ 不計數

   ★ 一次性設定（詳見同資料夾 README.md）：
     在 Cloudflare Pages 專案後台，把 D1 資料庫 assemble-db 綁成變數名稱 DB。

   IMPORTANT: 不要 minify / 壓縮這個檔案。
   ============================================================ */

var DB_BINDING = 'DB';

function fileNameFrom(paramsPath) {
    var path = Array.isArray(paramsPath)
        ? paramsPath.join('/')
        : String(paramsPath || '');
    var parts = path.split('/').filter(Boolean);
    return parts.length ? parts[parts.length - 1] : '';
}

function platformOf(name) {
    var lower = name.toLowerCase();
    if (lower.endsWith('.exe')) return 'windows';
    if (lower.endsWith('.dmg')) return 'macos';
    return null;
}

function versionOf(name) {
    var m = name.match(/(\d+\.\d+\.\d+)/);
    return m ? m[1] : '';
}

export async function onRequest(context) {
    var request = context.request;
    var env = context.env;
    var name = fileNameFrom(context.params && context.params.path);
    var platform = platformOf(name);

    // 先取得檔案（保留 Range / ETag / 快取等原始行為）
    var response = await env.ASSETS.fetch(request);

    // 只在「真的送出檔案本體」時計數：GET + 200
    // （206 續傳 / 304 重驗 / HEAD 都不算一次新的下載）
    if (platform && request.method === 'GET' && response.status === 200 && env[DB_BINDING]) {
        var version = versionOf(name);
        context.waitUntil(
            env[DB_BINDING].prepare(
                'INSERT INTO download_counts (platform, version, count) ' +
                'VALUES (?, ?, 1) ' +
                'ON CONFLICT(platform, version) DO UPDATE SET ' +
                '    count = download_counts.count + 1, ' +
                '    updated_at = datetime(\'now\')'
            )
                .bind(platform, version)
                .run()
                .catch(function (e) { console.error('download count failed:', e); })
        );
    }

    // ★ 無條件回傳原始檔：就算上面任何一步失敗，下載照常
    return response;
}
