import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-gpu"],
});

const results = { checks: [], consoleErrors: [], pageErrors: [] };
const check = (name, ok, detail = "") => {
  results.checks.push({ name, ok, detail });
  if (!ok) throw new Error(`${name}: ${detail}`);
};

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") results.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => results.pageErrors.push(error.message));

  const fileUrl = `file://${path.resolve("dist/index.html")}`;
  await page.goto(fileUrl, { waitUntil: "load" });
  await page.waitForSelector("text=实用1/4 Kelly", { timeout: 10000 });

  check("离线HTML标题", await page.locator("h1").innerText() === "实用1/4 Kelly + 回撤降仓");
  check("初始期末资金", (await page.locator(".metric-card").first().innerText()).includes("166,154"));
  check("资金曲线首帧", await page.locator(".recharts-area-area").count() > 0, "未找到资金面积曲线");
  check("逐笔表格", await page.locator("tbody tr").count() === 10, "首屏表格应显示10行");

  await page.getByRole("button", { name: "留出期" }).click();
  const dateValues = await page.locator('input[type="date"]').evaluateAll((nodes) => nodes.map((node) => node.value));
  check("留出期起点", dateValues[0] === "2024-01-01", `实际=${dateValues[0]}`);
  check("留出期指标更新", (await page.locator(".metric-card").first().innerText()).includes("166,154"));

  await page.getByRole("button", { name: "回撤", exact: true }).click();
  check("回撤视图切换", await page.locator(".view-tabs button.active").innerText() === "回撤");
  check("回撤曲线", await page.locator(".recharts-area-area").count() > 0);

  const leagueSelect = page.locator(".table-tools select").nth(0);
  check("五大联赛筛选项", await leagueSelect.locator("option").count() === 6, "应为全部联赛+五大联赛");
  await leagueSelect.selectOption({ label: "英超" });
  const leagueCells = await page.locator("tbody tr .league-badge").allTextContents();
  check("联赛筛选", leagueCells.length > 0 && leagueCells.every((value) => value === "英超"), leagueCells.join(","));

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出CSV" }).click();
  const download = await downloadPromise;
  check("CSV导出", download.suggestedFilename().endsWith(".csv"), download.suggestedFilename());

  check("无页面脚本错误", results.pageErrors.length === 0, results.pageErrors.join(" | "));
  check("无控制台错误", results.consoleErrors.length === 0, results.consoleErrors.join(" | "));
  await context.close();

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobile = await mobileContext.newPage();
  await mobile.goto(fileUrl, { waitUntil: "load" });
  await mobile.waitForSelector("text=资金路径与风险暴露");
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check("移动端无水平溢出", overflow <= 1, `overflow=${overflow}px`);
  check("移动端视图按钮", await mobile.locator(".view-tabs button").count() === 4);
  await mobileContext.close();
} finally {
  await browser.close();
}

const ok = results.checks.every((item) => item.ok);
const reportPath = path.resolve("dashboard-test-report.json");
fs.writeFileSync(reportPath, JSON.stringify({ ok, ...results }, null, 2));
console.log(JSON.stringify({ ok, checks: results.checks.length, reportPath }, null, 2));
if (!ok) process.exit(1);
