# Cloudflare Pages Functions — 下載計數

`functions/downloads/[[path]].js` 會攔截 `https://assemblenotes.com/downloads/*`，
把每一次安裝檔下載寫進 Cloudflare D1 的 `download_counts` 表，再照常回傳原檔。

- **Windows**：`AssembleSetup-<版號>.exe` → `platform = 'windows'`
- **macOS**：`Assemble-<版號>-universal.dmg` → `platform = 'macos'`
- 其他檔（`.sha256`）與 HEAD / Range 續傳（206）/ 重驗（304）**不計數**。
- 只存聚合數字（platform、version、count），**不含 IP、指紋等個資**。

---

## 一次性設定

### 1) 建立資料表（在 `Assemble/worker` 這個 repo）

`download_counts` 表已加進 `Assemble/worker/schema.sql`。把它套用到遠端 D1：

```powershell
cd c:\VSCode\Assemble\worker
npx wrangler d1 execute assemble-db --remote --file schema.sql
```

> 只想補這一張表也可以：
> ```powershell
> npx wrangler d1 execute assemble-db --remote --command "CREATE TABLE IF NOT EXISTS download_counts (platform TEXT NOT NULL, version TEXT NOT NULL DEFAULT '', count INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY (platform, version));"
> ```

### 2) 在 Pages 專案綁定 D1（Cloudflare 後台，一次就好）

1. Cloudflare Dashboard → **Workers & Pages** → 選你的 Pages 專案（`assemblenotes.com`）。
2. **Settings → Functions → Bindings（或 Functions → D1 database bindings）** → **Add binding**。
3. 類型選 **D1 database**，**Variable name 填 `DB`**，資料庫選 **`assemble-db`**。
4. **Production 與 Preview 兩個環境都要加**，存檔。

> Variable name 一定要是 `DB`，跟函式裡的 `DB_BINDING` 對應。

### 3) 部署

`functions/` 目錄會被 Cloudflare Pages 自動偵測：

- **Git 整合**：push 到 GitHub → Pages 自動部署（含 Functions）。
- **Direct Upload**：`npx wrangler pages deploy .`（Functions 也會一起上傳）。

部署後，只有 `/downloads/*` 會走 Function，其餘頁面仍是純靜態（不影響速度）。

---

## 查看下載次數

```powershell
cd c:\VSCode\Assemble\worker

# 各平台、各版本
npx wrangler d1 execute assemble-db --remote --command "SELECT platform, version, count, updated_at FROM download_counts ORDER BY platform, version"

# 各平台總計
npx wrangler d1 execute assemble-db --remote --command "SELECT platform, SUM(count) AS total FROM download_counts GROUP BY platform"
```

---

## 為什麼不會弄壞下載

- 函式最後**無條件** `return await env.ASSETS.fetch(request)`，即使 D1 寫入失敗或 `DB` 未綁定，也照樣回傳原檔。
- `env.DB` 不存在時（例如還沒綁定）直接跳過計數，網站照常運作。
- 計數用 `context.waitUntil()` 在背景完成，**不拖慢下載開始速度**。
