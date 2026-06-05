// Build script: 混淆 *.js 后输出到 dist/，可选打包 zip
// 用法:
//   node build.mjs          # 仅构建到 dist/
//   node build.mjs --zip    # 构建并生成 review-exporter.zip
import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = __dirname;
const DIST = join(SRC, "dist");

// JS 文件需要混淆，其它文件原样复制
const JS_FILES = [
  "background.js",
  "content.js",
  "page-bridge.js",
  "popup.js",
  "adapters/platform.js",
  "adapters/_utils.js",
  "adapters/shopee-th.js",
  "adapters/lazada-th.js",
  "adapters/tiktok-th.js",
  "adapters/tiktok-video.js",
  "adapters/youtube-video.js",
  "adapters/facebook-post.js"
];

const COPY_FILES = [
  "manifest.json",
  "popup.html",
  "popup.css"
];

// 混淆配置（强度高，但不到吓人级别避免 Chrome 商店警告）
const OBFUSCATE_OPTIONS = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.7,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.3,
  identifierNamesGenerator: "hexadecimal",
  log: false,
  numbersToExpressions: true,
  renameGlobals: false,            // 关掉：会破坏 window.__REVIEW_EXPORTER 全局
  selfDefending: false,            // 关掉：MV3 严格 CSP 不允许 eval
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 10,
  stringArray: true,
  stringArrayEncoding: ["base64"],
  stringArrayThreshold: 0.75,
  unicodeEscapeSequence: false,
  target: "browser",
  // CSP 友好：MV3 默认 CSP 禁止 unsafe-eval，必须关掉所有动态 eval 选项
  domainLock: [],
  debugProtection: false,
  disableConsoleOutput: false
};

async function main() {
  console.log("▶ 清理 dist/ ...");
  if (existsSync(DIST)) rmSync(DIST, { recursive: true, force: true });
  mkdirSync(DIST, { recursive: true });
  mkdirSync(join(DIST, "adapters"), { recursive: true });

  // 加载 obfuscator（动态导入，避免没装时 build.mjs 启动失败）
  console.log("▶ 加载 javascript-obfuscator ...");
  let obfuscator;
  try {
    obfuscator = (await import("javascript-obfuscator")).default;
  } catch (e) {
    console.error("✗ 缺少 javascript-obfuscator，请先 `npm install` 或 `pnpm install`");
    process.exit(1);
  }

  // 混淆 JS
  for (const f of JS_FILES) {
    const src = join(SRC, f);
    const dst = join(DIST, f);
    if (!existsSync(src)) {
      console.warn(`  ⚠ 跳过缺失文件: ${f}`);
      continue;
    }
    const code = readFileSync(src, "utf8");
    const result = obfuscator.obfuscate(code, OBFUSCATE_OPTIONS).getObfuscatedCode();
    writeFileSync(dst, result, "utf8");
    const ratio = ((result.length / code.length) * 100).toFixed(0);
    console.log(`  obfuscated  ${f.padEnd(30)} ${code.length} → ${result.length} bytes (${ratio}%)`);
  }

  // 复制非 JS
  for (const f of COPY_FILES) {
    const src = join(SRC, f);
    const dst = join(DIST, f);
    if (!existsSync(src)) {
      console.warn(`  ⚠ 跳过缺失文件: ${f}`);
      continue;
    }
    copyFileSync(src, dst);
    console.log(`  copied      ${f}`);
  }

  console.log(`✓ 构建完成: ${relative(SRC, DIST) || "."}/`);

  if (process.argv.includes("--zip")) {
    console.log("▶ 打包 zip ...");
    const zipPath = join(SRC, "review-exporter.zip");
    if (existsSync(zipPath)) rmSync(zipPath);

    const isWin = process.platform === "win32";
    if (isWin) {
      // Windows: 用 PowerShell Compress-Archive
      const ps = `Compress-Archive -Path "${DIST}\\*" -DestinationPath "${zipPath}" -Force`;
      execSync(`powershell -NoProfile -Command "${ps}"`, { stdio: "inherit" });
    } else {
      // Linux/Mac: 用 zip
      execSync(`cd "${DIST}" && zip -r "${zipPath}" . -x ".*"`, { stdio: "inherit" });
    }

    const size = statSync(zipPath).size;
    console.log(`✓ zip 完成: ${relative(SRC, zipPath)} (${(size / 1024).toFixed(1)} KB)`);
  }
}

main().catch((e) => {
  console.error("✗ 构建失败:", e);
  process.exit(1);
});
