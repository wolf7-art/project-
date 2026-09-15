# 搜尋提交與空結果狀態實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將四個靜態頁面的站內搜尋改為按 Enter 才執行，並在零結果時顯示 Figma `3452:962` 的完整空結果狀態。

**Architecture:** 保留每頁既有 `[data-search-item]` 資料來源，將搜尋面板改為表單並由共用 `js/main.js` 處理提交。使用 `body.is-search-empty` 切換一般頁面與空結果區域，首頁僅收合輪播內容並保留原 Header，其他頁面沿用既有 Header／Footer。

**Tech Stack:** 靜態 HTML、CSS、原生 JavaScript、Playwright CLI。

## Global Constraints

- 僅修改搜尋提交與空結果狀態，不擴充為跨頁索引。
- 不新增 dependency、路由或第三方套件。
- 保留中文註解與既有 HTML／CSS／JavaScript 架構。
- 不執行 CI、lint 或 build。
- 驗證以 Playwright 真實瀏覽器流程與 `node --check js/main.js` 為準。

---

### Task 1: 建立搜尋行為失敗基線

**Files:**
- Modify: none
- Test: 現有 `index.html` 與 `js/main.js`

**Interfaces:**
- Consumes: `[data-search-toggle]`、`[data-search-input]`、`[data-search-item]`、`[data-search-empty]`
- Produces: 可重現「輸入尚未按 Enter 就改變結果」的失敗證據

- [ ] **Step 1: 啟動或確認本機靜態網站**

```powershell
py -m http.server 8000
```

- [ ] **Step 2: 開啟瀏覽器工作階段**

```powershell
npx.cmd --yes --package @playwright/cli playwright-cli --session search-submit open http://127.0.0.1:8000/
npx.cmd --yes --package @playwright/cli playwright-cli --session search-submit snapshot
```

- [ ] **Step 3: 執行預期失敗的提交前不變性檢查**

```powershell
npx.cmd --yes --package @playwright/cli playwright-cli --session search-submit run-code "await page.locator('[data-search-toggle]').click(); await page.locator('[data-search-input]').fill('完全不存在的內容'); const hiddenItems = await page.locator('[data-search-item][hidden]').count(); const panelEmpty = await page.locator('[data-search-empty]:visible').count(); if (hiddenItems !== 0 || panelEmpty !== 0) throw new Error('輸入尚未提交就改變搜尋結果');"
```

Expected: FAIL，錯誤訊息為「輸入尚未提交就改變搜尋結果」。

---

### Task 2: 將搜尋面板改為提交式互動

**Files:**
- Modify: `index.html:73-92`
- Modify: `products.html:38-50`
- Modify: `journal.html:38-50`
- Modify: `article.html:38-50`
- Modify: `js/main.js:124-190`
- Test: Playwright `search-submit` 工作階段

**Interfaces:**
- Consumes: 每頁現有 `#site-search-panel` 與 `[data-search-item]`
- Produces: `[data-search-form]` submit 事件、`[data-search-empty-page]` 狀態與 `body.is-search-empty`

- [ ] **Step 1: 將四頁搜尋面板改為表單並移除面板內空狀態**

```html
<form class="site-search" id="site-search-panel" role="search" aria-label="站內搜尋" data-search-form hidden>
  <!-- 保留既有 header、label、input 與 summary -->
</form>
```

- [ ] **Step 2: 在四頁既有 main 內加入預設隱藏的完整空結果區域**

```html
<section class="search-empty-page" aria-labelledby="site-search-empty-title" data-search-empty-page hidden>
  <div class="search-empty-page__content">
    <h1 class="search-empty-page__title" id="site-search-empty-title">找不到符合條件的選物</h1>
    <p>試著調整搜尋關鍵字，或瀏覽其他生活提案。</p>
  </div>
</section>
```

- [ ] **Step 3: 以 submit 事件取代 input 即時篩選**

```javascript
const form = panel.matches("[data-search-form]") ? panel : null;
const emptyPage = document.querySelector("[data-search-empty-page]");

const submitSearch = (event) => {
  event.preventDefault();
  const query = normalize(input.value);

  if (query === "") {
    summary.textContent = "請輸入搜尋關鍵字";
    input.focus();
    return;
  }

  const matches = items.filter((item) => normalize(item.textContent).includes(query));
  const hasMatches = matches.length > 0;

  items.forEach((item) => {
    item.hidden = hasMatches && !matches.includes(item);
  });

  document.body.classList.toggle("is-search-empty", !hasMatches);
  emptyPage.hidden = hasMatches;
  summary.textContent = `找到 ${matches.length} 項符合「${input.value.trim()}」的內容`;
  closeSearch();
};

form.addEventListener("submit", submitSearch);
```

- [ ] **Step 4: 調整 open／close，避免未提交操作改變結果**

```javascript
const openSearch = () => {
  panel.hidden = false;
  toggle.setAttribute("aria-expanded", "true");
  summary.textContent = `可搜尋 ${items.length} 項內容`;
  input.focus();
};

const closeSearch = () => {
  panel.hidden = true;
  toggle.setAttribute("aria-expanded", "false");
  input.value = "";
  toggle.focus();
};
```

- [ ] **Step 5: 執行 JavaScript 語法檢查**

```powershell
node --check js/main.js
```

Expected: exit code 0。

- [ ] **Step 6: 重跑 Task 1 檢查**

Expected: PASS，輸入但尚未按 Enter 時沒有任何 `[data-search-item]` 變成 hidden，且沒有空狀態出現。

---

### Task 3: 實作 Figma 完整空結果版型

**Files:**
- Modify: `css/layout.css`
- Test: Playwright `search-submit` 工作階段

**Interfaces:**
- Consumes: `body.is-search-empty`、`.search-empty-page`、首頁 `.home-hero`
- Produces: 桌面 480px 空狀態內容、24px 字級、16px 間距、Header／Footer 保留與行動版收斂

- [ ] **Step 1: 加入空結果內容版型**

```css
.search-empty-page {
  display: flex;
  min-height: calc(100svh - 100px - 187px - var(--space-section));
  padding: 80px 24px 0;
  justify-content: center;
}

.search-empty-page[hidden] {
  display: none;
}

.search-empty-page__content {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  width: min(480px, 100%);
  color: var(--color-charcoal);
  font-size: var(--font-h3);
  line-height: 1;
}

.search-empty-page__title {
  font: inherit;
}
```

- [ ] **Step 2: 切換一般頁面與空結果內容**

```css
.is-search-empty .page-shell {
  min-height: 0;
}

.is-search-empty .page-shell > :not(.search-empty-page),
.is-search-empty.home-page main > :not(.home-hero):not(.search-empty-page),
.is-search-empty.home-page .home-hero > :not(.site-header):not(.site-search) {
  display: none;
}

.is-search-empty.home-page .home-hero {
  min-height: 100px;
  height: 100px;
  background: var(--color-white);
}
```

- [ ] **Step 3: 將首頁空結果狀態的 Overlay Header 還原為 Figma 白底樣式**

```css
.is-search-empty .site-header--overlay {
  position: relative;
  color: var(--color-charcoal);
  background: var(--color-white);
  border-bottom: 4px solid var(--color-border-soft);
}

.is-search-empty .site-header--overlay .header-search img {
  filter: none;
}
```

- [ ] **Step 4: 加入 768px 以下響應式規則**

```css
@media (max-width: 768px) {
  .search-empty-page {
    min-height: 420px;
    padding: 64px 20px 0;
  }

  .is-search-empty.home-page .home-hero {
    min-height: 76px;
    height: 76px;
  }
}
```

---

### Task 4: 真實瀏覽器回歸驗證與本地提交

**Files:**
- Verify: `index.html`
- Verify: `products.html`
- Verify: `journal.html`
- Verify: `article.html`
- Verify: `css/layout.css`
- Verify: `js/main.js`

**Interfaces:**
- Consumes: 完成後的四頁搜尋互動
- Produces: Enter、有結果、零結果、Escape、重新搜尋、行動版與既有互動的瀏覽器證據

- [ ] **Step 1: 驗證四頁輸入前後與 Enter 提交**

```javascript
for (const path of ["/", "/products.html", "/journal.html", "/article.html"]) {
  await page.goto(`http://127.0.0.1:8000${path}`);
  await page.locator("[data-search-toggle]").click();
  await page.locator("[data-search-input]").fill("香氛");
  if (await page.locator("[data-search-item][hidden]").count()) throw new Error(`${path} 提交前已篩選`);
  await page.locator("[data-search-input]").press("Enter");
  if (await page.locator("[data-search-empty-page]:visible").count()) throw new Error(`${path} 有結果時顯示空狀態`);
}
```

- [ ] **Step 2: 驗證零結果、Header／Footer 與重新搜尋**

```javascript
await page.goto("http://127.0.0.1:8000/");
await page.locator("[data-search-toggle]").click();
await page.locator("[data-search-input]").fill("完全不存在的內容");
await page.locator("[data-search-input]").press("Enter");
if (!(await page.locator("[data-search-empty-page]").isVisible())) throw new Error("零結果狀態未顯示");
if (!(await page.locator(".site-header").isVisible())) throw new Error("Header 未保留");
if (!(await page.locator(".site-footer").isVisible())) throw new Error("Footer 未保留");
await page.locator("[data-search-toggle]").click();
await page.locator("[data-search-input]").fill("香氛");
await page.locator("[data-search-input]").press("Enter");
if (await page.locator("[data-search-empty-page]:visible").count()) throw new Error("重新搜尋後空狀態未移除");
```

- [ ] **Step 3: 驗證 Escape 不會提交**

```javascript
await page.locator("[data-search-toggle]").click();
await page.locator("[data-search-input]").fill("完全不存在的內容");
await page.keyboard.press("Escape");
if (await page.locator("[data-search-empty-page]:visible").count()) throw new Error("Escape 誤觸發搜尋");
```

- [ ] **Step 4: 驗證 393px 行動版與既有選單／輪播**

```javascript
await page.setViewportSize({ width: 393, height: 852 });
await page.goto("http://127.0.0.1:8000/");
await page.locator("[data-menu-toggle]").click();
if ((await page.locator("[data-menu-toggle]").getAttribute("aria-expanded")) !== "true") throw new Error("行動版選單未開啟");
await page.locator("[data-menu-toggle]").click();
await page.locator("[data-carousel-next]").click();
if ((await page.locator("[data-carousel-slide].is-current").count()) !== 1) throw new Error("輪播狀態異常");
```

- [ ] **Step 5: 檢查差異與本地提交**

```powershell
git diff --check
git status --short
git add index.html products.html journal.html article.html css/layout.css js/main.js docs/superpowers/plans/2026-08-10-search-submit-empty-state.md
git commit -m "feat: 改為提交後顯示搜尋結果"
```

Expected: 僅提交計畫與六個搜尋相關檔案，不設定 remote、不推送。
