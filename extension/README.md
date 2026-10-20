# 寻词：Pinterest 中文直译（0.4.0）

在 Pinterest 搜索框输入中文，停顿后自动显示一条英文，点击直接搜索。不分类、不推荐。不需要账号、API 密钥或模型配置。

## 这次修复

- 优先调用 Chrome 的 Translator API 在本机翻译，不消耗 MyMemory 每日免费额度。
- 本机首次缺少语言包时，明确显示「启用本机翻译」。点击后由 Chrome 下载中文转英文语言包，显示进度；后续自动翻译。下载需用户点击、网络、可用磁盘及浏览器支持。下载失败会提示，不能保证每台电脑都能使用。
- 不支持本机翻译的浏览器保留 MyMemory 在线模式，该模式仍受每日额度限制。
- 严格识别服务的 quotaFinished，只将布尔 true 或字符串 "true" 当作耗尽，不将 "false" 当成 true。
- 搜索框被网站直接清空、未触发 input 事件时，也会移除旧译文/错误提示。
- 信息页不再反复发送“你好”消耗在线额度，仅检查本机能力。

## Mac 安装与更新

从 GitHub `codex/xunci-pinterest-extension` 分支点击 Code → Download ZIP，解压。把新版 `extension` 文件夹内容替换到之前加载的文件夹。在 `chrome://extensions` 中重新加载寻词，并刷新 Pinterest。也可移除旧版后加载新版。

扩展管理页版本应为 0.4.0。使用当前稳定版桌面 Chrome；Safari 不支持。本机模式以浏览器实际能力检测为准，不要求修改实验性 flags。首次在 Pinterest 输入中文，若出现「启用本机翻译」，点击一次并等待语言包完成。已有语言包会直接翻译，无需再次点击。

## 隐私和限制

本机模式不向 MyMemory 发送原文，语言包由 Chrome 管理。无法提供本机模式时的在线翻译使用 `https://api.mymemory.translated.net/get`，发送中文搜索框原文，不发送 Pinterest 页面、图片、账号或 Cookie。免费额度和网络可用性由服务商决定。扩展图标中的开关可暂停所有翻译。缓存仅存于内存。旧版 AI 密钥配置在扩展更新时被清除。

支持 www.pinterest.com、co.uk、jp、fr、de、ca、com.au，最多 150 字中文搜索文本。

## 验证与已知边界

`node extension/tests/smoke.cjs` 需要 Node.js、Playwright 和 Chromium。测试包括在线请求/额度解析、缓存/暂停/错误、本机 API 模拟下载及自动翻译、真实点击激活、无在线请求、输入法/防抖/忽略旧结果、未触发 input 的清空、Esc 和当前页跳转。

实际 Chromium 154 主世界和隔离世界均检测到 Translator API，中文转英文状态为 downloadable。尝试真实模型下载在云端 20 秒后超时，未获得真实本机译文；因此本机模型可下载和实际翻译质量仍未完成端到端验证。在线 MyMemory 的真实请求也受云端网络策略限制。模拟测试通过不代表真实模型/网站已完全验证。
