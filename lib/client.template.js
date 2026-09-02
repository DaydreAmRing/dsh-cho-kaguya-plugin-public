/* ============================================================
 * 月读 · 夜与昼（Tsukuyomi: Night & Day）— lib/client.js  v0.6.2 公开版
 *
 * ★★★ 本文件是生成产物：由 tools/embed-assets.cjs 从
 * ★★★ lib/client.template.js + assets/ 生成。要改代码请改模板，
 * ★★★ 然后运行 `npm run embed:assets`，手改本文件会被覆盖。
 *
 * DSH Web UI 客户端插件（浏览器侧）。
 * 【公开版】不附带任何立绘素材；立绘槽位通用化——把自备图片放进
 * assets/standees/（文件名即资产键），改 CONFIG 开关后重跑 embed:assets 即可启用。
 * 产出格式必须满足 dsh-client-modules 的约定：
 *   window.__ModuleLoader__.load({ id, factory })  —— 自包含 CJS 风格，
 *   不能有 import/export（浏览器按 classic script 加载，
 *   相对导入不会被解析、ESM 语法会直接 SyntaxError）。
 * 资源（立绘 data-URI）由 tools/embed-assets.cjs 注入到下方 art 占位标记处。
 *
 * 结构：
 *  1. CONFIG    —— 运行时开关（流星/立绘/吉祥物/让位淡出）
 *  2. RAW_CSS   —— v0.2.0 调色板/组件层（皮肤中心写法：裸选择器）
 *  3. scopeCss  —— 运行时给选择器加 body[data-dsh-cho-kaguya] 作用域
 *  4. PLUGIN_CSS—— 背景层/立绘层样式（手写作用域）
 *  5. meteors   —— 流星群 canvas 粒子（仅暗色·月读）
 *  6. dodge     —— 指针靠近立绘时自动淡出「让位」
 *  7. mount     —— 注入 <style> + 两个固定层：
 *                  #cho-kaguya-backdrop (z-index:0, 面板之下)
 *                  #cho-kaguya-stage    (z-index:3, 面板之上, 立绘)
 *  8. 亮暗侦测  —— MutationObserver 监听 body[data-ds-dark-theme]
 * ============================================================ */

window.__ModuleLoader__.load({
  id: "@dsh-external/dsh-client-ui-skin-cho-kaguya",
  factory: function (require) {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    const SCOPE = "body[data-dsh-cho-kaguya]";
    const BODY_ATTR = "data-dsh-cho-kaguya";
    const STYLE_ID = "cho-kaguya-style";
    const BACKDROP_ID = "cho-kaguya-backdrop";
    const STAGE_ID = "cho-kaguya-stage";

    /* ------------------------------------------------------------
     * 运行时开关：不想要某项效果就改 false。
     * 改完（含 assets/ 换图）记得 `npm run embed:assets` 重新生成。
     * ---------------------------------------------------------- */
    const CONFIG = {
      meteors: true,         /* 流星群（canvas 粒子，仅暗色·月读） */
      standee: false,        /* 右下角立绘：assets/standees/ 放入 standee-dark.png（夜）/ standee-light.png（昼）后改 true */
      chibi: false,          /* 左下角 Q 版吉祥物：assets/standees/ 放入 chibi.png 后改 true */
      standeeMaxVh: 42,      /* 立绘最大高度（vh），嫌遮挡就调小 */
      standeeMaxPx: 500,     /* 立绘最大高度像素上限 */
      dodge: true,           /* 指针靠近立绘时立绘自动淡出让位 */
      dodgePad: 110,         /* 触发让位的指针距离（px） */
      dodgeOpacity: 0.1,     /* 让位后立绘残留的不透明度 */
    };

    /* 立绘/背景 data-URI 资源（由 embed-assets.cjs 注入） */
    const art = "@@ART@@";

    /* ------------------------------------------------------------
     * RAW_CSS：v0.2.0 skin.css + patches.css（裸选择器原文，
     * 由 scopeCss 在运行时注入作用域）。
     * ---------------------------------------------------------- */
    const RAW_CSS = `
/* ===== v0.2.0 skin.css ===== */

/* ---------- 变体 A：现实 · 东京日常（亮色） ---------- */

:root {
  color: #38332B;
  background-color: #FAF6EE;
}

:root {
  --dsw-alias-bg-base: rgba(250, 246, 238, calc(var(--dsw-skin-scrim, 0) * .5));
  --dsw-alias-bg-layer-1: rgba(244, 238, 223, calc(1 - var(--dsw-skin-scrim, 0) * .5));
  --dsw-alias-bg-layer-2: rgba(239, 232, 214, calc(1 - var(--dsw-skin-scrim, 0) * .45));
  --dsw-alias-bg-layer-3: rgba(233, 225, 203, calc(1 - var(--dsw-skin-scrim, 0) * .42));
  --dsw-alias-bg-mask-1: #584E3C66;
  --dsw-alias-bg-mask-2: #584E3C33;
  --dsw-alias-bg-mask-3: #584E3C80;
  --dsw-alias-bg-mask-photo: #2A251DE0;
  --dsw-alias-bg-module-platform: rgba(239, 232, 214, calc(1 - var(--dsw-skin-scrim, 0) * .45));
  --dsw-alias-bg-multi-select: #F4E8CFF2;
  --dsw-alias-bg-overlay: #FAF6EEEB;
  --dsw-alias-bg-skeleton: #C94A3D0F;

  --dsw-alias-border-inverted2: #38332B99;
  --dsw-alias-border-inverted: #38332B66;
  --dsw-alias-border-l1: #B8AA8C26;
  --dsw-alias-border-l2-darkmode-thin: #B8AA8C33;
  --dsw-alias-border-l2: #B8AA8C38;
  --dsw-alias-border-l3: #B8AA8C52;
  --dsw-alias-border-l4: #B8AA8C6B;

  --dsw-alias-brand-primary-invert: #FFF8EF;
  --dsw-alias-brand-primary-new-colorprimary-new-color: #C94A3D;
  --dsw-alias-brand-primary: #C94A3D;
  --dsw-alias-brand-text: #B23E33;

  --dsw-alias-button-contrast-fill: #B23E33;
  --dsw-alias-button-elevated-fill: #FFFFFF;
  --dsw-alias-button-floating-fill: #FFFFFF;
  --dsw-alias-button-floating-hover: #FBF3E4;
  --dsw-alias-button-ghost-active-border: #E8C57C;
  --dsw-alias-button-ghost-active-fill: #F4E8CF;
  --dsw-alias-button-ghost-active-hover: #EFE0BF;
  --dsw-alias-button-info-fill: #C94A3D;
  --dsw-alias-button-info-hover: #D65A4C;
  --dsw-alias-button-primary-dimmed: #F4E8CF;
  --dsw-alias-button-primary-fill: #C94A3D;
  --dsw-alias-button-primary-hover: #D65A4C;
  --dsw-alias-button-tool-bar-fill-invisible: #C94A3D5C;
  --dsw-alias-button-tool-bar-fill: #C94A3D80;
  --dsw-alias-button-tool-bar-hover: #C94A3D99;

  --dsw-alias-interactive-bg-active: #C94A3D24;
  --dsw-alias-interactive-bg-hover-accent: #E8C57C2E;
  --dsw-alias-interactive-bg-hover-danger: #C0392B0F;
  --dsw-alias-interactive-bg-hover-solid: #FBF3E4;
  --dsw-alias-interactive-bg-hover: #C94A3D14;

  --dsw-alias-label-caption: #A79C8B;
  --dsw-alias-label-dimmed: #B9AF9E;
  --dsw-alias-label-primary-dimmed: #4A4337;
  --dsw-alias-label-primary-foreground: #FFF8EF;
  --dsw-alias-label-primary-inverted: #FFF8EF;
  --dsw-alias-label-primary: #38332B;
  --dsw-alias-label-secondary: #6E6558;
  --dsw-alias-label-tertiary: #948A7A;

  --dsw-alias-markdown-citation: #F4E8CF99;
  --dsw-alias-markdown-code-block-banner: #F1EBDB94;
  --dsw-alias-markdown-code-block: #F1EBDB94;
  --dsw-alias-markdown-code-segment-selected: #FFF8EFFF;
  --dsw-alias-markdown-code-segment-unselected: #F4EEDF99;
  --dsw-alias-markdown-inline-code: #EFE7D299;
  --dsw-alias-markdown-placeholder: #F1EBDB94;
  --dsw-alias-markdown-tag: #EFE7D299;

  --dsw-alias-scrollbar-bg-l1: #E5DCC6;
  --dsw-alias-scrollbar-bg-l2: #DDD3BC;
  --dsw-alias-scrollbar-hover-l1: #C9BB9C;
  --dsw-alias-scrollbar-hover-l2: #C9BB9C;

  --dsw-alias-state-business-primary: #C94A3D;
  --dsw-alias-state-business-tertiary: #F4E8CF;
  --dsw-alias-state-error-primary: #C0392B;
  --dsw-alias-state-error-secondary: #E05C5C;
  --dsw-alias-state-success-primary: #4F7A46;
  --dsw-alias-state-success-secondary: #6FA465;
  --dsw-alias-state-success-tertiary: #E4EFDF;
  --dsw-alias-state-warn-label: #8A6522;
  --dsw-alias-state-warn-primary: #B98A2F;
  --dsw-alias-state-warn-secondary: #D9A441;
  --dsw-alias-state-warn-tertiary: #F7EDD8;

  --dsw-alias-toast-bg: #B23E33;
  --dsw-alias-tooltip-bg: #38332B;
  --dsw-alias-tooltip-fg: #FAF6EE;

  --dsw-specific-bubble-highlight: #F4E8CF;
  --dsw-specific-bubble: rgba(255, 255, 255, calc(1 - var(--dsw-skin-scrim, 0) * .35));
  --dsw-specific-input-major: rgba(255, 255, 255, calc(1 - var(--dsw-skin-scrim, 0) * .4));
  --dsw-specific-login-input: rgba(255, 255, 255, calc(1 - var(--dsw-skin-scrim, 0) * .4));
  --dsw-specific-menu: #FFFDF8F0;
  --dsw-specific-selector: #FBF3E4D9;
  --dsw-specific-sidebar-fill: rgba(244, 238, 223, calc(1 - var(--dsw-skin-scrim, 0) * .5));
  --dsw-specific-sidebar-nav-item-active-accent: #C94A3D;
  --dsw-specific-sidebar-nav-item-active: #F4E8CF;
  --dsw-specific-sidebar-nav-item-hover: #FBF3E4;
  --dsw-specific-tip: #38332B;

  --dsw-linear-gradient-think: linear-gradient(90deg, #C94A3D 0%, #E8C57C 50%, #ED93B1 100%);
  --dsw-linear-think-select: rgba(232, 197, 124, 0.35);

  --dsw-shadow-lv1: 0 1px 3px rgba(88, 78, 60, 0.10);
  --dsw-shadow-lv1-blur: 3px;
}

/* ---------- Aion 组件库变量（亮色） ---------- */
:root {
  --aion-bg-base: #FFFDF899;
  --aion-bg-1: #F4EEDF80;
  --aion-bg-2: #EFE8D69E;
  --aion-bg-3: #C94A3D38;
  --aion-bg-4: #C94A3D57;
  --aion-bg-hover: #C94A3D14;
  --aion-bg-active: #C94A3D24;
  --aion-text-primary: #38332B;
  --aion-text-secondary: #6E6558;
  --aion-text-tertiary: #948A7A;
  --aion-text-disabled: #B9AF9E;
  --aion-primary: #C94A3D;
  --aion-success: #4F7A46;
  --aion-warning: #B98A2F;
  --aion-danger: #C0392B;
  --aion-brand: #E8C57C;
  --aion-aou-1: #FAF6EE;
  --aion-aou-2: #F4E8CF;
  --aion-aou-3: #E8C57C;
  --aion-aou-4: #D9A441;
  --aion-aou-5: #C94A3D;
  --aion-aou-6: #B23E33;
  --aion-fill-2: #C94A3D0F;
  --aion-fill-3: #C94A3D24;
  --aion-border-base: #B8AA8C2E;
  --aion-overlay-shadow: 0 8px 24px #584E3C40;
  --aion-font-sans: -apple-system, "system-ui", "Segoe UI", Roboto, "Helvetica Neue", "PingFang SC", "Microsoft YaHei", sans-serif;
  --aion-font-mono: ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
}

/* ---------- 变体 B：月读 · 虚拟空间（暗色） ---------- */

body[data-ds-dark-theme] {
  color: #F0EDDD;
  background-color: #0E1428;
}

body[data-ds-dark-theme] {
  --dsw-alias-bg-base: rgba(14, 20, 40, calc(var(--dsw-skin-scrim, 0) * .5));
  --dsw-alias-bg-layer-1: rgba(19, 27, 51, calc(1 - var(--dsw-skin-scrim, 0) * .45));
  --dsw-alias-bg-layer-2: rgba(24, 33, 56, calc(1 - var(--dsw-skin-scrim, 0) * .4));
  --dsw-alias-bg-layer-3: rgba(30, 42, 74, calc(1 - var(--dsw-skin-scrim, 0) * .36));
  --dsw-alias-bg-mask-1: #0000008C;
  --dsw-alias-bg-mask-2: #0000004D;
  --dsw-alias-bg-mask-3: #00000099;
  --dsw-alias-bg-mask-photo: #060914E6;
  --dsw-alias-bg-module-platform: rgba(24, 33, 56, calc(1 - var(--dsw-skin-scrim, 0) * .4));
  --dsw-alias-bg-multi-select: #1E2A4ACC;
  --dsw-alias-bg-overlay: #131B33EB;
  --dsw-alias-bg-skeleton: #FFFFFF0F;

  --dsw-alias-border-inverted2: #F0EDDD99;
  --dsw-alias-border-inverted: #F0EDDD66;
  --dsw-alias-border-l1: #35426B1F;
  --dsw-alias-border-l2-darkmode-thin: #35426B26;
  --dsw-alias-border-l2: #35426B2E;
  --dsw-alias-border-l3: #35426B42;
  --dsw-alias-border-l4: #35426B57;

  --dsw-alias-brand-primary-invert: #0E1428;
  --dsw-alias-brand-primary-new-colorprimary-new-color: #E8C57C;
  --dsw-alias-brand-primary: #E8C57C;
  --dsw-alias-brand-text: #E8C57C;

  --dsw-alias-button-contrast-fill: #D8544A;
  --dsw-alias-button-elevated-fill: #182138;
  --dsw-alias-button-floating-fill: #131B33;
  --dsw-alias-button-floating-hover: #1E2A4A;
  --dsw-alias-button-ghost-active-border: #D8544A;
  --dsw-alias-button-ghost-active-fill: #2A1E2E;
  --dsw-alias-button-ghost-active-hover: #38283A;
  --dsw-alias-button-info-fill: #D8544A;
  --dsw-alias-button-info-hover: #E8747C;
  --dsw-alias-button-primary-dimmed: #4A3A24;
  --dsw-alias-button-primary-fill: #E8C57C;
  --dsw-alias-button-primary-hover: #F2D48E;
  --dsw-alias-button-tool-bar-fill-invisible: #E8C57C5C;
  --dsw-alias-button-tool-bar-fill: #E8C57C80;
  --dsw-alias-button-tool-bar-hover: #E8C57C99;

  --dsw-alias-interactive-bg-active: #E8C57C24;
  --dsw-alias-interactive-bg-hover-accent: #ED93B133;
  --dsw-alias-interactive-bg-hover-danger: #E8747C1F;
  --dsw-alias-interactive-bg-hover-solid: #1E2A4A;
  --dsw-alias-interactive-bg-hover: #E8C57C12;

  --dsw-alias-label-caption: #6E7694;
  --dsw-alias-label-dimmed: #5A6180;
  --dsw-alias-label-primary-dimmed: #C7CCE0;
  --dsw-alias-label-primary-foreground: #0E1428;
  --dsw-alias-label-primary-inverted: #0E1428;
  --dsw-alias-label-primary: #F0EDDD;
  --dsw-alias-label-secondary: #C7CCE0;
  --dsw-alias-label-tertiary: #8B93B0;

  --dsw-alias-markdown-citation: #1E2A4A9E;
  --dsw-alias-markdown-code-block-banner: #0B1020A8;
  --dsw-alias-markdown-code-block: #0B1020A8;
  --dsw-alias-markdown-code-segment-selected: #26324FBF;
  --dsw-alias-markdown-code-segment-unselected: #131B3399;
  --dsw-alias-markdown-inline-code: #1018309E;
  --dsw-alias-markdown-placeholder: #131B3399;
  --dsw-alias-markdown-tag: #1018309E;

  --dsw-alias-scrollbar-bg-l1: #202B4A;
  --dsw-alias-scrollbar-bg-l2: #2A3554;
  --dsw-alias-scrollbar-hover-l1: #E8C57C;
  --dsw-alias-scrollbar-hover-l2: #E8C57C;

  --dsw-alias-state-business-primary: #E8C57C;
  --dsw-alias-state-business-tertiary: #2A1E2E;
  --dsw-alias-state-error-primary: #E8747C;
  --dsw-alias-state-error-secondary: #E07070;
  --dsw-alias-state-success-primary: #7BC98F;
  --dsw-alias-state-success-secondary: #7BC98F;
  --dsw-alias-state-success-tertiary: #1E3F2C;
  --dsw-alias-state-warn-label: #E8C57C;
  --dsw-alias-state-warn-primary: #D9A441;
  --dsw-alias-state-warn-secondary: #D9A441;
  --dsw-alias-state-warn-tertiary: #4A3515;

  --dsw-alias-toast-bg: #2A1E2E;
  --dsw-alias-tooltip-bg: #1E2A4A;
  --dsw-alias-tooltip-fg: #F0EDDD;

  --dsw-specific-bubble-highlight: #1E2A4A;
  --dsw-specific-bubble: rgba(26, 36, 64, calc(1 - var(--dsw-skin-scrim, 0) * .3));
  --dsw-specific-input-major: rgba(19, 27, 51, calc(1 - var(--dsw-skin-scrim, 0) * .35));
  --dsw-specific-login-input: rgba(19, 27, 51, calc(1 - var(--dsw-skin-scrim, 0) * .35));
  --dsw-specific-menu: #131B33F0;
  --dsw-specific-selector: #101830D9;
  --dsw-specific-sidebar-fill: rgba(19, 27, 51, calc(1 - var(--dsw-skin-scrim, 0) * .45));
  --dsw-specific-sidebar-nav-item-active-accent: #E8C57C;
  --dsw-specific-sidebar-nav-item-active: #1E2A4A;
  --dsw-specific-sidebar-nav-item-hover: #182138;
  --dsw-specific-tip: #131B33;

  --dsw-linear-gradient-think: linear-gradient(90deg, #E8C57C 0%, #ED93B1 50%, #6FD9E7 100%);
  --dsw-linear-think-select: rgba(232, 197, 124, 0.28);

  --dsw-shadow-lv1: 0 0 0 0.5px rgba(232, 197, 124, 0.12);
  --dsw-shadow-lv1-blur: 0px;
}

/* ---------- Aion 组件库变量（暗色） ---------- */
body[data-ds-dark-theme] {
  --aion-bg-base: #131B33D1;
  --aion-bg-1: #131B3380;
  --aion-bg-2: #18213899;
  --aion-bg-3: #E8C57C33;
  --aion-bg-4: #E8C57C4D;
  --aion-bg-hover: #E8C57C1F;
  --aion-bg-active: #E8C57C33;
  --aion-text-primary: #F0EDDD;
  --aion-text-secondary: #C7CCE0;
  --aion-text-tertiary: #8B93B0;
  --aion-text-disabled: #5A6180;
  --aion-primary: #E8C57C;
  --aion-success: #7BC98F;
  --aion-warning: #D9A441;
  --aion-danger: #E8747C;
  --aion-brand: #E8C57C;
  --aion-aou-1: #182138;
  --aion-aou-2: #1E2A4A;
  --aion-aou-3: #2A3554;
  --aion-aou-4: #35426B;
  --aion-aou-5: #6FD9E7;
  --aion-aou-6: #E8C57C;
  --aion-fill-2: #E8C57C1F;
  --aion-fill-3: #E8C57C33;
  --aion-border-base: #35426B26;
  --aion-overlay-shadow: 0 12px 32px #00000080;
}

/* ---------- 滚动条 ---------- */
:root {
  --dsh-scrollbar-thumb: var(--dsw-alias-scrollbar-bg-l2);
  --dsh-scrollbar-thumb-hover: var(--dsw-alias-scrollbar-hover-l2);
}

body::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

body::-webkit-scrollbar-track {
  background: #F4EEDF;
}

body::-webkit-scrollbar-thumb {
  background: #DDD3BC;
  border: 2px solid #F4EEDF;
  border-radius: 5px;
}

body::-webkit-scrollbar-thumb:hover {
  background: #C9BB9C;
}

body::-webkit-scrollbar-corner {
  background: #F4EEDF;
}

body[data-ds-dark-theme]::-webkit-scrollbar-track,
body[data-ds-dark-theme]::-webkit-scrollbar-corner {
  background: #0B1020;
}

body[data-ds-dark-theme]::-webkit-scrollbar-thumb {
  background: #2A3554;
  border-color: #0B1020;
}

body[data-ds-dark-theme]::-webkit-scrollbar-thumb:hover {
  background: #E8C57C;
}

/* ---------- 选中文本：辉夜樱粉 ---------- */
body::selection {
  color: #FFF8EF;
  background: #C94A3D;
}

body[data-ds-dark-theme]::selection {
  color: #0E1428;
  background: #E8C57C;
}

body[data-ds-dark-theme] :focus-visible {
  outline-color: var(--dsw-alias-state-business-primary);
}

/* ---------- 皮肤私有变量 ---------- */
:root {
  --kaguya-rule: #C94A3D;
  --kaguya-glow: rgba(232, 197, 124, 0.45);
  --kaguya-hairline: rgba(201, 74, 61, 0.35);
}

body[data-ds-dark-theme] {
  --kaguya-rule: #D8544A;
  --kaguya-glow: rgba(232, 197, 124, 0.35);
  --kaguya-hairline: rgba(216, 84, 74, 0.55);
}

/* ===== v0.2.0 patches.css ===== */

[id="root"] {
  background: none;
}

a {
  color: #B23E33;
}

a:visited {
  color: #8A6522;
}

a:hover {
  color: #C94A3D;
  text-decoration: underline;
}

a:active {
  color: #8F352B;
}

body[data-ds-dark-theme] a {
  color: #E8C57C;
}

body[data-ds-dark-theme] a:visited {
  color: #D9A441;
}

body[data-ds-dark-theme] a:hover {
  color: #F2D48E;
}

body[data-ds-dark-theme] a:active {
  color: #ED93B1;
}

:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary);
  outline-offset: 2px;
}

[data-pane="sidebar"] {
  color: var(--dsw-alias-label-primary);
  box-shadow: inset -1px 0 0 var(--dsw-alias-border-l1),
              inset -2px 0 0 var(--kaguya-hairline);
}

[role="tooltip"] {
  background: var(--dsw-alias-tooltip-bg);
  color: var(--dsw-alias-tooltip-fg);
}

[role="dialog"],
[role="dialog"] [class*="navCell"]:not([aria-current="true"]) {
  color: var(--dsw-alias-label-primary);
}

[data-dsh-part="dialog"] {
  backdrop-filter: blur(14px);
  border-color: #E8C57C66;
}

body[data-ds-dark-theme] [data-dsh-part="dialog"] {
  border-color: #35426B38;
}

button[role="tab"],
button[role="tab"]:hover,
button[role="tab"]:active,
button[role="tab"]:disabled,
button[role="tab"]:hover:not(:disabled),
button[role="tab"]:active:not(:disabled) {
  box-shadow: none;
  text-shadow: none;
  color: var(--dsw-alias-label-primary);
  filter: none;
  opacity: 1;
  background-color: #0000;
  background-image: none;
  border: 0;
  transform: none;
}

[data-aionui-explorer-col],
[data-aionui-preview-col],
.aionui-root {
  backdrop-filter: blur(12px);
}

.aionui-dialog,
.aionui-menu,
.aionui-toast {
  backdrop-filter: blur(14px);
}

.aionui-overlay {
  background: #584E3C66;
}

body[data-ds-dark-theme] .aionui-overlay {
  background: #0000008C;
}

button,
a,
.aionui-btn,
.aionui-menu-item,
.aionui-explorer-handle,
.aionui-preview-handle {
  transition: background-color .13s, border-color .13s, box-shadow .13s, color .13s, opacity .13s;
}

::-webkit-scrollbar-thumb {
  transition: background-color .13s;
}

button:disabled,
.aionui-btn:disabled,
.aionui-menu-item-disabled {
  opacity: .55;
  cursor: not-allowed;
}

.aionui-btn:disabled:hover,
.aionui-menu-item-disabled:hover {
  box-shadow: none;
  background-color: #0000;
}

.aionui-explorer-handle,
.aionui-preview-handle {
  background: #DDD3BC;
}

.aionui-explorer-handle:hover,
.aionui-preview-handle:hover {
  background: #D9A441;
  box-shadow: 0 0 6px #E8C57C66;
}

body[data-ds-dark-theme] .aionui-explorer-handle,
body[data-ds-dark-theme] .aionui-preview-handle {
  background: #2A3554;
}

body[data-ds-dark-theme] .aionui-explorer-handle:hover,
body[data-ds-dark-theme] .aionui-preview-handle:hover {
  background: #E8C57C;
  box-shadow: 0 0 6px #E8C57C66;
}

.aionui-floating-expand:hover {
  background: #FBF3E4;
  border-color: #D9A441;
}

.aionui-floating-expand:active {
  background: #F4E8CF;
}

body[data-ds-dark-theme] .aionui-floating-expand:hover {
  background: #1E2A4A;
  border-color: #E8C57C;
}

body[data-ds-dark-theme] .aionui-floating-expand:active {
  background: #2A3554;
}

.aionui-collapse-chevron:hover {
  color: #D9A441;
}

body[data-ds-dark-theme] .aionui-collapse-chevron:hover {
  color: #F2D48E;
}

.aionui-menu-item:not(.aionui-menu-item-disabled):hover {
  background: #C94A3D1F;
}

body[data-ds-dark-theme] .aionui-menu-item:not(.aionui-menu-item-disabled):hover {
  background: #E8C57C29;
}

[data-gitgraph-lanes] > [data-gitgraph-glyph="node"]:nth-child(6n+1),
[data-gitgraph-lanes] > [data-gitgraph-glyph="merge"]:nth-child(6n+1) {
  color: #B98A2F;
}

[data-gitgraph-lanes] > [data-gitgraph-glyph="node"]:nth-child(6n+2),
[data-gitgraph-lanes] > [data-gitgraph-glyph="merge"]:nth-child(6n+2) {
  color: #C94A3D;
}

[data-gitgraph-lanes] > [data-gitgraph-glyph="node"]:nth-child(6n+3),
[data-gitgraph-lanes] > [data-gitgraph-glyph="merge"]:nth-child(6n+3) {
  color: #3E9E8F;
}

[data-gitgraph-lanes] > [data-gitgraph-glyph="node"]:nth-child(6n+4),
[data-gitgraph-lanes] > [data-gitgraph-glyph="merge"]:nth-child(6n+4) {
  color: #D9A441;
}

[data-gitgraph-lanes] > [data-gitgraph-glyph="node"]:nth-child(6n+5),
[data-gitgraph-lanes] > [data-gitgraph-glyph="merge"]:nth-child(6n+5) {
  color: #B25F80;
}

[data-gitgraph-lanes] > [data-gitgraph-glyph="node"]:nth-child(6n),
[data-gitgraph-lanes] > [data-gitgraph-glyph="merge"]:nth-child(6n) {
  color: #6B9E78;
}

body[data-ds-dark-theme] [data-gitgraph-lanes] > [data-gitgraph-glyph="node"]:nth-child(6n+1),
body[data-ds-dark-theme] [data-gitgraph-lanes] > [data-gitgraph-glyph="merge"]:nth-child(6n+1) {
  color: #E8C57C;
}

body[data-ds-dark-theme] [data-gitgraph-lanes] > [data-gitgraph-glyph="node"]:nth-child(6n+2),
body[data-ds-dark-theme] [data-gitgraph-lanes] > [data-gitgraph-glyph="merge"]:nth-child(6n+2) {
  color: #E8747C;
}

body[data-ds-dark-theme] [data-gitgraph-lanes] > [data-gitgraph-glyph="node"]:nth-child(6n+3),
body[data-ds-dark-theme] [data-gitgraph-lanes] > [data-gitgraph-glyph="merge"]:nth-child(6n+3) {
  color: #6FD9E7;
}

body[data-ds-dark-theme] [data-gitgraph-lanes] > [data-gitgraph-glyph="node"]:nth-child(6n+4),
body[data-ds-dark-theme] [data-gitgraph-lanes] > [data-gitgraph-glyph="merge"]:nth-child(6n+4) {
  color: #D9A441;
}

body[data-ds-dark-theme] [data-gitgraph-lanes] > [data-gitgraph-glyph="node"]:nth-child(6n+5),
body[data-ds-dark-theme] [data-gitgraph-lanes] > [data-gitgraph-glyph="merge"]:nth-child(6n+5) {
  color: #ED93B1;
}

body[data-ds-dark-theme] [data-gitgraph-lanes] > [data-gitgraph-glyph="node"]:nth-child(6n),
body[data-ds-dark-theme] [data-gitgraph-lanes] > [data-gitgraph-glyph="merge"]:nth-child(6n) {
  color: #7BC98F;
}

[data-gitgraph-ref]:not([data-gitgraph-ref-current]) {
  background: #C94A3D1F;
  border: 1px solid #B8AA8C33;
}

body[data-ds-dark-theme] [data-gitgraph-ref]:not([data-gitgraph-ref-current]) {
  background: #E8C57C24;
  border-color: #35426B33;
}

div:has( > div > [data-gitgraph-chip]) {
  --dsw-alias-button-tool-bar-fill: #E8C57C14;
  --dsw-alias-border-l2: #B8AA8C61;
  --dsw-alias-label-secondary: #6E6558;
  --dsw-alias-label-tertiary: #B98A2F;
  --dsw-alias-interactive-bg-hover: #E8C57C24;
  --dsw-alias-interactive-bg-active: #E8C57C33;
}

body[data-ds-dark-theme] div:has( > div > [data-gitgraph-chip]) {
  --dsw-alias-button-tool-bar-fill: #E8C57C14;
  --dsw-alias-border-l2: #35426B61;
  --dsw-alias-label-secondary: #C7CCE0;
  --dsw-alias-label-tertiary: #8B93B0;
  --dsw-alias-interactive-bg-hover: #E8C57C24;
  --dsw-alias-interactive-bg-active: #E8C57C38;
}

div:has( > div > [data-gitgraph-chip]) > button[aria-expanded="true"],
[data-gitgraph-chip][aria-expanded="true"] {
  background-color: #E8C57C29;
}

body[data-ds-dark-theme] div:has( > div > [data-gitgraph-chip]) > button[aria-expanded="true"],
body[data-ds-dark-theme] [data-gitgraph-chip][aria-expanded="true"] {
  background-color: #E8C57C2E;
}

[data-phase="active"] [class*="composerSeat"] {
  background: none !important;
}

[data-phase="active"] [class*="composerSeat"]:before {
  content: "";
  z-index: -1;
  pointer-events: none;
  backdrop-filter: blur(6px);
  background: linear-gradient(#0000 0, #F4EEDFDB 36px);
  position: absolute;
  inset: 0;
}

body[data-ds-dark-theme] [data-phase="active"] [class*="composerSeat"]:before {
  backdrop-filter: blur(6px);
  background: linear-gradient(#0000 0, #0E1428D1 36px);
}

[data-dsh-surface="composer"]:focus-within,
[class*="composerSeat"]:focus-within {
  box-shadow: 0 0 0 1px var(--dsw-alias-brand-primary),
              0 0 18px var(--kaguya-glow);
  transition: box-shadow 0.25s ease;
}

[data-dsh-part="message-body"] {
  position: relative;
}

[data-dsh-part="message-body"]::before {
  content: "";
  position: absolute;
  left: -10px;
  top: 4px;
  bottom: 4px;
  width: 2px;
  border-radius: 2px;
  background: var(--kaguya-rule);
  opacity: 0.75;
}

[data-dsh-part="message-body"] pre {
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
}

body[data-ds-dark-theme] [data-chat-flow-kind="user"] {
  --dsw-specific-bubble: #2A1E2E;
  --dsw-alias-border-l1: #6E4A5C;
}

[data-dsh-surface="session-header"] {
  box-shadow:
    inset 0 -1px 0 var(--dsw-alias-border-l1),
    inset 0 -2px 0 var(--kaguya-hairline);
}

body[data-ds-dark-theme] [data-dsh-part="scrollport"]::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse 120% 40% at 50% 118%, rgba(111, 217, 231, 0.06), transparent 60%),
    radial-gradient(ellipse 80% 30% at 50% -8%, rgba(232, 197, 124, 0.05), transparent 60%);
}

/* ---------- 氛围动效 keyframes ---------- */

@keyframes kaguya-breathe {
  from {
    opacity: 0.75;
  }
  to {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  button,
  a,
  .aionui-btn,
  .aionui-menu-item,
  .aionui-explorer-handle,
  .aionui-preview-handle,
  ::-webkit-scrollbar-thumb {
    transition: none;
  }
}
`;

    /* ------------------------------------------------------------
     * PLUGIN_CSS：背景层 + 立绘层 + 氛围层（手写作用域）。
     * z-index：html/body 透明 → #cho-kaguya-backdrop (0)
     * → [id="root"] 应用本体 (1) → #cho-kaguya-stage (3, 立绘)
     * → aionui 菜单/对话框 (>=100, 不受影响)
     * ---------------------------------------------------------- */
    const PLUGIN_CSS = `
${SCOPE} {
  background: transparent !important;
  --dsw-skin-scrim: 1;
}

${SCOPE} [id="root"] {
  position: relative;
  z-index: 1;
}

#${BACKDROP_ID} {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

#${BACKDROP_ID} .ck-bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  opacity: 0;
  transition: opacity 0.8s ease;
}

#${BACKDROP_ID}.ck-theme-light .ck-bg-light {
  opacity: 1;
}

#${BACKDROP_ID}.ck-theme-dark .ck-bg-dark {
  opacity: 1;
}

#${BACKDROP_ID} .ck-bg-light {
  background-color: #FAF6EE;
}

#${BACKDROP_ID} .ck-bg-dark {
  background-color: #0E1428;
}

#${BACKDROP_ID} .ck-bg-light::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse 56% 32% at 86% -4%, rgba(232, 197, 124, 0.14), transparent 62%),
    radial-gradient(ellipse 70% 26% at 8% 108%, rgba(201, 74, 61, 0.07), transparent 58%);
}

#${BACKDROP_ID} .ck-bg-dark::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse 60% 34% at 84% -6%, rgba(232, 197, 124, 0.10), transparent 65%),
    radial-gradient(ellipse 90% 26% at 50% 116%, rgba(111, 217, 231, 0.08), transparent 60%),
    radial-gradient(circle 1.2px at 12% 18%, rgba(240, 237, 221, 0.65), transparent 100%),
    radial-gradient(circle 1px at 28% 42%, rgba(240, 237, 221, 0.45), transparent 100%),
    radial-gradient(circle 1.4px at 46% 12%, rgba(232, 197, 124, 0.55), transparent 100%),
    radial-gradient(circle 1px at 63% 30%, rgba(240, 237, 221, 0.4), transparent 100%),
    radial-gradient(circle 1.2px at 78% 16%, rgba(237, 147, 177, 0.5), transparent 100%),
    radial-gradient(circle 1px at 90% 44%, rgba(240, 237, 221, 0.4), transparent 100%),
    radial-gradient(circle 1.1px at 8% 62%, rgba(232, 197, 124, 0.45), transparent 100%),
    radial-gradient(circle 1px at 36% 78%, rgba(240, 237, 221, 0.35), transparent 100%);
  animation: kaguya-breathe 7s ease-in-out infinite alternate;
}

#${BACKDROP_ID} .ck-meteors {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.8s ease;
}

#${BACKDROP_ID}.ck-theme-dark .ck-meteors {
  opacity: 1;
}

#${STAGE_ID} {
  position: fixed;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  overflow: hidden;
  user-select: none;
}

#${STAGE_ID} img {
  -webkit-user-drag: none;
  user-select: none;
}

#${STAGE_ID} img[data-empty] {
  display: none;
}

#${STAGE_ID} .ck-standee {
  position: absolute;
  right: clamp(6px, 2.5vw, 44px);
  bottom: 0;
  height: min(${CONFIG.standeeMaxVh}vh, ${CONFIG.standeeMaxPx}px);
  width: auto;
  opacity: 0;
  transform: translateZ(0); /* 独立合成层：淡出时 drop-shadow 逐帧重绘不拖尾 */
  transition: opacity 0.7s ease;
}

/* 夜主题显示暗色立绘（右侧） */
#${STAGE_ID}.ck-theme-dark .ck-standee-dark {
  opacity: 0.96;
  filter: drop-shadow(0 0 26px rgba(232, 197, 124, 0.28));
}

/* 昼主题显示亮色立绘（右侧） */
#${STAGE_ID}.ck-theme-light .ck-standee-light {
  opacity: 0.94;
  filter: drop-shadow(0 8px 20px rgba(88, 78, 60, 0.28));
}

/* 让位：指针靠近时快速淡出，移开后按基础 0.7s 缓慢恢复。 */
#${STAGE_ID}.ck-dodge.ck-theme-dark .ck-standee-dark,
#${STAGE_ID}.ck-dodge.ck-theme-light .ck-standee-light,
#${STAGE_ID}.ck-dodge .ck-chibi {
  opacity: ${CONFIG.dodgeOpacity} !important;
  transition-duration: 0.35s;
}

#${STAGE_ID} .ck-chibi {
  position: absolute;
  left: clamp(48px, 7vw, 140px);
  bottom: 10px;
  width: clamp(76px, 9vw, 128px);
  height: auto;
  opacity: 0.9;
  will-change: transform; /* 独立合成层：浮动动画不再每帧重绘，消除重影拖尾 */
  animation: ck-chibi-bob 5s ease-in-out infinite;
}

@keyframes ck-chibi-bob {
  0%, 100% {
    transform: translate3d(0, 0, 0);
  }
  50% {
    transform: translate3d(0, -7px, 0);
  }
}

@media (max-width: 960px) {
  #${STAGE_ID} .ck-standee {
    height: ${Math.round(CONFIG.standeeMaxVh * 0.78)}vh;
    right: 2px;
  }
}

@media (max-width: 700px), (max-height: 540px) {
  #${STAGE_ID} .ck-standee,
  #${STAGE_ID} .ck-chibi {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  #${BACKDROP_ID} .ck-bg-dark::before,
  #${STAGE_ID} .ck-chibi {
    animation: none;
  }

  #${BACKDROP_ID} .ck-bg {
    transition: none;
  }
}
`;

    /* ------------------------------------------------------------
     * scopeCss：把皮肤中心写法的裸选择器 CSS 加上作用域。
     *  - :root                      -> body[data-dsh-cho-kaguya]
     *  - body[data-ds-dark-theme] X -> body[data-dsh-cho-kaguya][data-ds-dark-theme] X
     *  - body::selection 等         -> body[data-dsh-cho-kaguya]::selection
     *  - 其余选择器                 -> 前置作用域（后代）
     *  - @keyframes 原样保留；@media 递归处理
     * ---------------------------------------------------------- */
    function scopeCss(css, scope) {
      scope = scope || SCOPE;
      var out = "";
      var i = 0;
      var n = css.length;

      while (i < n) {
        if (css.startsWith("/*", i)) {
          var end = css.indexOf("*/", i);
          if (end === -1) {
            out += css.slice(i);
            break;
          }
          out += css.slice(i, end + 2);
          i = end + 2;
          continue;
        }

        var brace = css.indexOf("{", i);
        if (brace === -1) {
          out += css.slice(i);
          break;
        }

        var prelude = css.slice(i, brace);
        var trimmed = prelude.trim();

        var depth = 0;
        var j = brace;
        while (j < n) {
          if (css[j] === "{") depth++;
          else if (css[j] === "}") depth--;
          j++;
          if (depth === 0) break;
        }

        if (trimmed.startsWith("@keyframes") || trimmed.startsWith("@font-face") || trimmed.startsWith("@page")) {
          out += css.slice(i, j);
        } else if (trimmed.startsWith("@media") || trimmed.startsWith("@supports")) {
          var inner = css.slice(brace + 1, j - 1);
          out += prelude + "{" + scopeCss(inner, scope) + "}";
        } else if (trimmed.startsWith("@")) {
          out += css.slice(i, j);
        } else {
          var leadWs = prelude.slice(0, prelude.length - prelude.trimStart().length);
          var selectors = trimmed
            .split(",")
            .map(function (raw) {
              var s = raw.trim();
              if (!s) return s;
              if (s === ":root") return scope;
              if (s.indexOf("body[data-ds-dark-theme]") === 0) {
                return scope + "[data-ds-dark-theme]" + s.slice("body[data-ds-dark-theme]".length);
              }
              if (s.indexOf("body") === 0) return scope + s.slice("body".length);
              if (s === "html" || s.indexOf("html ") === 0) return scope + s.slice("html".length);
              return scope + " " + s;
            })
            .join(", ");
          out += leadWs + selectors + " " + css.slice(brace, j);
        }
        i = j;
      }
      return out;
    }

    /* ------------------------------------------------------------
     * 流星群：canvas 粒子（仅暗色·月读）。
     * 多流星随机生成、落入水面泛涟漪；尊重 prefers-reduced-motion；
     * 切亮色主题即停帧清场，卸载时彻底回收。
     * ---------------------------------------------------------- */
    var fx = { canvas: null, c2d: null, raf: 0, last: 0, nextSpawn: 0, w: 0, h: 0, meteors: [], ripples: [], resize: null };
    var dodgeRaf = 0;
    var dodgeParts = [];

    function prefersReducedMotion() {
      return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    function spawnMeteor(w, h) {
      var colors = ["#F2D998", "#E8C57C", "#FFF6DC", "#ED93B1", "#6FD9E7"];
      var roll = Math.random();
      fx.meteors.push({
        x: w * (0.45 + Math.random() * 0.62),
        y: -30 - Math.random() * h * 0.22,
        vx: -(5.2 + Math.random() * 3.2),
        vy: 5.6 + Math.random() * 3.4,
        len: 70 + Math.random() * 90,
        width: 1.2 + Math.random() * 1.2,
        color: colors[roll < 0.5 ? 0 : roll < 0.68 ? 1 : roll < 0.82 ? 2 : roll < 0.93 ? 3 : 4],
        life: 1,
      });
      if (fx.meteors.length > 40) fx.meteors.splice(0, fx.meteors.length - 40);
    }

    function drawMeteors(t) {
      if (!fx.c2d) return;
      var k = (t - fx.last) / 16.7;
      fx.last = t;
      if (!(k > 0) || k > 3) k = 1; /* 首帧/后台切回时避免跳变 */
      var c2d = fx.c2d;
      c2d.clearRect(0, 0, fx.w, fx.h);

      if (t >= fx.nextSpawn) {
        spawnMeteor(fx.w, fx.h);
        if (Math.random() < 0.25) spawnMeteor(fx.w, fx.h);
        fx.nextSpawn = t + 380 + Math.random() * 1100;
      }

      c2d.globalCompositeOperation = "lighter";
      c2d.lineCap = "round";
      var i, m, r, sp, tx, ty, grad;
      for (i = 0; i < fx.meteors.length; i++) {
        m = fx.meteors[i];
        m.x += m.vx * k;
        m.y += m.vy * k;
        m.life -= 0.005 * k;
        if (m.life <= 0) continue;
        if (m.y > fx.h * 0.86 && m.vy > 0) { /* 落入水面：涟漪 */
          fx.ripples.push({ x: m.x, y: fx.h * 0.875, r: 3, life: 1 });
          m.life = 0;
          continue;
        }
        sp = Math.sqrt(m.vx * m.vx + m.vy * m.vy);
        tx = m.x - (m.vx / sp) * m.len;
        ty = m.y - (m.vy / sp) * m.len;
        grad = c2d.createLinearGradient(m.x, m.y, tx, ty);
        grad.addColorStop(0, m.color);
        grad.addColorStop(1, "transparent");
        c2d.strokeStyle = grad;
        c2d.globalAlpha = Math.min(1, m.life) * 0.22; /* 柔光层 */
        c2d.lineWidth = m.width * 3.4;
        c2d.beginPath(); c2d.moveTo(m.x, m.y); c2d.lineTo(tx, ty); c2d.stroke();
        c2d.globalAlpha = Math.min(1, m.life);        /* 亮芯 */
        c2d.lineWidth = m.width;
        c2d.beginPath(); c2d.moveTo(m.x, m.y); c2d.lineTo(tx, ty); c2d.stroke();
      }
      fx.meteors = fx.meteors.filter(function (m) { return m.life > 0; });

      for (i = 0; i < fx.ripples.length; i++) {
        r = fx.ripples[i];
        r.r += 0.9 * k;
        r.life -= 0.018 * k;
        c2d.globalAlpha = Math.max(0, r.life) * 0.55;
        c2d.strokeStyle = "#6FD9E7";
        c2d.lineWidth = 1;
        c2d.beginPath();
        c2d.ellipse(r.x, r.y, r.r * 2.4, r.r * 0.75, 0, 0, Math.PI * 2);
        c2d.stroke();
      }
      fx.ripples = fx.ripples.filter(function (r) { return r.life > 0; });

      c2d.globalAlpha = 1;
      c2d.globalCompositeOperation = "source-over";
      fx.raf = requestAnimationFrame(drawMeteors);
    }

    function startMeteors() {
      if (!CONFIG.meteors || prefersReducedMotion()) return;
      if (!fx.canvas) {
        fx.canvas = document.createElement("canvas");
        fx.canvas.className = "ck-meteors";
        fx.canvas.setAttribute("aria-hidden", "true");
        backdropEl.appendChild(fx.canvas);
        fx.c2d = fx.canvas.getContext("2d");
        fx.resize = function () {
          var dpr = Math.min((typeof devicePixelRatio === "number" ? devicePixelRatio : 1) || 1, 1.5);
          fx.w = fx.canvas.clientWidth || innerWidth;
          fx.h = fx.canvas.clientHeight || innerHeight;
          fx.canvas.width = Math.round(fx.w * dpr);
          fx.canvas.height = Math.round(fx.h * dpr);
          fx.c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        fx.resize();
        addEventListener("resize", fx.resize);
      }
      if (!fx.raf) {
        fx.last = 0;
        fx.nextSpawn = 0;
        fx.raf = requestAnimationFrame(drawMeteors);
      }
    }

    function stopMeteors() {
      if (fx.raf) { cancelAnimationFrame(fx.raf); fx.raf = 0; }
      if (fx.c2d && fx.canvas) fx.c2d.clearRect(0, 0, fx.canvas.width, fx.canvas.height);
      fx.meteors = [];
      fx.ripples = [];
    }

    function disposeMeteors() {
      stopMeteors();
      if (fx.resize) { removeEventListener("resize", fx.resize); fx.resize = null; }
      if (fx.canvas) { fx.canvas.remove(); fx.canvas = null; fx.c2d = null; }
    }

    /* ------------------------------------------------------------
     * 立绘让位：指针靠近立绘/吉祥物时快速淡出，移开后缓慢恢复。
     * 只影响不透明度，pointer-events 始终为 none，不拦截任何交互。
     * ---------------------------------------------------------- */
    function updateDodge(x, y) {
      if (!stageEl) return;
      var hit = false;
      for (var i = 0; i < dodgeParts.length; i++) {
        var el = dodgeParts[i];
        if (!el || el.getAttribute("data-empty") != null) continue;
        var r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (
          x > r.left - CONFIG.dodgePad && x < r.right + CONFIG.dodgePad &&
          y > r.top - CONFIG.dodgePad && y < r.bottom + CONFIG.dodgePad
        ) { hit = true; break; }
      }
      stageEl.classList.toggle("ck-dodge", hit);
    }

    function onPointerMove(e) {
      if (dodgeRaf) return;
      var x = e.clientX;
      var y = e.clientY;
      dodgeRaf = requestAnimationFrame(function () {
        dodgeRaf = 0;
        updateDodge(x, y);
      });
    }

    /* ------------------------------------------------------------
     * 挂载 / 卸载
     * ---------------------------------------------------------- */
    var mounted = false;
    var observer = null;
    var styleEl = null;
    var backdropEl = null;
    var stageEl = null;
    var htmlBgPrev = "";

    function isDark() {
      return (
        document.body.hasAttribute("data-ds-dark-theme") ||
        document.body.classList.contains("dark") ||
        document.documentElement.hasAttribute("data-ds-dark-theme")
      );
    }

    function setImg(img, uri) {
      if (!uri || uri.length < 600) {
        img.setAttribute("data-empty", "");
        img.removeAttribute("src");
      } else {
        img.src = uri;
      }
    }

    function applyTheme() {
      if (!backdropEl || !stageEl) return;
      var dark = isDark();
      var els = [backdropEl, stageEl];
      for (var k = 0; k < els.length; k++) {
        els[k].classList.toggle("ck-theme-dark", dark);
        els[k].classList.toggle("ck-theme-light", !dark);
      }
      if (dark) startMeteors();
      else stopMeteors();
    }

    function mount() {
      if (mounted || typeof document === "undefined" || !document.body) return;
      mounted = true;

      document.body.setAttribute(BODY_ATTR, "");

      styleEl = document.createElement("style");
      styleEl.id = STYLE_ID;
      styleEl.textContent = scopeCss(RAW_CSS) + "\n" + PLUGIN_CSS;
      document.head.appendChild(styleEl);

      htmlBgPrev = document.documentElement.style.background;
      document.documentElement.style.background = "transparent";

      backdropEl = document.createElement("div");
      backdropEl.id = BACKDROP_ID;
      backdropEl.setAttribute("aria-hidden", "true");

      var bgLight = document.createElement("div");
      bgLight.className = "ck-bg ck-bg-light";
      if (art.BgReality && art.BgReality.length >= 600) {
        bgLight.style.backgroundImage = 'url("' + art.BgReality + '")';
      }

      var bgDark = document.createElement("div");
      bgDark.className = "ck-bg ck-bg-dark";
      if (art.BgTsukuyomi && art.BgTsukuyomi.length >= 600) {
        bgDark.style.backgroundImage = 'url("' + art.BgTsukuyomi + '")';
      }

      backdropEl.append(bgLight, bgDark);

      stageEl = document.createElement("div");
      stageEl.id = STAGE_ID;
      stageEl.setAttribute("aria-hidden", "true");

      dodgeParts = [];

      if (CONFIG.standee) {
        /* 通用立绘槽位：把图片放进 assets/standees/（standee-dark.png = 夜主题、
           standee-light.png = 昼主题，支持 .png/.webp/.jpg），跑 npm run embed:assets
           自动内联；某个主题没放图就自动隐藏对应立绘 */
        var standeeDark = document.createElement("img");
        standeeDark.className = "ck-standee ck-standee-dark";
        standeeDark.alt = "";
        setImg(standeeDark, art.StandeeDark);

        stageEl.appendChild(standeeDark);
        dodgeParts.push(standeeDark);

        var standeeLight = document.createElement("img");
        standeeLight.className = "ck-standee ck-standee-light";
        standeeLight.alt = "";
        setImg(standeeLight, art.StandeeLight);

        stageEl.appendChild(standeeLight);
        dodgeParts.push(standeeLight);
      }

      if (CONFIG.chibi) {
        var chibi = document.createElement("img");
        chibi.className = "ck-chibi";
        chibi.alt = "";
        setImg(chibi, art.Chibi);

        stageEl.append(chibi);
        dodgeParts.push(chibi);
      }

      document.body.append(backdropEl, stageEl);

      if (CONFIG.dodge && (CONFIG.standee || CONFIG.chibi)) {
        document.addEventListener("pointermove", onPointerMove, { passive: true });
      }

      applyTheme();
      observer = new MutationObserver(applyTheme);
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ["data-ds-dark-theme", "class"],
      });
    }

    function unmount() {
      if (!mounted || typeof document === "undefined") return;
      mounted = false;

      disposeMeteors();

      if (dodgeRaf) {
        cancelAnimationFrame(dodgeRaf);
        dodgeRaf = 0;
      }
      document.removeEventListener("pointermove", onPointerMove);
      dodgeParts = [];

      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (styleEl) {
        styleEl.remove();
        styleEl = null;
      }
      if (backdropEl) {
        backdropEl.remove();
        backdropEl = null;
      }
      if (stageEl) {
        stageEl.remove();
        stageEl = null;
      }
      document.body.removeAttribute(BODY_ATTR);
      document.documentElement.style.background = htmlBgPrev;
    }

    function apply() {
      mount();
      return unmount;
    }

    function dispose() {
      unmount();
    }

    function plugin() {
      return { apply: apply, dispose: dispose };
    }

    /* 导出面（CJS 风格，模拟 ESM 命名空间） */
    exports.scopeCss = scopeCss;
    exports.mount = mount;
    exports.unmount = unmount;
    exports.apply = apply;
    exports.dispose = dispose;
    exports.default = plugin;

    /* 浏览器里物化时自动挂载（loader 不调 apply 的兜底） */
    if (typeof document !== "undefined" && typeof window !== "undefined") {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", mount, { once: true });
      } else {
        mount();
      }
    }

    /* 关键：factory 必须 return module.exports，否则物化结果是 undefined，
       客户端 cordis runner 会报 "invalid plugin ... received undefined" */
    return module.exports;
  }
});
