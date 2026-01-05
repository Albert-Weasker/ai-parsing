# 智能文档解析系统

基于 Next.js + Qwen-VL 的智能文档结构化提取系统

## 功能特性

- 📋 **DSL模板配置**：可视化配置文档解析模板，支持分组、字段定义
- 🔄 **模板导入导出**：支持模板的JSON格式导入导出
- 📄 **文档解析**：基于Qwen-VL的智能文档信息提取
- 👁️ **可视化预览**：文档预览 + 位置高亮，支持多候选值选择
- ⚡ **一键填充**：选择提取结果后一键填充到表单

## 技术栈

- **前端框架**: Next.js 14 (App Router)
- **UI**: Tailwind CSS + 自定义组件
- **AI模型**: Qwen-VL (通义千问视觉模型)
- **状态管理**: React Hooks + Zustand
- **类型安全**: TypeScript

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 配置环境变量

复制 `.env.example` 为 `.env` 并填写：

```env
# Qwen-VL API
QWEN_API_KEY=your_qwen_api_key
QWEN_API_BASE=https://dashscope.aliyuncs.com/compatible-mode/v1
```

### 运行开发服务器

```bash
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000)

### 构建生产版本

```bash
pnpm build
pnpm start
```

## 项目结构

```
ai_parsing/
├── app/                    # Next.js App Router
│   ├── api/               # API路由
│   │   ├── templates/     # 模板管理API
│   │   └── extract/       # 文档提取API
│   ├── layout.tsx         # 根布局
│   └── page.tsx           # 首页
├── components/            # React组件
│   ├── ui/               # 基础UI组件
│   ├── TemplateBuilder.tsx    # 模板配置器
│   ├── ExtractionResults.tsx  # 提取结果展示
│   └── DocumentPreview.tsx    # 文档预览
├── lib/                  # 工具库
│   ├── qwen-vl.ts       # Qwen-VL API集成
│   ├── template-engine.ts    # 模板引擎
│   └── utils.ts         # 工具函数
└── types/               # TypeScript类型定义
    └── template.ts      # 模板类型
```

## 使用说明

### 1. 配置模板

1. 进入"模板配置"标签页
2. 填写模板名称和描述
3. 添加分组（如：商务要求、技术要求等）
4. 为每个分组添加字段：
   - 字段名称
   - 字段类型（文本、数字、日期等）
   - 提取方式（AI理解、OCR、正则表达式等）
   - 是否允许多值
5. 点击"保存"保存模板
6. 点击"导出"导出模板JSON文件

### 2. 解析文档

1. 点击"上传文档"选择图片或PDF文件
2. 切换到"文档解析"标签页
3. 选择已配置的模板
4. 点击"开始解析"
5. 查看提取结果：
   - 左侧显示所有字段的候选值
   - 右侧显示文档预览
   - 点击候选值可跳转到文档对应位置
   - 勾选需要的值
6. 点击"一键填充"将选中的值填充到表单

### 3. 多值处理

当字段配置为"多值"时：
- 系统会提取所有匹配的值
- 用户可以选择多个候选值
- 填充时会以数组形式保存

## API说明

### 模板管理

- `GET /api/templates` - 获取模板列表
- `POST /api/templates` - 创建模板
- `GET /api/templates/[id]` - 获取模板详情
- `PUT /api/templates/[id]` - 更新模板
- `DELETE /api/templates/[id]` - 删除模板
- `POST /api/templates/import` - 导入模板

### 文档提取

- `POST /api/extract` - 执行文档提取
  ```json
  {
    "template": {...},
    "documentImage": "base64_string"
  }
  ```

## 开发

### 代码规范

- 使用 TypeScript 严格模式
- 组件使用函数式组件 + Hooks
- 样式使用 Tailwind CSS

### 添加新功能

1. 在 `components/` 下创建新组件
2. 在 `app/api/` 下添加API路由
3. 在 `types/` 下定义类型
4. 更新相关文档

## 许可证

MIT
