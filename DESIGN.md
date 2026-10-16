---
name: 夜行赛道
description: 从雨城驶向旷野的九站竞速与可控漂移
colors:
  ink: "#101b25"
  surface: "#13212d"
  panel: "#192631"
  rain-blue: "#172735"
  paper: "#ecece5"
  muted: "#a9b9c3"
  signal-orange: "#ed7548"
  headlamp: "#dcecf5"
  amber: "#e3ad70"
  forest-sky: "#172c35"
  forest-horizon: "#516f73"
  forest-ground: "#35493e"
  forest-shoulder: "#565d4c"
  forest-road: "#7a8585"
  canyon-sky: "#56434b"
  canyon-horizon: "#bb8461"
  canyon-ground: "#a6734c"
  canyon-shoulder: "#ba8657"
  canyon-road: "#978f81"
  alpine-sky: "#283f59"
  alpine-horizon: "#829fb4"
  alpine-ground: "#bdcdd3"
  alpine-shoulder: "#dae7e8"
  alpine-road: "#6b7c8a"
typography:
  display:
    fontFamily: "Noto Sans SC, sans-serif"
    fontSize: "clamp(4.1rem, 7.3vw, 7rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0.025em"
  body:
    fontFamily: "Noto Sans SC, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.9
  measurement:
    fontFamily: "Barlow Condensed, sans-serif"
    fontWeight: 600
    fontStyle: italic
rounded:
  sm: "3px"
  md: "6px"
  dialog: "8px"
spacing:
  sm: "8px"
  md: "18px"
  lg: "35px"
  page: "4vw"
components:
  button-primary:
    backgroundColor: "{colors.signal-orange}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "14px 24px"
    height: "52px"
  button-secondary:
    backgroundColor: "#d1dbe419"
    textColor: "{colors.paper}"
    rounded: "{rounded.sm}"
    padding: "14px 24px"
    height: "52px"
  dialog:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.paper}"
    rounded: "{rounded.dialog}"
    padding: "35px 34px"
---

# Design System: 夜行赛道

## Overview

**Creative North Star: “雨幕中的车灯仪表盘”**

《夜行赛道》的界面来自雨夜街区里驾驶员能快速读懂的东西：车灯落在湿路面的高光、仪表盘上的大号速度数字、远处建筑窗格里稀疏的暖光。整体使用深蓝黑作为环境，把暖橙动作色留给发车、购买、复位反馈和车辆漆面，让驾驶时的视觉优先级始终清楚。

菜单是静态车库镜头与赛事线路的安静入口；比赛 HUD 退到道路边缘，给小地图、名次、圈数、时间、氮气和速度留出固定位置。车辆和场景均为程序化几何，材质强调湿地反射、车灯投射和金属漆面，风格化地表现雨夜街头，不宣称照片级真实。

九站线路由原有六条城市与沿海路线延伸到山地森林、荒漠峡谷和雪山冰湖，三条新增路线同时用于新九站锦标赛、自由练习和计时。自然场景继承既有车辆、菜单、字体、HUD 与控制语言，用暗绿湿林、暖橙干燥砂岩和冷蓝雪地建立三种明确环境；地形、针叶树、岩层、冰面与纹理均由本地代码生成。山地起伏用于构成道路周围的景观，驾驶道路仍为平面闭合公路，路面系数对玩家与 AI 一致生效。

**Key Characteristics:**

- 深蓝环境与乳白信息形成高对比阅读底色。
- 信号橙只用于推进动作、车辆焦点和重要反馈。
- Barlow Condensed 承担速度、计时和名次等测量数字。
- 车辆、道路、建筑、自然地形、纹理和声音都在本地生成，界面不依赖外链素材。
- 三种自然环境通过天气、地形轮廓和表面材质区分，保持道路与弯道边界可读。

## Colors

界面保持低照度、偏冷的城市底色，搭配一枚有温度的信号橙和少量头灯白、路灯琥珀。自然赛道使用各自的场景配色，菜单和 HUD 的动作色与阅读底色保持一致。

### Primary

- **雨幕信号橙** (`#ed7548`): 主按钮、当前路线、车辆高光和重要反馈；在一屏上保持稀缺，让驾驶动作一眼可见。

### Secondary

- **头灯冰白** (`#dcecf5`): 冷色道路高亮与测量信息；近光灯使用略暖的白光。
- **路灯琥珀** (`#e3ad70`): 建筑窗光、奖励数字和夜景温度。

### Neutral

- **车库墨蓝** (`#101b25`): 页面与驾驶背景。
- **深层面板** (`#13212d`): 赛程、改装和结果等工作区域。
- **雨夜面板** (`#192631`): 对话框、HUD 背板和触控按钮。
- **路雾灰蓝** (`#a9b9c3`): 次要说明、路线区域和非当前状态。
- **仪表乳白** (`#ecece5`): 标题、主数值和赛事名称。

### Natural environments

这些场景色来自 `src/environments.js` 的环境配色；天空、雾光、地表、路肩和柏油共同构成每条自然路线的识别，实际画面还受本地纹理、光照和雾影响。

| 环境 | 天空与雾光 | 地表与连续路肩 | 柏油与天气 |
| --- | --- | --- | --- |
| 山地森林 | 林雾青蓝与灰青雾光（`forest-sky`、`forest-horizon`） | 暗绿土坡与灰绿碎石路肩（`forest-ground`、`forest-shoulder`） | 湿石灰柏油（`forest-road`），雨与湿路反射 |
| 荒漠峡谷 | 紫褐暮空与暖砂橙地平线（`canyon-sky`、`canyon-horizon`） | 橙褐砂岩地表与暖砂路肩（`canyon-ground`、`canyon-shoulder`） | 干燥灰砂柏油（`canyon-road`），晴朗暮色与粗糙表面 |
| 雪山冰湖 | 冷蓝暮空与冰蓝雾光（`alpine-sky`、`alpine-horizon`） | 灰白雪地与浅冰白路肩（`alpine-ground`、`alpine-shoulder`） | 冷灰蓝柏油（`alpine-road`），降雪与浅色冰面 |

**The Signal Rule.** 橙色只承载“现在该做什么”或“这里发生了什么”，不作为普通装饰底色。

## Typography

**Display Font:** Noto Sans SC (sans-serif fallback)

**Measurement Font:** Barlow Condensed (sans-serif fallback)

**Character:** 中文标题结实、略带倾斜的路牌感；数字窄而有速度感，适合在驾驶中快速扫读。正文保持朴素，避免技术标签抢过赛道。

### Hierarchy

- **Display** (700, `clamp(4.1rem, 7.3vw, 7rem)`, 1.1): 首页“夜行赛道”和结算标题。
- **Headline** (700, 29–37px): 页面标题、赛道名称和结果状态。
- **Title** (700, 18–27px): 车辆、改装项、赛程和结果区块。
- **Body** (400, 12–15px, 1.9): 说明、教学和次级上下文。
- **Measurement** (600 italic, 32–103px): 速度、时间、圈数、名次和积分，使用 tabular numerals。

## Layout

菜单采用左侧赛事叙事、右侧车辆焦点、底部九站线路的三段分布；比赛采用左上名次、上方中央圈数、右上计时与暂停；小地图紧接计时栏下方，时速位于屏幕底部正中，氮气表在其旁边或下方。车库和赛程页面使用工作区而非满屏卡片堆叠。赛程按该赛季的固定路线呈现站数，已有六站赛季继续显示其原有线路。

桌面页边距约 `4vw`，工作页最大宽度约 1160px。760px 以下切换为单列，车款横向选择，赛道选项横向滚动；选中赛道在列表更新后保持可见，与下方路线详情对应，键盘选择保留焦点。手机和平板竖屏只显示横屏提示层并锁住驾驶输入；转到横屏后恢复驾驶 HUD，并优先扩大前方视野。触屏玩家可在设置中选择轮盘或独立左右箭头，方向与键盘输入一致。横屏提示、主菜单和暂停页提供可关闭的全屏入口，并清楚反馈浏览器拒绝全屏请求的状态。所有触控主按钮至少 44px 高，且支持安全区。

**The Road First Rule.** 驾驶场景中道路、弯道边界和下一检查点必须比说明文字更早被看见；信息只停留在边缘。

触控驾驶小地图控制在 88–116px，名次与地图至少留出 24px 空隙。氮气放到油门左上方，与油门横向和纵向各留出 24px；高度不超过 350px 的横屏使用 20px。油门主触控区域为 96×64px，小高度横屏使用 88×56px；速度与氮气仪表上移，避免与扩展后的操作区重叠。轮盘与左右箭头仍位于左下。

## Elevation & Depth

场景深度来自雾、建筑后退、路面反射、灯光投射和车身阴影；自然赛道进一步使用实际起伏的地表、远山轮廓、树群遮挡和低于岸线的冰湖。森林保留湿路高光与有层次的针叶树群；峡谷以干燥粗糙砂岩、水平岩层和阶状岩台塑形；雪山冰湖以雪冠、浅色不透明冰面、霜斑和不规则裂纹说明寒冷材质。周边地形的高度变化不代表车辆具有爬坡、跳跃或冰湖驾驶能力。

近光灯使用左右两组真实投射光源，配光纹理在本地生成，带有柔和横向边缘、上方明暗截止和略高的右侧路肩照明。灯光跟随车身朝向与姿态，照亮道路、护栏、建筑和车辆；中高画质由玩家的两组车灯生成遮挡阴影，低画质保留配光并关闭阴影。湿路面使用低金属度沥青底层与湿润反光层，避免近处刺眼、远处几乎不受光的金属化表现。雨雪仅在已有降水粒子里呈现淡淡受光，不绘制车前三角形光片或实体光锥。

界面深度来自深色色阶与极少量柔和阴影。透明背板只用于 HUD 读数、触控控制和对话框的焦点隔离，不作为玻璃装饰。

## Shapes

页面工作面使用 6–8px 圆角，普通按钮使用 3px，触控按钮使用 8px，圆形只留给暂停、复位和焦点印章。道路边缘、车辆和标线使用硬朗几何；不会用大面积胶囊卡片模拟赛车感。

自然路线的路肩沿整条道路连续连接，与地表衔接，并保留清楚的柏油边线与护栏。针叶树采用带枝层变化的轮廓，以不同高度、宽度和间距形成树群；峡谷近景使用可见的水平岩层、阶状岩台与不同岩体轮廓；冰湖保持凹入岸线的形状，以霜层和宽窄变化的裂纹表现冻结表面。

## Components

- **Primary Button:** 信号橙底、墨蓝字、52px 高；用于驶入比赛、购买、开始本站和继续。
- **Secondary Button:** 半透明冷灰底、细内描边；用于车库、重试和次级入口。
- **Icon Button:** 44px 圆形深面板；用于暂停、复位、设置和返回，带可读 aria-label。
- **HUD Panel:** 低透明度深蓝背板，数字与道路分离但不遮挡中央路线。
- **Track Row:** 左侧编号、路线名、区域小字；当前行通过橙色编号与深面板确认，并标记当前选择。手机横向导航保持选中项可见；路线详情同时显示天气与路面条件。
- **Upgrade Row:** 改装名称、三级竖条、真实效果说明、当前价格按钮；不显示与物理无关的空指标。
- **Dialog:** 对话框打开时背景 inert，焦点进入对话框并在 Tab 方向循环，关闭后回到触发按钮。

## Do's and Don'ts

比赛中的小车细节依靠真实绘制分辨率与多重采样抗锯齿保持清晰。中画质最高 1.75 倍像素比，高画质触控设备 2 倍、桌面 2.25 倍；DPR 1 桌面也做适量超采样。中/高画质额外像素分别受 300 万/600 万总量限制，超过预算的原生大屏保持至少 1 倍。横竖屏、全屏和设备像素密度变化会重新计算。画质增强保留原有比赛镜头、车辆尺寸与驾驶规则。

- Do use orange for an action or state with a real gameplay consequence.
- Do keep measurement numbers large and use the condensed face for scan speed.
- Do show wet-road highlights and headlight direction while preserving road readability.
- Do distinguish forest, canyon, and alpine routes through their terrain, weather, and material palettes while retaining the established HUD and controls.
- Do keep natural road shoulders continuous, firs varied and clustered, sandstone strata readable, and the frozen lake visibly covered with frost and fractures.
- Do keep the selected track visible in scrolling navigation and pair it with matching route details.
- Do write concrete recovery copy for reset, invalid saves, and interrupted races.
- Don't use external images, CDN fonts, remote audio, or brand vehicles.
- Don't put decorative neon grids, glowing outlines, or oversized score overlays across a turn.
- Don't call a procedural stylized scene photorealistic.
- Don't imply that surrounding mountain terrain creates elevation-based driving or that the ice lake is a drivable surface.
- Don't turn drift points into ranking or allow a reset to advance a checkpoint.

## 游戏图标与刷新节奏

深蓝底色与橙色俯视赛车剪影延续游戏配色。SVG 为本地矢量源，导出多尺寸 ICO 与 PNG；浏览器标签页和 Apple 书签均使用本站资源。驾驶 HUD 在手机、平板和电脑统一布局，地图与计时栏保持 12–16px 空隙，底部仪表避让方向盘和踏板。

渲染跟随浏览器刷新节奏，不设固定 60 帧上限；固定 120 Hz 物理配合位置与朝向插值。保留车身几何与画质像素比，合并同材质车身零件，场景按空间分块剔除；持续帧压力只逐步降低远景、天气粒子和阴影更新频率，恢复时延迟提升。实际帧率以设备与浏览器为准。

## 触屏控件透明度与复位位置

复位按钮在电脑端位于左侧名次栏下方；手机和平板触控布局中移至转向轮盘正上方，保留约 24px 间距，与底部转向区形成垂直操作组；计时栏只保留暂停入口。转向轮盘不显示标题，保留无障碍描述，轮盘图形垂直居中。设置提供 0%–80% 按钮透明度，默认 0% 保留原有底色，数值越大越透明，仅影响轮盘、左右键和踏板底色及边框，不降低文字、图标或轮盘指示线的不透明度。透明度超过 40% 时，油门及按压状态使用浅色字保持可读性；文字本身始终不透明。调节即时生效并自动存储，兼容旧进度。
