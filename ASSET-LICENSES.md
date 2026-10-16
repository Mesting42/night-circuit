# 素材来源与许可

本项目没有使用外链赛车模型、商业车辆品牌、贴图 CDN、在线字体接口或远程音乐。

| 内容 | 来源 | 许可 / 说明 |
|---|---|---|
| 隼 S1 / 脉冲 GT / 重岳 V8 车辆 | 本项目 `src/render.js` 原创程序化几何 | 原创设计，不对应真实品牌 |
| 九条闭合路线、城市、灯具、仓库、海岸、森林、峡谷、雪山和冰湖 | 本项目 `src/tracks.js`、`src/render.js` 与 `src/environments.js` | 原创程序化几何 |
| 路面、建筑窗户、车牌、影子 | 本项目 canvas 纹理生成代码 | 原创，运行时在本地生成 |
| 近光灯配光、截止线与降水受光 | 本项目 `src/headlights.js` 的半浮点纹理和着色代码 | 原创，在本地生成，无贴图或接口外链 |
| 音乐与引擎、漂移、氮气等音效 | 本项目 `src/audio.js` Web Audio 合成 | 原创合成，无音频采样和外部接口 |
| Noto Sans SC | 本地 npm 包 `@fontsource/noto-sans-sc`，上游 https://github.com/notofonts/noto-cjk | SIL Open Font License 1.1；`licenses/Noto-Sans-SC-OFL.txt` |
| Barlow Condensed | 本地 npm 包 `@fontsource/barlow-condensed`，上游 https://github.com/jpt/barlow | SIL Open Font License 1.1；`licenses/Barlow-Condensed-OFL.txt` |
| Three.js 与 BufferGeometryUtils | 本地 npm 包 `three`，https://github.com/mrdoob/three.js | MIT；`licenses/Three-MIT.txt` |
| Vite | 本地构建工具，https://github.com/vitejs/vite | MIT；`licenses/Vite-LICENSE.txt` |
| Playwright | 本地自动测试工具，https://github.com/microsoft/playwright | Apache-2.0；不参与普通游戏运行 |

字体文件经 Vite 复制到 `dist/assets`，运行时请求来自本项目服务器。本文的上游地址仅用于溯源，不是运行依赖。

技术实现参考 Three.js 官方 MeshPhysicalMaterial 文档与 Vite 官方构建文档；未复制第三方完整游戏模板。
