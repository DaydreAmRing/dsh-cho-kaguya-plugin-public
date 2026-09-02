// 冒烟测试:在 Node 沙箱里模拟最小 DOM,真实执行 lib/client.js 的
// 注册→工厂→自动挂载→导出→卸载全链路。
// 用法: node tools/smoke-test.cjs
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const ROOT = path.resolve(__dirname, '..')

/* ---------- 最小 DOM 桩 ---------- */
function makeClassList(el) {
  const set = () => new Set()
  el._classes = set()
  return {
    add: (...cs) => cs.forEach((c) => el._classes.add(c)),
    remove: (...cs) => cs.forEach((c) => el._classes.delete(c)),
    toggle: (c, force) => {
      const want = force === undefined ? !el._classes.has(c) : !!force
      want ? el._classes.add(c) : el._classes.delete(c)
      return want
    },
    contains: (c) => el._classes.has(c),
  }
}

function makeElement(tag) {
  const el = {
    tagName: tag.toUpperCase(),
    nodeType: 1,
    children: [],
    style: {},
    attrs: {},
    className: '',
    id: '',
    textContent: '',
    width: 0,
    height: 0,
  }
  el.classList = makeClassList(el)
  Object.defineProperty(el, 'className', {
    get() {
      return [...this._classes].join(' ')
    },
    set(v) {
      this._classes.clear()
      v.split(/\s+/).filter(Boolean).forEach((c) => this._classes.add(c))
    },
  })
  el.appendChild = (c) => { el.children.push(c); return c }
  el.append = (...cs) => cs.forEach((c) => el.children.push(c))
  el.remove = () => {
    for (const p of [document.body, document.head]) {
      const i = p.children.indexOf(el)
      if (i !== -1) p.children.splice(i, 1)
    }
  }
  el.setAttribute = (k, v) => { el.attrs[k] = String(v) }
  el.getAttribute = (k) => (k in el.attrs ? el.attrs[k] : null)
  el.hasAttribute = (k) => k in el.attrs
  el.removeAttribute = (k) => { delete el.attrs[k] }
  el.addEventListener = () => {}
  el.removeEventListener = () => {}
  if (tag === 'canvas') el.getContext = () => null
  return el
}

const body = makeElement('body')
const head = makeElement('head')
const htmlEl = makeElement('html')

const byId = (root, id) => {
  for (const c of root.children) {
    if (c.id === id) return c
    const hit = byId(c, id)
    if (hit) return hit
  }
  return null
}

const document = {
  readyState: 'complete',
  body,
  head,
  documentElement: htmlEl,
  createElement: makeElement,
  getElementById: (id) => byId(body, id) || byId(head, id),
  querySelector: () => null,
  addEventListener: () => {},
  removeEventListener: () => {},
}

class MutationObserver {
  constructor(cb) { this.cb = cb }
  observe() {}
  disconnect() {}
}

/* ---------- 加载器桩 + 沙箱 ---------- */
const loader = { mods: {}, load(m) { this.mods[m.id] = m } }

const sandbox = {
  window: {},
  document,
  MutationObserver,
  matchMedia: () => ({ matches: false }),
  requestAnimationFrame: () => 0,
  cancelAnimationFrame: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  setTimeout: () => 0,
  clearTimeout: () => {},
  devicePixelRatio: 1,
  innerWidth: 1920,
  innerHeight: 1080,
  console,
}
sandbox.window = sandbox // window === global
sandbox.window.__ModuleLoader__ = loader
vm.createContext(sandbox)

/* ---------- 执行 client.js ---------- */
const src = fs.readFileSync(path.join(ROOT, 'lib', 'client.js'), 'utf8')
vm.runInContext(src, sandbox, { filename: 'client.js' })

/* ---------- 断言 ---------- */
const results = []
const check = (name, cond) => results.push((cond ? 'PASS ' : 'FAIL ') + name)

check('module registered in __ModuleLoader__',
  !!loader.mods['@dsh-external/dsh-client-ui-skin-cho-kaguya'])

const factory = loader.mods['@dsh-external/dsh-client-ui-skin-cho-kaguya'].factory
const mod = factory({})
check('factory returns exports object', !!mod && typeof exports === 'object')
check('mod.mount is function', typeof mod.mount === 'function')
check('mod.unmount is function', typeof mod.unmount === 'function')
check('mod.apply is function', typeof mod.apply === 'function')
check('mod.scopeCss is function', typeof mod.scopeCss === 'function')

check('auto-mount set body[data-dsh-cho-kaguya]', body.hasAttribute('data-dsh-cho-kaguya'))
const backdrop = byId(body, 'cho-kaguya-backdrop')
const stage = byId(body, 'cho-kaguya-stage')
const style = byId(head, 'cho-kaguya-style')
check('backdrop mounted', !!backdrop)
check('backdrop has 2 bg layers', backdrop && backdrop.children.length === 2)
check('backdrop theme-light (no dark attr)', backdrop && backdrop._classes.has('ck-theme-light'))
check('stage mounted', !!stage)
check('stage has NO imgs (standee/chibi off)', stage && stage.children.filter((c) => c.tagName === 'IMG').length === 0)
check('style injected & scoped', !!style && style.textContent.includes('body[data-dsh-cho-kaguya]'))
check('html background transparent', htmlEl.style.background === 'transparent')
check('bg svg embedded (dark)', backdrop && backdrop.children.some((c) => (c.style.backgroundImage || '').includes('data:image/svg')))
check('no bitmap standee data-uris', !src.includes('data:image/png'))

mod.unmount()
check('unmount removed body attr', !body.hasAttribute('data-dsh-cho-kaguya'))
check('unmount removed backdrop', !byId(body, 'cho-kaguya-backdrop'))
check('unmount removed stage', !byId(body, 'cho-kaguya-stage'))
check('unmount removed style', !byId(head, 'cho-kaguya-style'))
check('unmount restored html background', htmlEl.style.background !== 'transparent')

/* ---------- 汇总 ---------- */
const failed = results.filter((r) => r.startsWith('FAIL'))
console.log(results.join('\n'))
console.log('---')
if (failed.length) {
  console.error(`SMOKE FAILED: ${failed.length} item(s)`)
  process.exit(1)
}
console.log(`SMOKE PASSED: ${results.length}/${results.length}`)
