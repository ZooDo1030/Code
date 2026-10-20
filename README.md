# 寻词 · Pinterest 中文直译

浏览器扩展位于 `extension/`。0.4.0 优先使用 Chrome 本机 Translator API；首次需要点击下载语言包，之后自动显示中文对应的英文，可点击直接搜索。不支持本机模式时仍有在线服务的额度限制。

安装更新、隐私及验证边界见 [扩展说明](extension/README.md)。扩展无需构建。开发检查：`node extension/tests/smoke.cjs`（需 Node.js、Playwright、Chromium）。`index.html` 是早期原型，不是扩展入口。
