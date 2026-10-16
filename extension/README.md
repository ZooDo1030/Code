# 寻词：Pinterest 中文直译（0.3.0）

无需翻译账号、模型名称、API 密钥或接口配置。适用于电脑 Chrome / Edge；不支持 Safari 和手机 Pinterest App。

## 安装或更新

打开 GitHub 的 `codex/xunci-pinterest-extension` 分支，点击 Code → Download ZIP 并解压。

首次安装：打开 `chrome://extensions`（Edge 为 `edge://extensions`），开启开发者模式，加载仓库中的 `extension` 文件夹，然后刷新 Pinterest。

从旧版更新：将新版 `extension` 中所有文件替换到原来加载的文件夹，进入扩展管理页点击寻词的重新加载按钮。新增的翻译服务域名权限如需确认，请允许，然后刷新 Pinterest。也可以移除旧版后直接加载新版文件夹。

## 使用

在 Pinterest 原有搜索框输入中文，停顿约半秒后，旁边自动显示一条英文翻译。点击英文，在当前标签页搜索。不分类、不推荐、不补充绘画关键词。最多支持 150 字的短搜索描述。

不再使用有限词库或要求配置 AI。中文输入法选字中不会发起请求；更改输入后旧翻译立即失效；同页重复输入优先使用缓存。失败时显示原因并可点击重试。原有 Pinterest 搜索框的 Enter 行为保持可用，Esc 收起翻译。

点击扩展图标可查看服务连接检测和暂停/开启自动翻译。没有密钥输入框。

## 在线服务与隐私

自动翻译使用无需密钥的 MyMemory 官方公开 API：`https://api.mymemory.translated.net/get`，语种为 `zh-CN|en`。请求在扩展后台发起；权限仅覆盖支持的 Pinterest 网页和这一翻译服务域名。

搜索框中包含中文的内容在停止输入后自动发送给 MyMemory，也包括打开已有中文搜索内容的页面。不发送 Pinterest 账号、页面、图片、Cookie；请求不携带凭据和来源页信息。翻译缓存仅保存在内存，旧版 AI 配置会在扩展更新时清除，不再读取或使用。打开扩展信息页会用“你好”测试连接。

免费服务有每日额度和可用性限制（匿名通常为每日 5,000 字符，以官方最新说明为准），不是无限或离线服务。网络、额度、服务返回不完整译文时会明确提示，不把错误信息当成英文结果。服务隐私与额度说明：https://mymemory.translated.net/doc/usagelimits.php

支持 www.pinterest.com、co.uk、jp、fr、de、ca、com.au。Pinterest 页面结构变化可能需要调整搜索框定位。

## 开发验证

运行 `node extension/tests/smoke.cjs`，需要 Node.js、Playwright 和 Chromium。自动检查覆盖无密钥 API 请求参数、缓存、暂停、额度、网络与响应错误，以及模拟 Pinterest 页面的自动单条翻译、输入防抖、中文输入法、过期响应、重试入口、清空/英文输入与当前页搜索。

本次真实服务请求被云环境出站代理以 403 拦截，未获得真实译文；云端也禁止实际加载未打包扩展。因此模拟检查通过不代表真实服务或最新 Pinterest 页面已经验证。用户浏览器独立使用自身网络，扩展信息页会显示实际服务连接结果。
