# 🎨 红尘百宝箱 - Developer Toolbox

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-Web-orange.svg)

**一个功能强大、界面精美的在线开发者工具集合**

[✨ 特性](#-特性) • [🚀 快速开始](#-快速开始) • [🛠️ 功能列表](#️-功能列表) • [🎨 主题](#-主题) • [📝 更新日志](#-更新日志)

[![GitHub](https://img.shields.io/badge/GitHub-HongChenGG-blue?logo=github)](https://github.com/HongChenGG/DeveloperToolBox)

</div>

---

## 📖 简介

红尘百宝箱是一个集成了多种实用开发工具的Web应用，采用纯前端技术构建，无需后端支持，所有功能均在浏览器本地运行，保证数据安全。

### ✨ 特性

- 🎯 **功能丰富** - 集成10+种常用开发工具
- 🎨 **多主题支持** - 6种精美主题随心切换
- 💾 **本地存储** - 数据保存在本地，安全可靠
- 📱 **响应式设计** - 完美适配各种屏幕尺寸
- 🌟 **星空特效** - 炫酷的背景动画效果
- 🎵 **音乐播放** - 内置音乐播放器，边工作边听歌
- 🌤️ **天气查询** - 实时天气信息，贴心提醒
- 🚀 **零依赖** - 纯原生JavaScript，无需框架

---

## 🛠️ 功能列表

### 📝 数据处理工具

#### 1. JSON 格式化工具
- ✅ JSON 格式化与压缩
- ✅ 语法高亮显示
- ✅ 字段识别与批量填充
- ✅ 一键复制结果
- ✅ 实时字符统计

#### 2. SQL 拼接工具
- ✅ 快速生成 SQL 语句
- ✅ 支持 IN 查询拼接
- ✅ 自动处理引号和逗号
- ✅ 多种分隔符支持

#### 3. SQL 字段清洗
- ✅ 批量清理字段名
- ✅ 去除特殊字符
- ✅ 格式统一处理

### 🔧 编码转换工具

#### 4. 编码/加密转换
- ✅ Base64 编解码
- ✅ URL 编解码
- ✅ MD5 加密
- ✅ Unicode 转换
- ✅ HTML 实体转换

#### 5. 时间戳转换
- ✅ 时间戳与日期互转
- ✅ 北京时间详细信息
- ✅ 多种时间格式支持
- ✅ 实时时间显示

### 📷 图像工具

#### 6. 二维码/条形码生成器
- ✅ 二维码生成与解析
- ✅ 条形码生成
- ✅ 自定义颜色和尺寸
- ✅ 图片下载功能
- ✅ 上传图片解析

### 🌐 网络工具

#### 7. 请求头工具
- ✅ 常用请求头模板
- ✅ 自定义请求头
- ✅ 一键复制
- ✅ 实时预览

### 📋 办公工具

#### 8. 会议纪要
- ✅ 会议主题管理
- ✅ 记录分类（议题/决议/待办等）
- ✅ 本地存储
- ✅ 导出为文本文件
- ✅ 搜索功能

### 🌤️ 生活工具

#### 9. 天气查询
- ✅ 50+中国城市支持
- ✅ 自动定位
- ✅ 24小时预报
- ✅ 7天天气预报
- ✅ 降雨提醒
- ✅ 温度、湿度、风速等详细信息

#### 10. 音乐播放器
- ✅ 随机播放热门歌曲
- ✅ 黑胶唱片旋转效果
- ✅ 专辑封面显示
- ✅ 播放控制（上一首/下一首/暂停）
- ✅ 进度条拖拽
- ✅ 悬浮窗设计

---

## 🎨 主题

支持6种精美主题，满足不同审美需求：

| 主题 | 描述 | 主色调 |
|------|------|--------|
| 🌊 清新青蓝 | 清爽明亮，适合长时间使用 | #00B4D8 |
| 🌸 甜美粉色 | 温柔甜美，充满活力 | #FF6B9D |
| 💜 神秘紫色 | 高贵神秘，独特个性 | #A78BFA |
| 🍊 阳光橙色 | 热情活力，积极向上 | #FB923C |
| 🌿 清新绿色 | 自然清新，舒缓眼睛 | #10B981 |
| 🌙 深色模式 | 低调沉稳，保护视力 | #60A5FA |

---

## 🚀 快速开始

### 在线使用

直接打开 `index.html` 文件即可使用，无需安装任何依赖。

### 本地部署

```bash
# 克隆项目
git clone https://github.com/HongChenGG/DeveloperToolBox.git

# 进入项目目录
cd DeveloperToolBox

# 使用任意Web服务器运行
# 方式1: 使用Python
python -m http.server 8080

# 方式2: 使用Node.js
npx http-server -p 8080

# 方式3: 直接双击 index.html
```

### 浏览器要求

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## 📁 项目结构

```
toolbox/
├── index.html              # 主页面
├── favicon.ico            # 网站图标
├── README.md              # 项目说明
├── css/
│   ├── style.css         # 主样式文件
│   └── stars.css         # 星空特效样式
├── js/
│   ├── app.js            # 主应用逻辑
│   ├── notes.js          # 会议纪要功能
│   ├── theme.js          # 主题切换功能
│   ├── weather.js        # 天气查询功能
│   └── music.js          # 音乐播放器功能
└── lib/
    ├── qrcode.min.js     # 二维码生成库
    ├── JsBarcode.all.min.js  # 条形码生成库
    └── jsQR.js           # 二维码解析库
```

---

## 🎯 使用技巧

### JSON 格式化
1. 粘贴JSON内容到左侧输入框
2. 点击"格式化"按钮
3. 右侧显示格式化后的结果
4. 使用"识别字段"功能可批量填充数据

### 会议纪要
1. 点击"新建会议"
2. 输入会议主题和第一条记录
3. 选择记录类型（议题/决议/待办等）
4. 后续添加记录会自动使用相同类型
5. 支持导出为文本文件

### 天气查询
1. 从下拉框选择城市
2. 或点击"自动定位"获取当前位置
3. 查看当前天气和未来预报
4. 降雨提醒会显示在天气状况中

### 音乐播放器
1. 点击右下角🎵按钮打开播放器
2. 自动加载热门歌曲
3. 点击播放按钮开始播放
4. 专辑封面会随黑胶唱片旋转

---

## 🔒 隐私与安全

- ✅ **纯前端应用** - 所有数据处理在浏览器本地完成
- ✅ **无数据上传** - 不会向服务器发送任何敏感数据
- ✅ **本地存储** - 使用 localStorage 保存用户数据
- ✅ **开源透明** - 代码完全开源，可自行审查

---

## 🛣️ 路线图

### 已完成 ✅
- [x] 基础工具集成
- [x] 多主题支持
- [x] 会议纪要功能
- [x] 天气查询功能
- [x] 音乐播放器
- [x] 响应式设计

### 计划中 📋
- [ ] 更多编码转换工具
- [ ] 图片处理工具
- [ ] 文件格式转换
- [ ] 正则表达式测试
- [ ] Markdown 编辑器
- [ ] 颜色选择器
- [ ] 代码美化工具

---

## 📝 更新日志

### v1.0.0 (2024-12-02)
- 🎉 首次发布
- ✨ 集成10+种开发工具
- 🎨 支持6种主题
- 🎵 添加音乐播放器
- 🌤️ 添加天气查询功能
- 📋 添加会议纪要功能
- 🌟 添加星空背景特效

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 贡献指南
1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

---

## 💖 致谢

感谢以下开源项目：
- [QRCode.js](https://github.com/davidshimjs/qrcodejs) - 二维码生成
- [JsBarcode](https://github.com/lindell/JsBarcode) - 条形码生成
- [jsQR](https://github.com/cozmo/jsQR) - 二维码解析
- [wttr.in](https://wttr.in) - 天气API
- [网易云音乐API](https://api.injahow.cn/meting/) - 音乐API

---

## 📧 联系方式

如有问题或建议，欢迎联系：

- � Issues: [https://github.com/HongChenGG/DeveloperToolBox/issues](https://github.com/HongChenGG/DeveloperToolBox/issues)
- ⭐ Star: [https://github.com/HongChenGG/DeveloperToolBox](https://github.com/HongChenGG/DeveloperToolBox)

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给一个Star！⭐**

Made with ❤️ by [HongChen](https://github.com/HongChenGG)

</div>
