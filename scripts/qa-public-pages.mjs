import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pages = [
  "index.html", "watch.html", "perspective-253.html", "perspective-triton.html",
  "perspective-joncool.html", "perspective-kenneth.html", "newsroom.html", "events.html",
  "the-253.html", "the-253-unfiltered-question.html", "the-253-shoutouts.html",
  "the-253-polls.html", "the-253-photo-challenges.html", "the-253-heroes.html",
  "the-253-spotlight.html", "the-253-time-capsule.html", "remote-host.html",
  "membership.html", "on-the-back-deck.html"
];
const failures = [];
const report = [];
const fail = (page, issue) => failures.push(page + ": " + issue);
for (const page of pages) {
  const full = path.join(root, page);
  if (!fs.existsSync(full)) { fail(page, "page file missing"); continue; }
  const html = fs.readFileSync(full, "utf8");
  if (!/<title>[^<]+<\\/title>/i.test(html)) fail(page, "missing document title");
  if (!/<main\\b[^>]*\\bid=["']main["']/i.test(html)) fail(page, "missing main landmark with id=main");
  if (!/<h1\\b/i.test(html)) fail(page, "missing page-level h1");
  if (!/class=["']site-header["']/i.test(html)) fail(page, "shared site header missing");
  if (!/id=["']primary-nav["']/i.test(html)) fail(page, "primary navigation missing");
  if (!/assets\\/css\\/site\\.css/.test(html) || (!/assets\\/css\\/pages\\.css/.test(html) && page !== "index.html")) fail(page, "shared stylesheet missing");
  if (!/assets\\/js\\/site\\.js/.test(html)) fail(page, "shared navigation script missing");
  if (page !== "index.html" && !/assets\\/js\\/pages\\.js/.test(html)) fail(page, "page behavior script missing");
  for (const match of html.matchAll(/\\b(?:href|src)=["']([^"']+)["']/gi)) {
    const url = match[1];
    if (/^(https?:|mailto:|tel:|javascript:|data:|\\/\\/)/i.test(url)) continue;
    const parts = url.split("#");
    const target = parts[0];
    const fragment = parts[1];
    const resolved = target ? path.resolve(path.dirname(full), decodeURIComponent(target)) : full;
    if (!resolved.startsWith(root + path.sep) && resolved !== root) { fail(page, "path escapes repository: " + url); continue; }
    if (!fs.existsSync(resolved)) fail(page, "broken local asset/page link: " + url);
    else if (fragment && resolved.endsWith(".html")) {
      const targetHtml = fs.readFileSync(resolved, "utf8");
      if (!targetHtml.includes('id="' + fragment + '"') && !targetHtml.includes("id='" + fragment + "'") && !targetHtml.includes('name="' + fragment + '"') && !targetHtml.includes("name='" + fragment + "'")) fail(page, "missing fragment target: " + url);
    }
  }
  if (/<iframe\\b(?![^>]*\\btitle=)[^>]*>/i.test(html)) fail(page, "iframe missing accessible title");
  if (/<img\\b(?![^>]*\\balt=)[^>]*>/i.test(html)) fail(page, "image missing alt text");
  if (/<form\\b/i.test(html) && !/data-mailto-form/.test(html) && !/action=/i.test(html)) fail(page, "form has no documented submission handler");
  report.push({page, forms:(html.match(/<form\\b/gi)||[]).length});
}
for (const script of ["assets/js/site.js","assets/js/pages.js","assets/js/config.js"]) if (!fs.existsSync(path.join(root,script))) fail(script,"script file missing");
console.log("Checked " + report.length + "/" + pages.length + " public pages.");
for (const row of report) console.log("PASS " + row.page + " (" + row.forms + " forms)");
if (failures.length) {
  console.error("\\nQA failures:");
  for (const item of failures) console.error("FAIL " + item);
  process.exitCode = 1;
} else console.log("\\nAll static public-page checks passed.");
