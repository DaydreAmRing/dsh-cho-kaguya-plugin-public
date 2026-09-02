这个文件夹放你自己的立绘 / 吉祥物图片（本仓库不附带任何角色素材）。

按文件名对应槽位，构建时会自动扫描并内联：

  standee-dark.png   →  夜主题（月读）右下角立绘
  standee-light.png  →  昼主题（东京）右下角立绘
  chibi.png          →  左下角 Q 版吉祥物（会轻轻浮动）

扩展名支持 .png / .webp / .jpg，文件名不同也可以——构建脚本把
文件名转成 PascalCase 作为资产键（如 my-girl.png → MyGirl），
但上面三个约定名最省事，模板直接识别。

放好图片后两步启用：
  1. lib/client.template.js 顶部 CONFIG 里把 standee / chibi 改成 true
  2. 运行  npm run embed:assets  重新构建，然后刷新/重启 DSH

建议：透明背景 PNG（可用 rembg 之类的工具抠图）、高度 1000px 以上、
单张 1MB 以内。注意图片版权：自备素材仅供个人使用，请勿再分发。
