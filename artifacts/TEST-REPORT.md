# 夜行赛道测试报告

验证日期：2026-10-08（Asia/Shanghai）  
版本：1.0.0  
路径：`D:\AnLi\夜行赛道`  
验证服务器：Vite 开发服务 `http://localhost:5188`；生产构建由 `npm run build` 生成，Windows 启动器使用 5178–5208 中可用端口。

## 通过项目

- `npm test`：29/29 通过（含 9 项动态难度和 4 项地图扩展专项）。
  - 九条路线独立且有足够道路间距。
  - 顺序检查点、反向穿线、跳点、蹭终线和高速线段穿越。
  - 全车身碰撞、质量冲量、护栏边界、复位保护与惩罚。
  - 刹车覆盖油门、氮气耗尽、真实漂移侧滑与抓地恢复。
  - 固定 1/120 物理步长在 30/60/120 FPS 的位置与计时一致。
  - 商店幂等、重试回滚、奖金只结算一次、无效存档备份。
  - 低名次九站完成、未夺冠后可继续和重试。
- `npm run verify:season`：固定 1/120 物理模拟，以控制器输入完成九站锦标赛；每站合法完赛、真实发放奖金，实际升级雨地轮胎并购买第二辆赛车，最终进入实际赛季结算；当前标准控制器在九站获得 3、3、2、2、3、2、3、2、2 名，冠军由实际积分产生。该脚本没有设置车辆位置、性能、圈数、检查点、排名或夺冠状态。
- `node tests/driving.test.js`：3/3 通过。三辆车达到不同真实极速；手刹产生侧滑并可收回；四名 AI 在九条路线合法完成三圈，无复位惩罚。
- `node tests/pro-drive.js`：通过。竞速难度正常输入完成九站但玩家未夺冠；冠军由 AI 获得，重试最后一站恢复可用，赛季没有锁死。
- `node scripts/browser-checks.mjs`：13/13 通过。真实浏览器事件验证双指转向+油门、向左/向右轮盘输入、独立抬指、刹车覆盖油门、pointercancel、暂停冻结、Esc 恢复倒计时、复位、竖屏横屏锁提示、对话框焦点循环、设置刷新持久化、刷新后回到赛前、无外部请求和无页面异常。
- `node scripts/browser-lifecycle.mjs`：通过。菜单和比赛合成音频存在真实采样；四次比赛/菜单循环 GPU 几何与纹理计数稳定（当前低画质雨港练习场景几何 205、纹理 9，四轮一致）；三款本地车辆预览与性能面板都能加载；无页面异常。
- `node scripts/inspect.mjs`：桌面 1440×900、手机 390×844、平板 1024×768 菜单与驾驶截图无横向溢出、无页面异常。截图保存在 `artifacts/screenshots`。
- 城市地面视觉复核：赛道外新增可见的湿沥青/混凝土拼接地面、道路两侧人行道、建筑地台与路缘、局部积水反光；房屋底部已与地面连续连接，不再出现悬空观感。
- `npm run build`：通过。Vite 生产构建完成，Three.js 以独立 chunk 输出；字体和依赖来自本地项目。
- `node scripts/check-direction.mjs`：通过。键盘与触屏轮盘统一方向：向左产生正转向输入，向右产生负转向输入。
- impeccable 设计检测：首次检测发现氮气条的 width 动画；已改为 transform/无布局动画，随后检查与 finish review 均通过。finish review 最终 disposition：pass。

## 温和动态难度专项

- 竞技评估保存在原存档内，最近 10 场记录有车、改装、辅助、基础难度和赛道条件。完成锦标赛分站才学习；每场评估变化最多 4 分，事故降低权重，同一结算不会重复计数。重试保留驾驶经验，旧存档补齐评估数据并保留原进度。
- 赛中依据合法赛道进度温和修正 AI 目标节奏，幅度最多 ±3%，12 秒平滑时间常数；2 秒内差距不修正。起步、停车、逆行、碰撞、复位保护和最后 180 米回归本场节奏。玩家物理参数、位置、速度、检查点和计时没有被算法直接修改。
- 最低和最高评估下，叠加极限实时修正，四名对手均在九条赛道合法完成三圈、96 个检查点，没有复位惩罚。
- `npm run verify:adaptive`：两档正常输入控制器各完成 10 场，并通过实际结算训练。较慢控制器前 3 场与领头车的平均差距 14.82 秒，最后 3 场 9.09 秒；较快控制器对应竞争差距从 3.74 秒降至 2.29 秒，第 10 场与前后车分别相差 0.85、约 0.95 秒。后车未冲线的差距按合法剩余距离估算。记录在 `artifacts/adaptive-driving.json`。
- 三辆车的原厂与满级改装共 6 组配置正常完赛、无玩家复位，实际车辆参数保持为正常改装计算值，车辆与改装条件正确写入成绩。
- 浏览器已有操作回归 12/12 通过；桌面和手机的设置反馈无横向溢出。专项浏览器闭环 5/5 通过：正常输入合法完成一站并学习一次、赛后反馈、刷新恢复、重试保留经验，无页面异常和外部资源请求。该专项使用加速浏览器帧时钟，仍执行原始 1/120 物理与键盘/指针控制事件；它不等同于完整真实时间六站长跑。结果见 `artifacts/browser-adaptive.json`。

这里的模拟结果说明适应方向及竞争差距得到改善，不代表对所有人的胜率保证。长期实力评估与单场 ±3% 修正分开限幅；车辆始终受真实物理上限约束。

## 三条自然赛道扩展

- 新增松岚山径、赤岩峡谷、霜湖雪岭，分别为 2.49、2.72、2.57 km，全部三圈、32 个顺序检查点。九条路线的道路间距校验通过。
- 原六站赛季补齐固定路线 ID 列表，已有结果、积分、金币、轮胎改装、动态实力和完赛边界保留。新赛季采用九站；每站结算后重新读取存档，九站后结算及最后一站重试均通过。
- 三辆车 × 原厂/满级 × 三条自然赛道，共 18 组正常输入三圈计时模拟全部合法完成，无复位或惩罚。干燥与低温路面的抓地/制动系数作用于玩家和 AI，车辆属性没有被直接修改。
- 四名对手在九条赛道的默认实力，以及最低/最高实力叠加实时修正极限时全部合法完成，无复位。
- 地图浏览器专项最终 5/5 通过（两轮桌面/手机截图，修正连续路肩、林木、砂岩层理、冰面与当前选图定位后复测）：桌面和手机九站赛程、九图选择、三张地图的独立地形与天气、正常输入驾驶 40 秒并通过有序检查点、练习/计时/锦标赛发车。无浏览器和着色器错误，无外部请求。`artifacts/browser-maps.json` 保存证据；浏览器帧时钟加速，原物理仍为固定 120 Hz。完整九站赛季使用 Node 固定步长模拟，未声称浏览器真实时间完整九站长跑。
- 生产构建浏览器验证 3/3：九图选择和峡谷发车、生产版无开发遥测、实际旧版浏览器存档原六站赛程及成绩可读取，原金币与积分一致；页面异常与外部请求为零，见 `artifacts/maps-production.json`。

- 地图最终视觉复核 disposition：`ship`。五项初轮发现（当前选图可见、森林密度与形态、砂岩层理、冻结湖面、连续路肩）全部 `resolved`，无开放项；见 `artifacts/maps-visual-review.md`。

## 近光灯真实性修正

- 移除车前两张三角形加色光片，改用真实 SpotLight 与本地半浮点配光纹理；柔和边缘、上方截止、右侧路肩略高，亮度沿距离衰减。三款车采用暗色灯壳、LED 条及圆形投射透镜。
- 湿路改为低金属度沥青底层与湿润反光层；护栏和实体场景参与阴影，静态合并保留投影属性，透明车底影子不再作为实体遮挡物。雨雪粒子根据玩家灯光的配光轻微提亮，无实体光锥。
- `node scripts/browser-headlights.mjs`：7/7 通过。实际 GPU 光学台验证场景受光、上方截止、前车遮挡、低画质配光、车身转向和右侧抬高截止，无着色器错误或外部请求。测试仅操纵独立渲染场景，不修改游戏物理或进度。证据为 `artifacts/browser-headlights.json`。
- `node scripts/headlights-gameplay.mjs`：五车锦标赛真实键盘加速和转向、运行中切换中/高/低/中画质、暂停恢复、横屏/平板视口和复位均通过；`artifacts/headlights-gameplay.json`。
- `node scripts/headlights-cars.mjs`：隼 S1、脉冲 GT、重岳 V8 三款本地车辆预览均通过，无页面异常；`artifacts/headlights-cars.json`。
- `node scripts/headlights-production.mjs`：生产 bundle 使用最新构建，雪山赛道照明和 HUD 正常，生产版无开发遥测、着色器错误或外部请求；`artifacts/headlights-production.json`。
- 城市雨夜、森林、峡谷和雪地的桌面 1280×800、手机竖屏 390×844 与横屏 844×390 画面已检查；三角形边界消失，照明连续、截止与阴影可读，路面和 HUD 保持清晰，手机竖屏由横屏提示层拦截。截图与结果见 `artifacts/screenshots/headlights-*` 和 `artifacts/headlights-visual.json`。
- 原有物理与进度测试 28/28、浏览器操作 12/12 通过；四次进出练习赛的 GPU 资源计数稳定，音频与三款车辆预览仍正常。

## 手机和平板强制横屏

- 新增 `src/orientation.js` 横屏守卫：只对触控手机和平板的竖屏生效，显示全屏“请横屏游玩”提示，禁止游戏输入；电脑浏览器不受影响。浏览器支持时在用户开始比赛后尝试 `screen.orientation.lock("landscape")`，失败时使用同样的网页拦截作为兼容回退。
- 比赛中转回竖屏会自动暂停车辆物理、计时、音频和触控；恢复横屏后自动继续。手动暂停状态不会被方向恢复误解除。
- `node scripts/browser-orientation.mjs`：9/9 通过，覆盖桌面浏览器、手机竖屏拦截、横屏解除、比赛中转回竖屏冻结计时、横屏恢复和无页面异常。结果见 `artifacts/browser-orientation.json`。
- `node scripts/browser-touch-options.mjs`：8/8 通过，验证左右箭头按键、轮盘布局切换、设置持久化和全屏按钮开关；横屏箭头驾驶画面见 `artifacts/screenshots/touch-controls-buttons.png`。
- `node scripts/browser-fullscreen.mjs`：8/8 通过，验证菜单、暂停页和手机竖屏提示的全屏入口及横屏恢复；`node scripts/browser-fullscreen-reject.mjs`：1/1 通过，验证浏览器拒绝全屏时仍显示横屏锁屏和错误提示。
- `node scripts/browser-production-options.mjs`：生产版 3/3 通过，验证竖屏提示页的全屏入口、比赛页左右箭头和轮盘切换，以及无开发遥测、页面异常或外部请求；生产截图见 `artifacts/screenshots/production-touch-arrows.png`。

## 触屏转向与网页全屏

- 统一轮盘、左右箭头键与键盘的转向符号。设置可在“轮盘 · 拖动转向”与“左右按键 · 直接转向”之间切换，默认轮盘；旧存档自动补上默认选项，进度不重置。
- 手机和平板横屏提示、主菜单和暂停页面添加“全屏游玩”入口，默认显示；设置可关闭其显示。点击时通过浏览器全屏 API 进入或退出全屏，并尝试锁定横屏。浏览器拒绝时显示明确的回退提示并继续拦截竖屏操作。
- 浏览器验证脚本：`browser-touch-options.mjs` 覆盖设置持久化、两种布局、左右箭头方向和比赛中切换；`browser-fullscreen.mjs` 覆盖主菜单/暂停页/竖屏提示的全屏入口；`browser-fullscreen-reject.mjs` 覆盖浏览器拒绝后的回退状态。结果写入 `artifacts/browser-touch-options.json`、`browser-fullscreen.json` 与 `browser-fullscreen-reject.json`。

## 手机和平板地图预览

### 2026-10-09 进一步缩小地图并分开油门与氮气

- 手机 844×390 的地图从 118px 缩至约 96px，平板 1024×768 从 143px 缩至 116px；窄横屏手机为 88px。名次、地图与左侧转向区之间保留空隙。
- 氮气改放油门左上方；常规布局横纵间隔各 24px，低高度横屏各 20px。油门触控区扩大至 96×64px，低高度横屏为 88×56px；速度与氮气仪表避让新的操作区域。
- `node scripts/browser-pedal-spacing.mjs`：5/5 通过，覆盖 844×390、667×375、568×320、1024×768 触控视口和 1440×900 桌面。四种触控视口使用真实浏览器触摸事件完成油门按住、叠加氮气、实际消耗氮气、松开氮气保留油门与取消触摸清空输入。桌面小地图保留 190px，触控操作不显示。证据为 `artifacts/browser-pedal-spacing.json`。
- `node scripts/browser-touch-options.mjs`：8/8 通过，左右箭头输入、轮盘切换、持久化与全屏开关保持可用。生产构建通过，已重新上传 Cloudflare Pages。
- `node scripts/browser-pedal-spacing.mjs https://mest-circuit.pages.dev/`：线上生产版布局 5/5 通过，无页面异常。截图为 `artifacts/screenshots/production-pedal-spacing-*.png`，结果为 `artifacts/browser-pedal-spacing-production.json`。双指状态和氮气消耗在开发版只读遥测中验证，生产版不包含遥测。

### 2026-10-08 首次缩小地图的验证记录（已由上方布局更新）

- 触控设备按视口宽度缩放实时赛道小地图；横屏手机地图宽 118 px，平板宽 143 px。手机名次栏与地图间距 33 px，地图与触控操作区间距 16 px；平板两个面板间距充足。
- `node scripts/browser-map-spacing.mjs` 与 `node scripts/browser-map-spacing.mjs https://mest-circuit.pages.dev/` 均通过手机横屏、平板横屏布局检查（各 2/2），包含地图尺寸、名次间距、触控区留白和浏览器异常检查。截图见 `artifacts/screenshots/phone-landscape-map-spacing.png`、`tablet-landscape-map-spacing.png` 及对应的 `cloudflare-*` 文件。

## Cloudflare Pages 部署

- 项目 `mest-circuit` 已完成生产构建上传，`https://mest-circuit.pages.dev/` 返回 HTTP 200；Cloudflare 生产版手机和平板布局检查 2/2 通过。
- 自定义主机名 `mest-circuit.page.dev` 已挂到 Pages 项目，但证书/域名验证仍为 pending，Cloudflare 返回 `CNAME record not set`。当前 `page.dev` 的权威 DNS 不在该 Cloudflare 账号；需在其 DNS 服务添加 `CNAME`，名称 `mest-circuit`，目标 `mest-circuit.pages.dev`，然后重新检查验证状态。

## 浏览器全赛季证据边界

`scripts/browser-season.mjs` 使用真实浏览器中的键盘和指针事件驾驶，而不是直接设置车辆位置。它已实际完成教学及前几站并保存结果截图；完整九站流程由固定步长正常输入验证覆盖，浏览器脚本的长时间运行受当前会话时长限制，未把未完成的浏览器长跑写成已完成。浏览器 acceptance 脚本遇到路线卡住时会使用真实 `R` 复位，不能把这类结果当作无复位计时纪录。

## 未做或无法声称的验证

- 没有实体手机、平板或不同浏览器设备；触控报告是 Playwright 设备视口和多点事件模拟，不是实体设备测试。
- 没有声称照片级真实感；当前画面是本地程序化几何、雨滴、湿路材质、车灯和环境光的风格化雨夜表现。
- 已部署 Cloudflare Pages；尚未加入 PWA、安装包或联网账号。
- 硬件 WebGL 性能会因 GPU、浏览器和屏幕分辨率变化；低画质保持页面原生尺寸并关闭阴影、减少特效，不改变规则。

## 2026-10-09 赛车轮廓与细节清晰度

- 定位到低绘制像素比：原中画质最高 1.25 倍、触控高画质最高 1.4 倍，低画质仅 0.85 倍。场景直接渲染，无运动模糊或后处理；保留车辆几何、比赛镜头与驾驶规则。
- 改为低画质 1 倍原生尺寸、中画质最高 1.75 倍、高画质触控最高 2 倍/桌面最高 2.25 倍。DPR 1 桌面中/高画质分别至少请求 1.25/1.5 倍超采样；300 万/600 万总量预算限制额外像素，原生大屏至少保持 1 倍。窗口、全屏、旋转与 DPR 变化重新计算，渲染帧的 DPR 检查覆盖浏览器遗漏密度通知的情况。
- `npm test`：33/33 通过，包括新增的触控/桌面像素策略、预算、4K/8K 原生下限与 DPR/旋转数学检查。生产构建通过。
- `node scripts/browser-render-clarity.mjs before`：3/3 修改前基线；`node scripts/browser-render-clarity.mjs after`：3/3 通过。桌面 1440×900/DPR 1、手机 844×390/DPR 3、平板 1024×768/DPR 2 的中画质绘制缓冲分别从 1440×900、1055×487、1280×960 提升为 1800×1125、1477×682、1792×1344。桌面像素约增加 56%，手机和平板约增加 96%。
- 浏览器实测三种视口均启用抗锯齿且 `gl.SAMPLES=4`；中/高/低画质切换成功，真实键盘油门加速到 12 m/s 以上，并保存驾驶截图；移动视口转到竖屏拦截后回到横屏保持正确缓冲尺寸，桌面 DPR 1→2 和扩大视口遵守像素预算，未发现页面或 shader 错误。结果为 `artifacts/render-clarity-before.json`、`artifacts/render-clarity-after.json`；截图为 `artifacts/screenshots/clarity-*.png`。
- 此浏览器验证使用软件 WebGL 和测试专用帧调度限速，仍通过原有固定步长物理与实际键盘输入驾驶；不把它作为实体设备帧率、电量或硬件性能测量。未验证实体手机/平板性能。
- 已上传 Cloudflare Pages，部署地址 `https://a0108f91.mest-circuit.pages.dev`。`node scripts/browser-render-clarity.mjs production https://mest-circuit.pages.dev/`：线上生产版 3/3 通过，三种视口均使用新的中画质缓冲尺寸，暂停/继续可用，无开发遥测或页面异常；结果为 `artifacts/render-clarity-production.json`，截图含原生设备像素的车辆局部截图 `clarity-production-*-car.png`。本地与线上 HTTP 均返回 200，并确认加载当前 `index-BSBD0MZB.js`。

## 2026-10-09 HUD、高刷新率渲染与本地图标

- 三端统一 HUD：小地图置于右上计时栏下方，间隔 12–16px，触控宽 88–116px，桌面宽 150px。时速位于底部正中；手机常规横屏的氮气表置于时速右侧，紧凑横屏置于其下方，平板和桌面置于其下方。保持油门与氮气的触控间距。
- `node scripts/browser-hud.mjs`：5/5 通过，覆盖 844×390/DPR3、667×375/DPR2、568×320/DPR2、1024×768/DPR2 和 1440×900/DPR1。验证时速和仪表居中、地图对齐计时栏、各面板间距、触控区避让和无页面异常；结果为 `artifacts/hud-local.json`，截图为 `hud-local-*.png`。
- 保留 `requestAnimationFrame` 每次浏览器回调均渲染，不设固定 60 帧门槛。120 Hz 固定物理与位置、朝向插值分离，复位/暂停/恢复重置插值状态；几何合并减少车身零件提交，静态网格与道路实例按 96 单位空间分块，保留视锥剔除；持续帧负担逐级调整远景距离、天气/烟雾数量、阴影更新频率，保留设置的像素比。音频参数更新独立限频 40 Hz，不限制渲染。
- `npm test`：37/37 通过；随后扩展帧率一致性测试至 30/60/120/144/165/240/360，单独执行 `node --test tests/frame-flow.test.js tests/rules.test.js`：16/16 通过。验证插值不修改物理、跨 ±π 朝向连续、跳变复位、持续负担降级与延迟恢复，以及高刷新率下物理/计时一致。
- 矢量图标为深蓝底橙色俯视赛车，所有文件位于 `public`，页面引用本地 SVG、ICO 和 Apple Touch PNG。`node scripts/build-icons.mjs` 生成 PNG 与含 16/32/48/64/128/256 尺寸的 ICO；已验证 ICO 目录、偏移与嵌入 PNG 签名。本地 SVG、ICO、Apple Touch、192/512 PNG 均返回 HTTP 200。
- 浏览器检查使用软件 WebGL；刷新节奏测试为模拟输入的逻辑测试，不能据此声称实体 144/240/360 Hz 显示器已跑满或确定提升帧率百分比。
- `node scripts/headlights-gameplay.mjs`：7/7 通过。五车锦标赛使用真实键盘加速和转向，随后切换中/高/低/中画质、检查平板和手机横屏、继续驾驶、复位及保护闪烁，未发现页面或 shader 错误。结果为 `artifacts/headlights-gameplay.json`。
- Cloudflare 部署为 `https://c17e2864.mest-circuit.pages.dev`；正式站点确认加载当前 `index-B9Jr9lqT.js`，SVG、ICO、Apple Touch、192/512 PNG 图标均返回 200，且在线内容与本地文件逐字节一致。
- 五车静止场景的软件 WebGL 前后采样：桌面 1280×720/DPR1 绘制调用 561→336，手机 844×390/DPR3 为 568→341，分别减少约 40.1%/40.0%；对应中画质绘制尺寸保持 1600×900 和 1477×682。非零帧回调耗时中位数分别为 9.9→3.3ms 与 9.5→6.0ms。绘制调用计数为 Three.js 主场景计数，不含单独的阴影 pass；软件 WebGL 数据不能当作实体设备 FPS 结论。原始数据为 `artifacts/frame-profile-before.json`、`artifacts/frame-profile-final.json`，汇总为 `artifacts/frame-comparison.json`。
- `node scripts/browser-hud.mjs https://mest-circuit.pages.dev/ phone,tablet,desktop`：线上手机、平板、电脑 3/3 通过，验证地图位置、时速居中、控件间距、暂停恢复与无页面/控制台错误。结果为 `artifacts/hud-online.json`，截图为 `hud-online-*.png`。

## 本地服务验证

生产服务已在 `http://localhost:5178/` 启动并通过生产浏览器检查；启动器使用当前网卡地址，并复用属于本项目的服务。此次更新已重新执行生产构建，场景与图标资源均由本地代码生成。

## 2026-10-09 复位位置、轮盘精简与按钮透明度

- 复位按钮移至左侧名次栏下方，保留 16–20px 间距及 44×44px 点击范围；右侧计时栏只保留暂停按钮。移除轮盘可见文字标题，图形重新垂直居中，保留无障碍转向描述。
- 设置新增 0%–80% 按钮透明度，默认 0% 保留原有外观；仅调节触屏轮盘、左右键及踏板底色与边框，文本、图标、轮盘指示线不降低不透明度。超过 40% 时油门及按压文字切换浅色以提高可读性。实时生效、百分比读数同步并自动保存。旧存档补充默认值，异常值归一或限幅，保留车库、现金和赛事进度。
- `npm test`：38/38 通过，包含新增的透明度迁移、边界、异常类型及刷新恢复检查；生产构建通过。`node scripts/browser-control-transparency.mjs`：4/4 通过，覆盖 844×390、568×320、1024×768 和 1440×900。验证复位位置/间距、移除标题、文字/图标不透明度为 1、背景与边框独立调节、滑块上下限、刷新保存和左右键切换；手机使用真实浏览器多点事件同时按下油门与氮气，确认复位仍增加 5 秒。无页面或控制台错误。
- 结果：`artifacts/control-transparency-local.json`；截图：`artifacts/screenshots/controls-local-*.png`。这些是浏览器视口与触摸模拟，未声称实体设备测试。布局检测无新增发现。
- 已更新 Cloudflare Pages：`https://01b774f6.mest-circuit.pages.dev`，主站 `https://mest-circuit.pages.dev/` 返回 200 并引用当前 `index-Bv2Bk-zV.js`、`index-go0Zh9Eb.css`。`node scripts/browser-control-transparency.mjs https://mest-circuit.pages.dev/ phone`：线上手机横屏 1/1 通过，覆盖布局、透明度即时变化、上下限、刷新恢复及转向模式切换；报告 `artifacts/control-transparency-online.json`，无页面或控制台错误。线上 ICO 字节与本地文件一致。本地生产预览 `http://localhost:5178/` 已提供相同版本。

## 2026-10-09 触屏复位按钮位置微调

- 手机和平板触控布局的复位按钮继续下移至转向轮盘正上方，保留约 24px 纵向间距；电脑端仍在左侧名次栏下方。
- `node scripts/browser-control-transparency.mjs http://localhost:5188/ phone,compact-phone,tablet,desktop`：4/4 通过；验证复位按钮与轮盘对齐、间距、无溢出及透明度功能无回归。`npm test`：38/38 通过，生产构建通过。
- 已部署到 `https://4328b33c.mest-circuit.pages.dev`，主站 `https://mest-circuit.pages.dev/`；线上手机横屏 `node scripts/browser-control-transparency.mjs https://mest-circuit.pages.dev/ phone`：1/1 通过，无页面或控制台错误。
