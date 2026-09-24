# 專案概況

- 名稱：瑪奇小算盤 CalculMabi。
- 用途：技能修練與升段備料、聚能材料、星塵任務次數、特性升級需求計算與讀書型技能升級查詢。
- 技術：HTML、CSS、原生 JavaScript ES modules；沒有前端框架、後端應用或資料庫。
- 開發環境：Node.js 20 以上，GitHub Actions 使用 Node.js 22；npm 執行專案命令。目前沒有宣告第三方套件依賴。
- 本文件適用於整個專案。操作與維護入口為 README.md，不要求另建 spec、架構或 handoff 文件。
- 使用者明確指令及目前程式、設定、測試為確認需求的依據；無法確認的內容不得寫成事實。

# 主要檔案

- `dist/index.html`、`app.js`、`calculator.js`、`bonuses.js`：技能修練介面、次數、加成與材料計算。
- `dist/dan.html`、`dan-app.js`、`dan-planner.js`、`dan-rounds.js`：升段選題、前置製作與採購清單。
- `dist/erg.html`、`erg-app.js`、`erg-calculator.js`、`erg-feed.js`：聚能開放、材料、費用與飼料。
- `dist/stardust.html`、`stardust-app.js`、`stardust-calculator.js`：星塵任務與獎勵計算。
- `dist/traits.html`、`traits-app.js`、`traits-calculator.js`：特性等級、璞黎點、AP、結晶與每週上限週數。
- `dist/reading.html`、`reading.js`、`reading.css`：讀書型技能簡表與滑鼠、鍵盤、觸控取得詳情。
- `dist/data/`：網站必要數據；`dist/assets/`：網站圖像。
- `dist/skill-navigation.js`、`navigation.js`、`theme.js`：導覽及共用互動。
- `dist/format.js`：前端與建置共用的文字跳脫及數字格式。
- `scripts/serve.mjs`：本機預覽；`scripts/build.mjs`：建置、預載及資源版本。
- `tests/`：Node.js 內建測試，涵蓋計算、資料與建置。
- `.github/workflows/pages.yml`：main 推送後執行測試、建置及 GitHub Pages 部署。

# 命令

| 用途 | 已確認命令或狀態 |
| --- | --- |
| 環境 | 安裝符合版本的 Node.js 與 npm；目前無需安裝專案套件 |
| 本機預覽 | `npm run dev`，網址 `http://127.0.0.1:4173/` |
| 測試 | `npm test`；包含計算單元測試及檔案、建置整合檢查 |
| 瀏覽器回歸 | 先 `npm run build`，再 `npm run test:browser`，開啟命令輸出的本機測試網址並按「執行測試」；不會自動啟動瀏覽器 |
| JavaScript 語法檢查 | `npm run check`，依 package.json 所列檔案執行 |
| Lint／格式檢查 | 未設定 linter 或 formatter；提交前執行 `git diff --check` |
| 型別檢查 | 未設定 |
| 建置 | `npm run build`，輸出 `.pages/` |

不得假設其他工具已安裝，不得宣稱未執行的檢查已通過。

# 修改規則

- 修改前確認受影響的頁面、模組匯出、資料欄位、本機儲存格式、對外請求、部署設定與測試。改變行為或部署前，核對使用者需求、README.md 及現行程式。
- 限於需求與必要連帶調整，不做無關重構、框架遷移或依賴升級。沿用現有模組配置、命名及各檔案風格。
- 盡量維持計算函式與畫面操作分離。保留現有項目 ID 及已儲存設定的相容性；變更資料欄位時同步調整使用端與驗證。
- 網站部署於 GitHub Pages 的專案子路徑。資源及頁面連結應支援相對路徑，建置後確認導覽與資源版本。
- 保留繁體中文、緊密表格、橫向子分頁及深淺色模式。數值規則依使用者已確認需求與測試維護，不擅自以通用假設取代。
- 不讀取、輸出或寫入明文秘密，不把權杖、密碼或本機私有設定放進程式、文件或 Git。
- 公開內容只保留網站必要數據。不提交試算表原檔、完整匯出快照、原始公式、儲存格座標或相關來源註記。`source/`、本機歷史備份及輸出暫存不得推送；不要合併或推回重建前的歷史。
- 保留使用者既有變更，不任意覆蓋或還原無關檔案。新增功能或修改規則時，按需要更新 README.md；既有 docs 查核資料可按需讀取，不要求增加一套文件。
- 完成前執行受影響的測試及已設定檢查。對介面或部署變更確認實際頁面；說明未執行的項目、原因與剩餘問題。

# 效能與公開內容檢查

- 勾選、次數及價格變更應保留原輸入節點與鍵盤焦點，優先更新受影響列及合計。不要用整表 `innerHTML` 加重新 `focus()` 掩蓋節點重建；路線、篩選或資料結構改變時才重建必要區域。
- 修改互動更新時，以實際瀏覽器驗證 Tab、空白鍵、解鎖狀態、同名單價同步、篩選、重設及錯誤後恢復。局部更新的顯示數量與金額須和完整計算一致，補入 `tests/browser.js` 的相關案例。
- 字型不可透過 CSS `@import` 串行載入；HTML 直接宣告字型與所需的 preconnect。保留已使用字重，減少字重或自架子集前確認外觀、授權、字元涵蓋與維護成本。
- `dist/` 只放執行時使用的資源。原始圖片與產圖中繼檔放在已忽略的 `source/` 或 `output/`；移除素材時核對動態引用、建置輸出及 `.gitignore`。加入 ignore 不會移除既有追蹤，必須另查 `git ls-files` 與暫存區。
- 發布前確認測試頁未混入 `.pages/`，本機輸入、備份及產圖暫存未被追蹤或混入部署內容。沿用資料衛生與資源檢查測試；重建 repo 只推乾淨根提交，不推舊分支、標籤、bundle 或完整 mirror。未經使用者要求不改寫公開歷史。
- 共用文字跳脫與一般數字格式使用 `dist/format.js`；金幣分組沿用聚能規則。新增資源格式時確認預覽伺服器 MIME。效能報告註明環境、操作、樣本與量測範圍，區分同步事件耗時、繪製及網路時間；不得將他人量測當成本次實測。

# 接續工作

開始修改前讀取本文件、README.md、`git status`、`git diff` 與最近的 `git log`。以程式、Git 與實際驗證輸出核對先前摘要。若發現矛盾、未完成項目或非本次工作的修改，先回報狀態與預計修改範圍，再處理；不得直接覆蓋或還原。

# Git 提交

每個可獨立驗證的子步驟完成後建立 commit，避免累積不相關變更。不得 amend、rebase 或 force push 已存在的 commits，除非使用者明確要求。

小型文件或格式修改：

```text
type(scope): short summary
```

一般功能、修正、跨檔案或行為變更：

```text
type(scope): short summary

Why:
- modification reason

Changes:
- important behavior or structure change

Verification:
- checks actually executed
- checks not executed and reason

Risks:
- remaining risk; omit when none
```

提交訊息只記錄實際驗證；高風險變更說明剩餘風險。中斷前提交已驗證的獨立步驟，並在回覆中交代未完成事項，不建立 HANDOFF.md。
