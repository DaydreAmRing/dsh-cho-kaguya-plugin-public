# 月读 · 夜与昼 — DSH 皮肤插件

> **Tsukuyomi: Night & Day** — a dual-world backdrop skin plugin for the
> DeepSeek Harness (DSH) Web UI。夜是和风水面，昼是东京日常。

一套纯背景 + 动效的双世界主题皮肤：**不附带任何角色立绘**，仓库内全部
图形为原创意象化插画。想要立绘？把你自己准备的图片放进 `assets/standees/`
文件夹即可启用（见下方「自定义立绘」）。

| 变体 | 世界 | 画面 |
|---|---|---|
| 暗色 `dark` | **月读 · 夜** | 夜水蓝 × 鸟居朱红 × 月轮金：新月带三层天文轨道环、星座连线、倒悬的全息鸟居、竹苇前景框景、水面数据网格与水灯，天顶还藏着一只由星星连成的**海兔星座彩蛋**（有两颗发光的眼睛） |
| 亮色 `light` | **东京 · 昼** | 暖白纸感 Colorido 风：透视电线杆群与束电线、电线上的乌鸦、狐红东京塔、平面积云、公园竹丛、自动贩卖机、逆光叶影与光斑、飘散的音符与樱瓣 |

两张壁纸都做了**远 / 中 / 近三层景深**（远景雾化、中景微糊、近景清晰）+
大气雾带，避免整屏插画与 UI 文字抢焦点。

## 动效

- **流星群**（暗色）：canvas 粒子——多流星随机划过（月轮金/暖白/樱粉/水色），
  落入水面泛起海蛞蝓青涟漪；dt 步进、DPR ≤ 1.5、`prefers-reduced-motion` 自动停用。
- 亮暗切换时背景交叉淡入淡出；面板全套半透明（scrim 联动），插画从面板下透出。
- `--dsw-*` 与 `--aion-*` 两套 token 全量映射（90+ 项）；输入框聚焦月晕；滚动条月轮金。

## 安装

```powershell
dsh plugin --profile web add 'github:DaydreAmRing/dsh-cho-kaguya-plugin'
dsh web
```

安装后在设置中启用本插件。**皮肤互斥**：请同时把皮肤中心（skin-center）
的皮肤切回「默认」——两套皮肤同时应用会重复定义 token（本插件自带全套样式）。

> ⚠️ client-inject 型皮肤在**重启 web 后**才完全生效，装完建议重启一次。

## 自定义立绘（可选）

本仓库不含立绘，但立绘槽位是开着的。想加？三步：

**1. 准备图片**，放进 `assets/standees/` 文件夹，按文件名对应槽位：

| 文件名 | 槽位 |
|---|---|
| `standee-dark.png` | 夜主题（月读）右下角立绘 |
| `standee-light.png` | 昼主题（东京）右下角立绘 |
| `chibi.png` | 左下角 Q 版吉祥物（会轻轻浮动） |

支持 `.png` / `.webp` / `.jpg`；放几个槽位都行，没放图的主题会自动隐藏。
建议用透明背景 PNG（可用 rembg 等工具抠图），高度 1000px 以上、单张 1MB 以内。
> 找图提示：用你喜欢的动漫角色或原创角色的**透明底立绘**；注意版权——
> 自备素材仅供个人使用，请勿把含第三方版权图片的版本公开再分发。

**2. 打开开关**：编辑 `lib/client.template.js` 顶部的 `CONFIG`，
把 `standee`（立绘）和/或 `chibi`（吉祥物）改成 `true`：

```js
const CONFIG = {
  meteors: true,         /* 流星群（canvas 粒子，仅暗色） */
  standee: false,        /* ← 放了 standee-*.png 就改 true */
  chibi: false,          /* ← 放了 chibi.png 就改 true */
  standeeMaxVh: 42,      /* 立绘最大高度（vh），嫌遮挡就调小 */
  standeeMaxPx: 500,
  dodge: true,           /* 指针靠近立绘时自动淡出让位，不挡输入框 */
  dodgePad: 110,
  dodgeOpacity: 0.1,
};
```

**3. 重新构建**（需要 Node.js）：

```powershell
npm run embed:assets
```

然后重启 / 刷新 DSH 即可。构建脚本会自动扫描 `assets/standees/` 里的全部
图片并内联进 `lib/client.js`，文件名即资产键（如 `my-girl.png` → `MyGirl`）。

## 从源码构建

`lib/client.js` 与 `lib/art.js` 已随仓预构建，不改代码/素材就不用构建；
修改模板或放入图片后运行 `npm run embed:assets`。

构建脚本内置图片魔数校验（拒绝 JPEG 误存 .png 之类的格式错误）与生成后
语法校验。产物必须保持 `window.__ModuleLoader__.load({ id, factory })`
自包含 classic-script 格式——DSH 浏览器端按 classic script 原样加载它、
不解析 `import`/`export`，写成 ESM 皮肤会「注册但不生效」。

## 目录结构

```
dsh-cho-kaguya-plugin/
├── package.json            # Cordis 插件清单（main: lib/index.js, client: lib/client.js）
├── cordis.patch.yml        # 插入 web 插件名单的补丁
├── skin.json               # 皮肤元信息（名称/预览/强调色）
├── lib/
│   ├── index.js            # 宿主侧入口
│   ├── client.template.js  # ★ 客户端源模板 + CONFIG 开关（改代码改这里）
│   ├── client.js           # 预构建产物（embed:assets 产出，随仓分发）
│   └── art.js              # 预构建产物（data-URI 资源模块，随仓分发）
├── assets/
│   ├── bg-tsukuyomi.svg    # 夜主题壁纸（原创）
│   ├── bg-reality.svg      # 昼主题壁纸（原创）
│   └── standees/           # ← 你的自备立绘放这里（见 README.txt）
├── preview/                # 亮/暗预览图
├── tools/embed-assets.cjs  # 模板 + assets → lib/client.js + lib/art.js
├── LICENSE                 # CC BY-NC-SA 4.0
└── NOTICE                  # 素材与商标声明
```

## 与《超时空辉夜姬！》的关系

双世界意象取自 Netflix 动画电影《超时空辉夜姬！》（Studio Colorido，2026）
——夜水面上的鸟居、水灯与月轮，白天的电线杆与街景。除此之外本仓库不含
任何电影角色或官方素材，全部图形为原创意象化绘制；项目非官方、非商业，
详见 `NOTICE`。

## 更新日志

- **v0.6.2**：公开首发。三层景深双背景 + 海兔星座彩蛋；流星群 canvas 粒子化
  + 落水涟漪；立绘槽位通用化（`assets/standees/` 自动扫描，仓库不附带图片）。
- **v0.5.x**：双背景体系、立绘防遮挡让位机制、模板构建流水线（魔数/语法双重校验）。

## 已知限制

- DSH 处于开发者预览期（rc.x），token 与语义属性若随版本演进，以官方契约为准微调。
- 流星群仅在暗色主题渲染（亮色主题停帧清场）。
- 自定义立绘需本机安装 Node.js 才能重新构建。

## License

代码与原创素材以 **CC BY-NC-SA 4.0** 发布（见 `LICENSE`）。
《超时空辉夜姬！》名称与角色归其原权利方所有，本项目为非官方粉丝创作，
与其无任何附属关系（见 `NOTICE`）。
