#!/usr/bin/env node
/**
 * embed-assets.cjs — 构建插件客户端产物（公开版）。
 * 用法: node tools/embed-assets.cjs
 *
 * 读取源模板 lib/client.template.js（内含 `"@@ART@@"` 占位符），
 * 把 assets/ 下的图片转成 data-URI 注入，写出两个产物：
 *  1. lib/client.js  —— 自包含 classic script（DSH 浏览器端按原样加载）
 *  2. lib/art.js     —— ESM data-URI 模块（仅供独立 import/调试）
 *
 * 资产来源：
 *  - assets/*.svg            —— 背景壁纸（随仓分发）
 *  - assets/standees/*.{png,webp,jpg} —— 你的自备立绘/吉祥物（自动扫描，
 *    文件名转 PascalCase 作为 art 键，如 standee-dark.png -> StandeeDark）。
 *    本公开仓库不附带任何立绘图片；放入自备图片并重跑本脚本即可启用。
 *
 * 缺失的资产写成 1x1 透明 PNG 占位符并隐藏对应元素，保证永远可加载。
 */
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')
const ASSETS = path.join(ROOT, 'assets')
const STANDEES = path.join(ASSETS, 'standees')
const TEMPLATE = path.join(ROOT, 'lib', 'client.template.js')
const OUT_ART = path.join(ROOT, 'lib', 'art.js')
const OUT_CLIENT = path.join(ROOT, 'lib', 'client.js')

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
}

// 1x1 透明 PNG
const PLACEHOLDER =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

function toPascal(name) {
  return name
    .split(/[-_.]/)
    .filter(Boolean)
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join('')
}

// 校验图片魔数与扩展名一致（JPEG 误存 .png 会被打错 MIME，浏览器渲染异常）
function checkMagic(ext, buf, rel) {
  const isPng = buf[0] === 0x89 && buf[1] === 0x50
  const isJpg = buf[0] === 0xff && buf[1] === 0xd8
  const isWebp =
    buf.slice(0, 4).toString('ascii') === 'RIFF' &&
    buf.slice(8, 12).toString('ascii') === 'WEBP'
  if (ext === '.png' && !isPng) {
    console.error(`ERROR: ${rel} 内容不是 PNG（可能是 JPEG/截图误存 .png）。请转存为真 PNG 或改对扩展名。`)
    process.exit(1)
  }
  if ((ext === '.jpg' || ext === '.jpeg') && !isJpg) {
    console.error(`ERROR: ${rel} 内容不是 JPEG。`)
    process.exit(1)
  }
  if (ext === '.webp' && !isWebp) {
    console.error(`ERROR: ${rel} 内容不是 WebP。`)
    process.exit(1)
  }
}

function toEntry(file, rel) {
  const ext = path.extname(file).toLowerCase()
  const mime = MIME[ext]
  if (!mime) {
    console.error(`ERROR: 不支持的图片格式 ${rel}（支持 ${Object.keys(MIME).join(' ')}）`)
    process.exit(1)
  }
  const buf = fs.readFileSync(file)
  checkMagic(ext, buf, rel)
  const uri = ext === '.svg'
    ? 'data:image/svg+xml,' + encodeURIComponent(buf.toString('utf8'))
    : `data:${mime};base64,` + buf.toString('base64')
  return { uri, note: `${(buf.length / 1024).toFixed(1)} KB`, file: rel }
}

// ---- 收集资产 ----
// 1) 背景壁纸（固定清单，随仓分发）
const expected = [
  'bg-tsukuyomi.svg',
  'bg-reality.svg',
]
const entries = {}
for (const file of expected) {
  const key = toPascal(path.basename(file, path.extname(file)))
  const full = path.join(ASSETS, file)
  entries[key] = fs.existsSync(full)
    ? toEntry(full, `assets/${file}`)
    : { uri: PLACEHOLDER, note: '占位符（未找到源文件）', file }
}

// 2) 自备立绘（自动扫描 assets/standees/，文件名即 art 键）
if (fs.existsSync(STANDEES)) {
  const imgs = fs.readdirSync(STANDEES)
    .filter((f) => ['.png', '.webp', '.jpg', '.jpeg'].includes(path.extname(f).toLowerCase()))
    .sort()
  for (const f of imgs) {
    const key = toPascal(path.basename(f, path.extname(f)))
    if (entries[key]) {
      console.error(`ERROR: assets/standees/${f} 生成的键 ${key} 与内置资产重名，请改文件名。`)
      process.exit(1)
    }
    entries[key] = toEntry(path.join(STANDEES, f), `assets/standees/${f}`)
  }
}

// ---- 1. 生成 lib/art.js（ESM，调试用） ----
const artLines = [
  '/**',
  ' * lib/art.js — 由 tools/embed-assets.cjs 生成，请勿手改。',
  ' * 重新生成: npm run embed:assets',
  ' */',
  '',
]
for (const [key, e] of Object.entries(entries)) {
  artLines.push(`// ${e.file} (${e.note})`)
  artLines.push(`export const ${key} = ${JSON.stringify(e.uri)}`)
  artLines.push('')
}
fs.writeFileSync(OUT_ART, artLines.join('\n'))

// ---- 2. 注入 lib/client.js（自包含 classic script） ----
const template = fs.readFileSync(TEMPLATE, 'utf8')
const objPairs = Object.entries(entries).map(
  ([key, e]) => `${key}: ${JSON.stringify(e.uri)}`
)
const objLiteral = '{ ' + objPairs.join(', ') + ' }'
const marker = '"@@ART@@"'
if (!template.includes(marker)) {
  console.error('ERROR: lib/client.template.js 里找不到占位符 ' + marker)
  process.exit(1)
}
// split/join 全量替换（比 replace 只换第一处更稳，避免注释里同名串被误命中）
const client = template.split(marker).join(objLiteral)

// 语法兜底校验：classic script 必须能通过解析（new Function 不执行，只编译）
try {
  new Function(client)
} catch (err) {
  console.error('ERROR: 生成的 lib/client.js 语法校验失败：', err.message)
  process.exit(1)
}
fs.writeFileSync(OUT_CLIENT, client)

for (const [, e] of Object.entries(entries)) {
  console.log(`  ${e.file.padEnd(36)} ${e.note}`)
}
console.log(`lib/art.js 已生成 (${(fs.statSync(OUT_ART).size / 1024).toFixed(1)} KB)`)
console.log(`lib/client.js 已生成 (${(fs.statSync(OUT_CLIENT).size / 1024).toFixed(1)} KB)`)
