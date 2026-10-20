# 寻词 · Pinterest 中文直译

浏览器扩展在 `extension/`，固定版本包在 `downloads/`。当前版本 **0.4.1**。

在 Pinterest 搜索框输入中文，自动显示一条英文，点击搜索。优先使用 Chrome 本机翻译；缺少引擎或调用失败时尝试有限额的 MyMemory 在线服务。无需 API 配置。

- [安装与使用](extension/README.md)
- [自查报告与未解决的外部限制](extension/AUDIT.md)
- 自动化检查：`node extension/tests/all.cjs`
- 真实模型检查：`node extension/tests/live-native.cjs`
- 打包：`python3 extension/tools/package.py`

本次真实模型下载未完成，真实网站/在线接口受云端网络阻断；不要将模拟测试通过理解为真实翻译已完整验证。`index.html` 是早期独立网页原型，不是插件入口。
