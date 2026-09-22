# 專案維護

正式網站：https://bbyuu.github.io/CalculMabi/

| 檔案 | 用途 |
| --- | --- |
| dist/index.html、app.js、calculator.js | 一般技能修練、材料合計 |
| dist/bonuses.js | 修練加成規則 |
| dist/data/skills.json | 技能、Rank、修練條件與單次材料 |
| dist/dan.html、dan-app.js、dan-planner.js | 升段目標與購物清單 |
| dist/data/dan.json | 打鐵、衣物製作的成品配方與 NPC 選項 |
| dist/dan-rounds.js | 魔法製造、稀原工學的固定考試目標 |
| dist/erg.html、erg-app.js、erg-calculator.js | 聚能材料與次數 |
| dist/data/erg.json | 各武器的開放材料與成功率 |
| dist/data/erg-stacks.json | 道具堆疊容量 |
| dist/erg-feed.js | 飼料用量與經驗 |
| dist/stardust.html、stardust-calculator.js | 星塵任務需求 |
| dist/skill-navigation.js、theme.js | 共用導覽與外觀 |
| scripts/build.mjs | 建置、資源版本與預載 |
| .github/workflows/pages.yml | GitHub Pages 部署 |

新增資料需維持既有項目 ID，避免破壞瀏覽器儲存的選擇。技能材料只記錄名稱、單次用量與資料完整度；缺少用量時維持未定量狀態。

修改後執行 npm test、npm run check、npm run build，並確認相關頁面載入與材料合計。部署只包含 dist 內的網站檔案。
