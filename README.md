# TCP 报文发送工具

一个基于 Tauri + React + TypeScript 的跨平台 TCP 报文发送测试工具，类似 Postman 的现代化界面。

## ✨ 功能特性

- ✅ TCP 连接管理（支持多连接）
- ✅ 多种发送模式（Text / Hex / Protocol）
- ✅ 可视化协议字段编辑器
- ✅ 自定义报文格式
- ✅ 深色主题界面（VS Code Dark+ 风格）
- ✅ JetBrains Mono 等宽字体
- ✅ 跨平台支持（macOS / Windows / Linux）

## 📦 下载安装

### 从 GitHub Releases 下载

访问 [Releases](https://github.com/YOUR_USERNAME/tcp-sender/releases) 页面下载对应平台的安装包：

- **macOS**:
  - Apple Silicon (M1/M2/M3): `tcp-sender-temp_x.x.x_aarch64.dmg`
  - Intel: `tcp-sender-temp_x.x.x_x64.dmg`
- **Windows**:
  - MSI 安装包: `tcp-sender-temp_x.x.x_x64_en-US.msi`
  - NSIS 安装包: `tcp-sender-temp_x.x.x_x64-setup.exe`
- **Linux**:
  - Debian/Ubuntu: `tcp-sender-temp_x.x.x_amd64.deb`
  - AppImage: `tcp-sender-temp_x.x.x_amd64.AppImage`

## 🚀 使用 GitHub Actions 自动构建

本项目配置了 GitHub Actions，可以自动构建所有平台版本。

### 第一步：推送代码到 GitHub

```bash
# 添加所有文件
git add .

# 提交更改
git commit -m "Initial commit"

# 在 GitHub 创建仓库后，添加远程仓库
git remote add origin https://github.com/YOUR_USERNAME/tcp-sender.git

# 推送到 GitHub
git push -u origin main
```

### 第二步：触发构建

#### 方式 1: 创建 Git Tag（推荐 - 会自动创建 Release）

```bash
# 创建 tag
git tag v1.0.0

# 推送 tag
git push origin v1.0.0
```

推送 tag 后，GitHub Actions 会自动：
1. 构建 macOS (Intel + Apple Silicon)
2. 构建 Windows (x64)
3. 构建 Linux (x64)
4. 创建 GitHub Release
5. 上传所有安装包到 Release

#### 方式 2: 手动触发（仅构建，不创建 Release）

1. 访问 GitHub 仓库的 Actions 页面
2. 选择 "Build and Release" workflow
3. 点击 "Run workflow" 按钮
4. 选择分支并运行

### 第三步：下载构建产物

- **查看构建进度**: `https://github.com/YOUR_USERNAME/tcp-sender/actions`
- **下载 Release**: `https://github.com/YOUR_USERNAME/tcp-sender/releases`
- **下载 Artifacts**: 在 workflow 运行详情页面下载（手动触发时）

## 💻 本地开发

### 环境要求

- Node.js 20+
- Rust 1.70+
- 操作系统特定依赖：
  - **macOS**: Xcode Command Line Tools
  - **Windows**: Microsoft Visual Studio C++ Build Tools
  - **Linux**: `libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf`

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run tauri dev
```

### 本地构建

```bash
npm run tauri build
```

构建产物位置：
- macOS: `src-tauri/target/release/bundle/dmg/`
- Windows: `src-tauri/target/release/bundle/msi/` 或 `nsis/`
- Linux: `src-tauri/target/release/bundle/deb/` 或 `appimage/`

## 📖 使用指南

### 1. 连接到服务器

1. 点击左侧菜单的 **报文发送** 图标（第4个图标，📤）
2. 在顶部工具栏输入：
   - **主机地址**: `localhost`
   - **端口**: `8080`
3. 点击 **连接** 按钮
4. 看到 "已连接到 localhost:8080" 提示表示成功

### 2. 发送 Text 模式报文

1. 确保模式选择为 **Text**
2. 在请求编辑器中输入文本，例如：
   ```
   Hello, TCP Server!
   ```
3. 点击 **发送** 按钮
4. 在响应查看器中查看服务器回显的内容：
   ```
   Echo: Hello, TCP Server!
   ```
5. 查看响应时间（毫秒）

### 3. 发送 Hex 模式报文

1. 切换模式为 **Hex**
2. 在请求编辑器中输入十六进制数据，例如：
   ```
   48 65 6C 6C 6F
   ```
   （这是 "Hello" 的 ASCII 十六进制）
3. 点击 **发送** 按钮
4. 响应将以十六进制格式显示

### 4. 发送 Protocol 模式报文

1. 切换模式为 **Protocol**
2. 点击 **添加字段** 按钮
3. 配置字段：
   - **字段名**: 例如 "消息头"
   - **长度(字节)**: 例如 2
   - **值**: 输入文本或十六进制（如 "01 02" 或 "AB"）
4. 继续添加更多字段
5. 点击 **发送** 按钮
6. 最终报文 = 所有字段数据按顺序连接

**示例**：
- 字段1: 名称="Header", 长度=2, 值="01 02"
- 字段2: 名称="Data", 长度=5, 值="Hello"
- 最终报文: `01 02 48 65 6C 6C 6F` (十六进制)

### 5. 多连接管理

1. 点击标签栏的 **+** 按钮创建新标签
2. 每个标签可以独立连接到不同的服务器
3. 点击标签上的 **×** 关闭不需要的连接

## 🎨 界面特点

### 配色方案（VS Code Dark+ 风格）
- **主背景**: #1e1e1e
- **次要背景**: #252526
- **边框**: #3e3e42
- **主色调**: #ff6c37（橙色）
- **文本**: #cccccc

## 🏗️ 核心文件

### 前端
- `src/components/Layout/MainLayout.tsx` - Postman 风格主布局
- `src/components/Layout/Sidebar.tsx` - 图标侧边栏
- `src/pages/Messages.tsx` - 报文发送页面（核心功能）
- `src/services/connectionService.ts` - 连接服务
- `src/services/messageService.ts` - 消息服务

### 后端
- `src-tauri/src/tcp/client.rs` - TCP 客户端
- `src-tauri/src/tcp/connection_manager.rs` - 连接管理器
- `src-tauri/src/commands/connection.rs` - 连接管理命令
- `src-tauri/src/commands/message.rs` - 消息发送命令

## 🧪 测试

### 基本测试流程
1. 启动测试服务器：`node test-server.cjs`
2. 启动应用
3. 连接到 localhost:8080
4. 发送 "Hello" 并验证收到 "Echo: Hello"

## 🎯 下一步开发

- [ ] 历史记录持久化（SQLite）
- [ ] 连接配置保存
- [ ] 协议配置系统
- [ ] 测试套件

## 📝 开发日志

### 2026-01-14
- ✅ 完成 Postman 风格界面设计
- ✅ 实现深色主题
- ✅ 实现标签页系统
- ✅ 开发 TCP 客户端和连接管理器
- ✅ 实现 Tauri 命令接口
- ✅ 完成报文发送功能（Text / Hex / Protocol 三种模式）
- ✅ 创建测试服务器
- ✅ 实现协议字段编辑器
- ✅ 集成 JetBrains Mono 字体
- ✅ 配置 GitHub Actions 自动构建

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 技术栈详情

- **前端**: React 19 + TypeScript 5 + Ant Design 6 + Vite 7
- **后端**: Tauri 2 + Rust 1.92 + Tokio (异步运行时)
- **字体**: JetBrains Mono (本地字体文件)
- **构建**: GitHub Actions (跨平台自动构建)