# 寻词 · Pinterest 中文直译

主产品位于 `extension/`：在 Pinterest 原有搜索框输入中文，停顿后自动显示一条英文翻译，点击即可在当前标签页搜索。不再提供绘画分类、拆解或推荐。

安装、更新与 AI 设置见 [扩展使用说明](extension/README.md)。`index.html` 是早期独立网页原型，不是插件入口。

扩展无需构建。开发检查：

```sh
node extension/tests/smoke.cjs
```

需要 Node.js、Playwright、Chromium。自动化使用模拟 Pinterest 页面和模拟 AI 响应；真实网站及真实 AI 服务需要本机试用验证。
