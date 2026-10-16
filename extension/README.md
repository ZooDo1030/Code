# 寻词：Pinterest 浏览器扩展

适用于电脑 Chrome / Edge。手机 Pinterest App 不支持该扩展。

## 安装与试用

1. 将本仓库下载到电脑并解压，保留整个 `extension` 文件夹。
2. Chrome 打开 `chrome://extensions`，或 Edge 打开 `edge://extensions`。
3. 开启「开发者模式」，点击「加载已解压的扩展程序」，选择 `extension` 文件夹。
4. 打开或刷新 Pinterest 网页。在原有搜索框输入中文，稍候出现「寻词」面板；也可点击搜索框旁的「✳ 寻词」。
5. 选择绘画、插画、物件或人物方向，点击「生成英文建议」。选择一组，直接在当前标签页搜索。

例如：`阳光透过玻璃杯的光影`、`手部不同角度绘画参考`、`水彩森林小屋`。
本地词库不理解任意句子或否定条件；不认识的内容会提示。原有 Pinterest 搜索与 Enter 行为保持可用。

## 启用 AI 语境翻译

点击插件图标或面板的「设置 AI」，填写你自己的 OpenAI Chat Completions 兼容服务的完整 HTTPS 接口地址、模型名称和 API 密钥，然后保存，并授权该服务域名。生成时会实际请求服务；失败会提示，不会伪装成 AI 结果。服务需支持 `messages` 与标准 `choices[0].message.content` 响应。使用 AI 可能产生费用。

密钥仅存储于扩展的 `chrome.storage.local`，不使用同步存储，也不注入 Pinterest 页面。该存储并非加密保险库，建议使用限额专用密钥。描述与所选参考方向仅在点击生成时发给所配置的服务，不发送页面、账号、图片或浏览记录。不要将密钥提交到 Git。可在设置中清除配置；撤销域名权限可在浏览器的扩展管理页操作。

默认支持 www.pinterest.com、co.uk、jp、fr、de、ca、com.au。其他地区域名需加入 manifest 的 host_permissions 和 content_scripts.matches 后重新加载。插件依赖 Pinterest 搜索框结构，网站更新后可能需要调整定位。若无按钮，请确认域名与扩展权限并刷新页面。

## 验证范围

可运行 `node extension/tests/smoke.cjs`（从仓库根目录），需要 Node.js、Playwright 与 Chromium。已通过模拟 Pinterest 搜索框的面板打开、关键词生成、方向切换、当前标签页跳转，以及模拟 AI 成功、无效密钥、无效 JSON 检查。云环境管理员策略禁止加载未打包扩展，网络策略阻止访问 Pinterest。真实 Pinterest 登录页面、用户本机安装，以及带有效凭据的模型服务仍需实际试用。加载后首次访问可先用本地词库，无需密钥。
