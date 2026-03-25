# SnapCSS — Chrome Web Store 截图准备指南

## 截图要求

Chrome Web Store 要求：
- **尺寸**: 1280 × 800 或 640 × 400 像素
- **数量**: 最少 1 张，最多 5 张
- **格式**: PNG 或 JPEG
- **内容**: 展示扩展的核心功能和真实使用场景

---

## 推荐截图列表（共 5 张）

### 截图 1: 核心功能展示 — 悬停检查 CSS
**内容**: 鼠标悬停在一个按钮/卡片上，显示紫色高亮边框 + 信息标签 + 浮动 CSS 面板

**推荐网站**:
- https://tailwindcss.com — 首页 hero 区域的按钮或卡片
- https://ant.design/components/button-cn — 点击任意按钮组件

**操作步骤**:
1. 打开网站，激活 SnapCSS
2. 点击一个视觉效果好的元素（如带颜色的按钮）
3. 确保截图中能看到：高亮边框 + 信息标签 + CSS 面板
4. 截图窗口 1280×800

---

### 截图 2: 多面板对比
**内容**: 两个锁定面板并排对比不同元素的 CSS

**推荐网站**:
- https://tailwindcss.com — 选两个不同颜色的按钮
- https://github.com — 对比两个不同类型的 UI 元素

**操作步骤**:
1. 点击元素 A → 面板出现
2. 按 Space 锁定面板 A
3. 点击元素 B → 第二个面板出现
4. 调整面板位置，让两个面板清晰可见
5. 截图

---

### 截图 3: 伪类样式 (:hover)
**内容**: 展示面板中 :hover 伪类样式区域

**推荐网站**:
- https://tailwindcss.com — 有丰富 hover 效果的按钮
- https://mui.com/material-ui/react-button/ — Material UI 按钮

**操作步骤**:
1. 点击一个有 hover 效果的按钮
2. 面板中会显示 `:hover` 区域（黄色标签），截取此画面

---

### 截图 4: Popup 界面
**内容**: 展示 popup 的完整界面（开关、快捷设置、语言切换）

**推荐网站**: 任意网站（popup 不依赖页面）

**操作步骤**:
1. 点击扩展图标，打开 popup
2. 使用系统自带的截图工具截取 popup 区域
3. 建议激活状态和未激活各截一张，拼接对比

---

### 截图 5: 暗色主题
**内容**: 在深色主题下展示 CSS 面板

**推荐网站**:
- https://github.com — 切换 GitHub 为 Dark 模式
- https://vscode.dev — 默认暗色背景

**操作步骤**:
1. 在 popup 中将主题切换为"深色"
2. 打开深色背景的网站
3. 点击元素，展示暗色面板

---

## 宣传图（Promotional Tile）

Chrome Web Store 还可以上传：
- **小宣传图**: 440 × 280 像素
- **大宣传图**: 1400 × 560 像素（可选，推荐）
- **Marquee**: 1400 × 560（首页推荐位）

建议设计内容：
- SnapCSS logo + 标语 "Hover. See. Copy."
- 使用紫色 (#6366f1) 为品牌主色
- 背景展示模糊的代码/CSS 元素

---

## 快捷截图工具

- **Windows**: Win + Shift + S（截图工具）
- **Mac**: Cmd + Shift + 4（选区截图）
- **Chrome 自带**: F12 → Ctrl+Shift+P → "Capture screenshot"
- **扩展**: GoFullPage, Awesome Screenshot

## 注意事项

1. 截图中不要包含个人信息（如书签栏、已登录的账号）
2. 使用隐身模式截图可以避免其他扩展的干扰
3. 确保截图清晰，文字可读
4. 面板内容最好有实际有意义的 CSS（不要空面板）
5. 建议用 1280×800 窗口大小，这样截全屏就是正确尺寸
