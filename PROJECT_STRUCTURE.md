# 项目结构说明

## 1. 项目目录结构

```
ai_parsing/
├── README.md                    # 项目说明文档
├── DESIGN.md                    # 系统设计文档
├── TECHNICAL_DETAILS.md         # 技术实现细节
├── DATABASE_DESIGN.md           # 数据库设计文档
├── PROJECT_STRUCTURE.md         # 项目结构说明（本文件）
│
├── package.json                 # 项目依赖配置
├── tsconfig.json                # TypeScript配置
├── next.config.js               # Next.js配置
├── tailwind.config.js           # Tailwind CSS配置
├── .env.example                 # 环境变量示例
├── .gitignore                   # Git忽略文件
│
├── prisma/                      # Prisma ORM配置
│   ├── schema.prisma            # 数据库模型定义
│   └── migrations/              # 数据库迁移文件
│
├── app/                         # Next.js App Router
│   ├── layout.tsx               # 根布局
│   ├── page.tsx                 # 首页
│   ├── globals.css              # 全局样式
│   │
│   ├── (auth)/                  # 认证相关页面（路由组）
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   │
│   ├── (dashboard)/            # 主应用页面（路由组）
│   │   ├── layout.tsx          # 仪表盘布局（侧边栏、顶部导航）
│   │   ├── page.tsx            # 仪表盘首页
│   │   │
│   │   ├── templates/          # 模板管理
│   │   │   ├── page.tsx        # 模板列表
│   │   │   ├── create/
│   │   │   │   └── page.tsx    # 创建模板
│   │   │   └── [id]/
│   │   │       ├── page.tsx    # 模板详情
│   │   │       ├── edit/
│   │   │       │   └── page.tsx # 编辑模板
│   │   │       ├── preview/
│   │   │       │   └── page.tsx # 模板预览
│   │   │       └── test/
│   │   │           └── page.tsx # 模板测试
│   │   │
│   │   ├── upload/             # 文档上传
│   │   │   ├── page.tsx        # 上传页面
│   │   │   ├── single/
│   │   │   │   └── page.tsx    # 单文件上传
│   │   │   └── batch/
│   │   │       └── page.tsx    # 批量上传
│   │   │
│   │   ├── documents/          # 文档管理
│   │   │   ├── page.tsx        # 文档列表
│   │   │   └── [id]/
│   │   │       └── page.tsx    # 文档详情
│   │   │
│   │   ├── results/            # 解析结果
│   │   │   ├── page.tsx        # 结果列表
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx    # 结果详情/校对
│   │   │   └── statistics/
│   │   │       └── page.tsx    # 统计分析
│   │   │
│   │   ├── export/             # 数据导出
│   │   │   ├── page.tsx        # 导出页面
│   │   │   ├── create/
│   │   │   │   └── page.tsx    # 创建导出任务
│   │   │   ├── jobs/
│   │   │   │   └── page.tsx    # 导出任务列表
│   │   │   └── api-config/
│   │   │       └── page.tsx    # API配置
│   │   │
│   │   └── admin/              # 系统管理
│   │       ├── page.tsx        # 管理首页
│   │       ├── users/
│   │       │   └── page.tsx    # 用户管理
│   │       ├── organizations/
│   │       │   └── page.tsx    # 组织管理
│   │       ├── settings/
│   │       │   └── page.tsx    # 系统设置
│   │       └── logs/
│   │           └── page.tsx    # 日志查看
│   │
│   └── api/                    # API Routes
│       ├── auth/
│       │   └── route.ts        # 认证相关API
│       │
│       ├── templates/
│       │   ├── route.ts        # 模板列表/创建
│       │   └── [id]/
│       │       ├── route.ts    # 模板详情/更新/删除
│       │       ├── test/
│       │       │   └── route.ts # 测试模板
│       │       └── duplicate/
│       │           └── route.ts # 复制模板
│       │
│       ├── documents/
│       │   ├── route.ts        # 文档列表/上传
│       │   ├── batch/
│       │   │   └── route.ts    # 批量上传
│       │   └── [id]/
│       │       ├── route.ts    # 文档详情/删除
│       │       └── preview/
│       │           └── route.ts # 文档预览
│       │
│       ├── results/
│       │   ├── route.ts        # 结果列表
│       │   ├── statistics/
│       │   │   └── route.ts    # 统计信息
│       │   ├── [id]/
│       │   │   └── route.ts    # 结果详情/更新
│       │   └── batch-review/
│       │       └── route.ts    # 批量审核
│       │
│       ├── batch-jobs/
│       │   ├── route.ts        # 批量任务列表/创建
│       │   └── [id]/
│       │       ├── route.ts    # 任务详情
│       │       ├── cancel/
│       │       │   └── route.ts # 取消任务
│       │       └── progress/
│       │           └── route.ts # 任务进度
│       │
│       ├── exports/
│       │   ├── route.ts        # 导出任务列表/创建
│       │   └── [id]/
│       │       ├── route.ts    # 导出任务详情
│       │       └── download/
│       │           └── route.ts # 下载导出文件
│       │
│       └── webhooks/
│           └── route.ts        # Webhook处理
│
├── components/                  # React组件
│   ├── ui/                     # 基础UI组件（shadcn/ui）
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── table.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   └── ...
│   │
│   ├── templates/              # 模板相关组件
│   │   ├── TemplateList.tsx
│   │   ├── TemplateForm.tsx
│   │   ├── TemplateBuilder.tsx
│   │   ├── FieldEditor.tsx
│   │   ├── DocumentAnnotator.tsx
│   │   ├── ExtractionPreview.tsx
│   │   └── TemplateTester.tsx
│   │
│   ├── documents/              # 文档相关组件
│   │   ├── FileUploader.tsx
│   │   ├── UploadQueue.tsx
│   │   ├── DocumentList.tsx
│   │   ├── DocumentViewer.tsx
│   │   ├── TemplateSelector.tsx
│   │   └── DocumentCard.tsx
│   │
│   ├── results/                # 结果相关组件
│   │   ├── ResultTable.tsx
│   │   ├── ResultDetail.tsx
│   │   ├── ResultCard.tsx
│   │   ├── FieldEditor.tsx    # 校对用字段编辑器
│   │   ├── ConfidenceIndicator.tsx
│   │   └── ReviewPanel.tsx
│   │
│   ├── export/                 # 导出相关组件
│   │   ├── ExportForm.tsx
│   │   ├── ExportJobList.tsx
│   │   └── ApiConfigForm.tsx
│   │
│   ├── common/                 # 通用组件
│   │   ├── Layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Footer.tsx
│   │   ├── DataTable.tsx       # 数据表格（基于TanStack Table）
│   │   ├── FilterPanel.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── ErrorBoundary.tsx
│   │   └── EmptyState.tsx
│   │
│   └── providers/              # Context Providers
│       ├── AuthProvider.tsx
│       ├── ThemeProvider.tsx
│       └── QueryProvider.tsx
│
├── lib/                        # 工具函数和库
│   ├── utils.ts                # 通用工具函数
│   ├── api/                    # API客户端
│   │   ├── client.ts           # API客户端基础配置
│   │   ├── templates.ts        # 模板API
│   │   ├── documents.ts        # 文档API
│   │   ├── results.ts          # 结果API
│   │   ├── batch-jobs.ts       # 批量任务API
│   │   └── exports.ts          # 导出API
│   │
│   ├── db/                     # 数据库相关
│   │   └── prisma.ts           # Prisma Client实例
│   │
│   ├── auth/                   # 认证相关
│   │   ├── config.ts           # NextAuth配置
│   │   └── middleware.ts      # 认证中间件
│   │
│   ├── validations/            # Zod验证Schema
│   │   ├── template.ts
│   │   ├── document.ts
│   │   └── result.ts
│   │
│   ├── ocr/                    # OCR服务
│   │   ├── adapter.ts          # OCR适配器接口
│   │   ├── paddleocr.ts        # PaddleOCR实现
│   │   ├── tesseract.ts        # Tesseract实现
│   │   ├── cloud.ts            # 云服务OCR实现
│   │   └── multi-page.ts       # 多页文档处理
│   │
│   ├── ai/                     # AI理解服务
│   │   ├── adapter.ts           # AI适配器接口
│   │   ├── openai.ts           # OpenAI实现
│   │   ├── claude.ts           # Claude实现
│   │   ├── local.ts            # 本地模型实现
│   │   └── prompt-builder.ts  # 提示词构建器
│   │
│   ├── template-engine/        # 模板引擎
│   │   ├── engine.ts           # 模板执行引擎
│   │   ├── extractors/         # 提取器
│   │   │   ├── ocr-extractor.ts
│   │   │   ├── ai-extractor.ts
│   │   │   ├── regex-extractor.ts
│   │   │   └── position-extractor.ts
│   │   └── validators/         # 验证器
│   │       └── field-validator.ts
│   │
│   ├── document-processor/     # 文档处理
│   │   ├── processor.ts        # 文档处理器
│   │   ├── type-detector.ts    # 文档类型检测
│   │   └── file-handler.ts     # 文件处理工具
│   │
│   ├── export/                 # 导出功能
│   │   ├── excel.ts            # Excel导出
│   │   ├── csv.ts              # CSV导出
│   │   └── json.ts             # JSON导出
│   │
│   ├── queues/                 # 任务队列
│   │   ├── document-queue.ts   # 文档处理队列
│   │   ├── batch-queue.ts      # 批量任务队列
│   │   └── export-queue.ts     # 导出任务队列
│   │
│   ├── storage/                # 文件存储
│   │   ├── adapter.ts          # 存储适配器接口
│   │   ├── minio.ts            # MinIO实现
│   │   └── s3.ts               # AWS S3实现
│   │
│   ├── websocket/              # WebSocket
│   │   ├── server.ts           # WebSocket服务器
│   │   └── events.ts           # 事件定义
│   │
│   ├── logger.ts               # 日志工具
│   └── errors.ts               # 错误处理
│
├── hooks/                      # 自定义React Hooks
│   ├── useTemplates.ts
│   ├── useDocuments.ts
│   ├── useResults.ts
│   ├── useDocumentUpload.ts
│   ├── useBatchJobs.ts
│   ├── useExports.ts
│   ├── useWebSocket.ts
│   └── useDebounce.ts
│
├── stores/                     # Zustand状态管理
│   ├── templateStore.ts
│   ├── documentStore.ts
│   ├── resultStore.ts
│   └── uiStore.ts
│
├── types/                      # TypeScript类型定义
│   ├── template.ts
│   ├── document.ts
│   ├── result.ts
│   ├── api.ts
│   └── index.ts
│
├── public/                     # 静态资源
│   ├── images/
│   └── icons/
│
├── tests/                      # 测试文件
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── scripts/                    # 脚本文件
│   ├── setup.sh                # 环境设置脚本
│   ├── migrate.sh              # 数据库迁移脚本
│   └── seed.ts                 # 数据库种子数据
│
└── docker/                     # Docker配置
    ├── Dockerfile
    ├── docker-compose.yml
    └── docker-compose.prod.yml
```

## 2. 核心模块说明

### 2.1 模板配置模块 (`components/templates/`)

- **TemplateBuilder**: 主配置器，提供拖拽式字段配置界面
- **FieldEditor**: 字段编辑器，配置字段的提取规则、验证规则等
- **DocumentAnnotator**: 文档标注器，在样本文档上标注字段位置
- **ExtractionPreview**: 提取预览，实时预览提取效果
- **TemplateTester**: 模板测试器，使用测试文档验证模板

### 2.2 文档处理模块 (`lib/document-processor/`)

- **processor.ts**: 文档处理主流程
- **type-detector.ts**: 自动识别文档类型
- **file-handler.ts**: 文件格式转换和处理

### 2.3 OCR服务模块 (`lib/ocr/`)

- **adapter.ts**: OCR服务适配器接口，统一不同OCR服务的调用
- **paddleocr.ts**: PaddleOCR服务实现
- **tesseract.ts**: Tesseract服务实现
- **cloud.ts**: 云服务OCR实现（阿里云、腾讯云等）
- **multi-page.ts**: 多页文档（PDF）处理

### 2.4 AI理解模块 (`lib/ai/`)

- **adapter.ts**: AI服务适配器接口
- **openai.ts**: OpenAI GPT-4 Vision实现
- **claude.ts**: Claude 3.5 Sonnet实现
- **local.ts**: 本地模型实现（Qwen-VL等）
- **prompt-builder.ts**: 智能构建提取提示词

### 2.5 模板引擎 (`lib/template-engine/`)

- **engine.ts**: 模板执行引擎，根据模板配置执行提取
- **extractors/**: 各种提取器实现
  - **ocr-extractor.ts**: OCR提取器
  - **ai-extractor.ts**: AI提取器
  - **regex-extractor.ts**: 正则表达式提取器
  - **position-extractor.ts**: 位置提取器
- **validators/**: 字段验证器

### 2.6 任务队列 (`lib/queues/`)

- **document-queue.ts**: 文档处理队列，异步处理文档
- **batch-queue.ts**: 批量任务队列
- **export-queue.ts**: 导出任务队列

## 3. 技术栈依赖

### 3.1 核心依赖

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@prisma/client": "^5.0.0",
    "prisma": "^5.0.0",
    "zod": "^3.22.0",
    "react-hook-form": "^7.48.0",
    "@hookform/resolvers": "^3.3.0",
    "zustand": "^4.4.0",
    "@tanstack/react-query": "^5.0.0",
    "@tanstack/react-table": "^8.10.0",
    "bull": "^4.11.0",
    "redis": "^4.6.0",
    "exceljs": "^4.4.0",
    "csv-stringify": "^6.4.0",
    "socket.io": "^4.6.0",
    "socket.io-client": "^4.6.0",
    "openai": "^4.20.0",
    "@anthropic-ai/sdk": "^0.9.0",
    "winston": "^3.11.0",
    "next-auth": "^5.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "typescript": "^5.2.0",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "eslint": "^8.50.0",
    "@typescript-eslint/eslint-plugin": "^6.7.0",
    "@typescript-eslint/parser": "^6.7.0"
  }
}
```

### 3.2 UI组件库

使用 shadcn/ui（基于 Radix UI + Tailwind CSS）：
- 可访问性良好
- 高度可定制
- TypeScript支持完善
- 按需引入，体积小

## 4. 环境变量配置

```env
# 数据库
DATABASE_URL="postgresql://user:password@localhost:5432/ai_parsing"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# 文件存储
STORAGE_TYPE=minio
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=documents

# OCR服务
OCR_SERVICE=paddleocr
PADDLEOCR_ENDPOINT=http://localhost:8000

# AI服务
AI_SERVICE=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-vision-preview

# 或使用Claude
# AI_SERVICE=claude
# ANTHROPIC_API_KEY=sk-ant-...

# 认证
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# 应用配置
NODE_ENV=development
PORT=3000
```

## 5. 开发工作流

### 5.1 初始化项目

```bash
# 1. 安装依赖
npm install

# 2. 设置环境变量
cp .env.example .env
# 编辑 .env 文件

# 3. 初始化数据库
npx prisma migrate dev

# 4. 生成Prisma Client
npx prisma generate

# 5. 启动开发服务器
npm run dev
```

### 5.2 开发流程

1. **创建新功能分支**
   ```bash
   git checkout -b feature/template-builder
   ```

2. **开发功能**
   - 创建/修改组件
   - 编写API路由
   - 更新数据库Schema（如需要）
   - 运行迁移：`npx prisma migrate dev`

3. **测试**
   ```bash
   npm run test
   ```

4. **提交代码**
   ```bash
   git add .
   git commit -m "feat: add template builder"
   git push origin feature/template-builder
   ```

### 5.3 数据库迁移

```bash
# 创建迁移
npx prisma migrate dev --name add_new_field

# 应用迁移（生产环境）
npx prisma migrate deploy

# 重置数据库（开发环境）
npx prisma migrate reset
```

## 6. 部署说明

### 6.1 构建

```bash
npm run build
```

### 6.2 Docker部署

```bash
# 构建镜像
docker build -t ai-parsing:latest .

# 运行容器
docker-compose up -d
```

### 6.3 生产环境检查清单

- [ ] 环境变量配置正确
- [ ] 数据库迁移已应用
- [ ] Redis连接正常
- [ ] 文件存储服务正常
- [ ] OCR服务可访问
- [ ] AI服务API密钥有效
- [ ] SSL证书配置（HTTPS）
- [ ] 日志系统配置
- [ ] 监控系统配置
- [ ] 备份策略已设置


