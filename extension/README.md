# 寻词：Pinterest 中文直译（0.2.0）

适用于电脑 Chrome / Edge。手机 Pinterest App 和 Safari 不支持。

## 安装与更新

从 GitHub 的 `codex/xunci-pinterest-extension` 分支点击 Code → Download ZIP 并解压。

首次安装：打开 `chrome://extensions`（Edge 使用 `edge://extensions`），开启开发者模式，点击「加载已解压的扩展程序」，选择仓库中的 `extension` 文件夹，然后刷新 Pinterest。

更新：将新版 `extension` 文件夹的内容替换到先前加载的文件夹；在浏览器扩展管理页点击寻词卡片的重新加载按钮，然后刷新 Pinterest。也可以移除旧插件，再加载新版文件夹，但移除会清空已保存的 AI 配置。

## 使用

直接在 Pinterest 原有搜索框输入中文。停止输入约半秒后，旁边自动显示一条英文翻译；空间不足时显示在搜索框下方。点击英文，在当前标签页搜索。无需点击生成、选择绘画分类或查看多条推荐。翻译保留原意，不增加绘画、插画等原文没有的词。

例如：`阳光透过玻璃杯的光影`。

原有搜索框和 Enter 行为保持可用，Esc 可以收起翻译。纯英文或空输入不显示翻译。中文输入法选字过程中不会发送请求；同一页面已翻译的内容使用短期内存缓存。翻译失败或超出词库会显示提示。

## AI 翻译配置与隐私

点击插件图标或翻译旁的「设置」，填写你自己的 OpenAI Chat Completions 兼容服务的完整 HTTPS 接口地址、模型名称和 API 密钥，保存并授权服务域名。

配置后，搜索框中包含中文的内容会在停止输入约半秒后自动发送到你选择的服务商（包括打开已有中文搜索内容的页面）。服务需支持标准 `messages` 请求与 `choices[0].message.content` 响应。AI 调用可能产生费用；没有配置时只使用有限的本地完整词条，不承诺任意句子翻译，不会把未知词丢掉再显示不完整翻译。

密钥保存在扩展 `chrome.storage.local`，不使用同步存储、不注入 Pinterest 页面。此存储并非加密保险库，请使用限额专用密钥。插件仅发送搜索框原文，不发送页面、账号、图片或浏览历史。不要将密钥提交到 Git。可以在设置中清除配置；可在浏览器扩展管理页撤销服务域名权限。

默认支持 www.pinterest.com、co.uk、jp、fr、de、ca、com.au。其他地区域名需加入 manifest 的 host_permissions 和 content_scripts.matches，再重新加载。Pinterest 页面结构变化可能需要调整搜索框定位。

## 开发验证

在仓库根目录运行 `node extension/tests/smoke.cjs`，需要 Node.js、Playwright 和 Chromium。本环境验证了模拟页面的自动翻译、输入防抖、中文输入法、忽略过期响应、不识别内容提示、空输入与英文输入、当前标签页跳转，以及模拟 AI 的单条翻译和错误响应。

云端 Chromium 管理员策略禁止加载未打包扩展，网络策略阻止真实 Pinterest。新版真实网站兼容性仍需本机验证；带有效密钥的真实模型服务尚未验证。
