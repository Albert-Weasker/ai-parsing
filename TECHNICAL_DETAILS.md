# 技术实现细节文档

## 1. 前端技术栈详细说明

### 1.1 Next.js 14 App Router 架构

```
app/
├── (auth)/
│   ├── login/
│   └── register/
├── (dashboard)/
│   ├── layout.tsx          # 主布局（侧边栏、顶部导航）
│   ├── page.tsx            # 仪表盘首页
│   ├── templates/
│   │   ├── page.tsx        # 模板列表
│   │   ├── create/
│   │   │   └── page.tsx    # 创建模板
│   │   └── [id]/
│   │       ├── page.tsx    # 模板详情
│   │       ├── edit/
│   │       └── test/
│   ├── upload/
│   ├── documents/
│   ├── results/
│   └── export/
├── api/                     # API Routes
│   ├── templates/
│   ├── documents/
│   ├── results/
│   └── batch-jobs/
├── components/              # 共享组件
│   ├── ui/                 # 基础UI组件（shadcn/ui）
│   ├── templates/          # 模板相关组件
│   ├── documents/          # 文档相关组件
│   └── common/             # 通用组件
├── lib/                     # 工具函数
│   ├── utils.ts
│   ├── api.ts              # API客户端
│   └── validations.ts      # Zod schemas
└── hooks/                   # 自定义Hooks
```

### 1.2 状态管理方案

#### 使用 Zustand 进行客户端状态管理
```typescript
// stores/templateStore.ts
interface TemplateStore {
  templates: Template[];
  currentTemplate: Template | null;
  loading: boolean;
  fetchTemplates: () => Promise<void>;
  setCurrentTemplate: (template: Template) => void;
  updateTemplate: (id: string, data: Partial<Template>) => Promise<void>;
}

// stores/documentStore.ts
interface DocumentStore {
  uploadQueue: UploadItem[];
  addToQueue: (file: File) => void;
  removeFromQueue: (id: string) => void;
  updateProgress: (id: string, progress: number) => void;
}
```

#### 使用 React Query 进行服务端状态管理
```typescript
// hooks/useTemplates.ts
export function useTemplates(filters?: TemplateFilters) {
  return useQuery({
    queryKey: ['templates', filters],
    queryFn: () => api.templates.list(filters),
  });
}

export function useTemplate(id: string) {
  return useQuery({
    queryKey: ['templates', id],
    queryFn: () => api.templates.get(id),
    enabled: !!id,
  });
}

// hooks/useDocumentUpload.ts
export function useDocumentUpload() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.documents.upload,
    onSuccess: () => {
      queryClient.invalidateQueries(['documents']);
    },
  });
}
```

### 1.3 表单处理方案

使用 React Hook Form + Zod 进行表单验证：

```typescript
// schemas/templateSchema.ts
import { z } from 'zod';

export const templateFieldSchema = z.object({
  id: z.string(),
  name: z.string().min(1, '字段名不能为空'),
  type: z.enum(['text', 'number', 'date', 'select']),
  required: z.boolean(),
  extraction: z.object({
    method: z.enum(['ocr', 'ai', 'regex', 'position', 'hybrid']),
    prompt: z.string().optional(),
    position: z.object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    }).optional(),
    regex: z.string().optional(),
  }),
  validation: z.object({
    type: z.string(),
    rule: z.string().optional(),
  }).optional(),
});

export const templateSchema = z.object({
  name: z.string().min(1, '模板名称不能为空'),
  description: z.string().optional(),
  category: z.string(),
  config: z.object({
    fields: z.array(templateFieldSchema),
    documentType: z.string(),
  }),
});

// components/TemplateForm.tsx
export function TemplateForm() {
  const form = useForm<z.infer<typeof templateSchema>>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      config: {
        fields: [],
        documentType: '',
      },
    },
  });
  
  // ...
}
```

### 1.4 文件上传实现

```typescript
// components/FileUploader.tsx
import { useDropzone } from 'react-dropzone';
import { useDocumentUpload } from '@/hooks/useDocumentUpload';

export function FileUploader() {
  const uploadMutation = useDocumentUpload();
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      // 分片上传大文件
      if (file.size > 10 * 1024 * 1024) {
        await uploadChunked(file);
      } else {
        await uploadMutation.mutateAsync({ file });
      }
    }
  }, [uploadMutation]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxSize: 100 * 1024 * 1024, // 100MB
  });
  
  // ...
}
```

## 2. 后端API设计

### 2.1 API路由结构

```typescript
// app/api/templates/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filters = {
    organizationId: searchParams.get('organizationId'),
    status: searchParams.get('status'),
    category: searchParams.get('category'),
  };
  
  const templates = await db.template.findMany({
    where: buildWhereClause(filters),
    include: { createdBy: true },
  });
  
  return Response.json({ data: templates });
}

export async function POST(request: Request) {
  const body = await request.json();
  const validated = templateSchema.parse(body);
  
  const template = await db.template.create({
    data: {
      ...validated,
      organizationId: getCurrentOrgId(request),
      createdBy: getCurrentUserId(request),
    },
  });
  
  return Response.json({ data: template }, { status: 201 });
}
```

### 2.2 文档处理流程

```typescript
// lib/document-processor.ts
export class DocumentProcessor {
  async process(documentId: string, templateId: string) {
    // 1. 获取文档和模板
    const document = await db.document.findUnique({ where: { id: documentId } });
    const template = await db.template.findUnique({ where: { id: templateId } });
    
    // 2. 更新状态为处理中
    await db.document.update({
      where: { id: documentId },
      data: { status: 'processing', processingProgress: 10 },
    });
    
    // 3. OCR识别
    const ocrResult = await this.performOCR(document);
    await db.document.update({
      where: { id: documentId },
      data: { processingProgress: 50 },
    });
    
    // 4. AI提取
    const extractionResult = await this.performExtraction(
      document,
      template,
      ocrResult
    );
    
    // 5. 保存结果
    await db.extractionResult.create({
      data: {
        documentId,
        templateId,
        rawData: ocrResult,
        extractedData: extractionResult.fields,
        confidenceScore: extractionResult.overallConfidence,
      },
    });
    
    // 6. 更新文档状态
    await db.document.update({
      where: { id: documentId },
      data: {
        status: 'completed',
        processingProgress: 100,
      },
    });
    
    // 7. 发送通知
    await this.notifyUser(document.uploadedBy, {
      type: 'document_completed',
      documentId,
    });
  }
  
  private async performOCR(document: Document): Promise<OcrResult> {
    // 根据配置选择OCR服务
    const ocrService = this.getOCRService();
    return await ocrService.recognize(document.filePath);
  }
  
  private async performExtraction(
    document: Document,
    template: Template,
    ocrResult: OcrResult
  ): Promise<ExtractionResult> {
    const templateEngine = new TemplateEngine(template);
    return await templateEngine.execute(document, ocrResult);
  }
}
```

### 2.3 任务队列实现

```typescript
// lib/queues/document-queue.ts
import Queue from 'bull';
import { DocumentProcessor } from './document-processor';

export const documentQueue = new Queue('document-processing', {
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

documentQueue.process(async (job) => {
  const { documentId, templateId } = job.data;
  const processor = new DocumentProcessor();
  
  // 更新进度
  job.progress(0);
  
  await processor.process(documentId, templateId);
  
  // 完成
  job.progress(100);
  
  return { success: true, documentId };
});

// 添加任务
export async function addDocumentProcessingJob(
  documentId: string,
  templateId: string,
  priority: number = 0
) {
  return await documentQueue.add(
    'process-document',
    { documentId, templateId },
    {
      priority,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    }
  );
}
```

## 3. OCR服务集成

### 3.1 OCR服务适配器

```typescript
// lib/ocr/ocr-adapter.ts
export interface OCRService {
  recognize(filePath: string, options?: OcrOptions): Promise<OcrResult>;
}

export class OCRAdapter {
  private service: OCRService;
  
  constructor(serviceType: 'paddleocr' | 'tesseract' | 'cloud') {
    switch (serviceType) {
      case 'paddleocr':
        this.service = new PaddleOCRService();
        break;
      case 'tesseract':
        this.service = new TesseractService();
        break;
      case 'cloud':
        this.service = new CloudOCRService();
        break;
    }
  }
  
  async recognize(filePath: string): Promise<OcrResult> {
    return await this.service.recognize(filePath);
  }
}

// lib/ocr/paddleocr-service.ts
export class PaddleOCRService implements OCRService {
  async recognize(filePath: string): Promise<OcrResult> {
    // 调用PaddleOCR Python服务或HTTP API
    const response = await fetch('http://paddleocr-service:8000/ocr', {
      method: 'POST',
      body: createFormData(filePath),
    });
    
    const data = await response.json();
    
    return {
      text: data.text,
      words: data.words.map((w: any) => ({
        text: w.text,
        bbox: w.bbox,
        confidence: w.confidence,
      })),
    };
  }
}
```

### 3.2 多页文档处理

```typescript
// lib/ocr/multi-page-handler.ts
export class MultiPageHandler {
  async processPDF(filePath: string): Promise<OcrResult[]> {
    // 1. 将PDF转换为图片
    const images = await this.pdfToImages(filePath);
    
    // 2. 对每页进行OCR
    const results = await Promise.all(
      images.map((image, index) => 
        this.ocrService.recognize(image, { pageNumber: index + 1 })
      )
    );
    
    return results;
  }
  
  private async pdfToImages(filePath: string): Promise<string[]> {
    // 使用pdf-poppler或pdf2pic
    // 返回图片路径数组
  }
}
```

## 4. AI理解服务集成

### 4.1 AI服务适配器

```typescript
// lib/ai/ai-adapter.ts
export interface AIService {
  extract(
    prompt: string,
    context: { ocrText: string; documentType: string },
    fields: TemplateField[]
  ): Promise<ExtractionResult>;
}

export class AIAdapter {
  private service: AIService;
  
  constructor(serviceType: 'openai' | 'claude' | 'local') {
    switch (serviceType) {
      case 'openai':
        this.service = new OpenAIService();
        break;
      case 'claude':
        this.service = new ClaudeService();
        break;
      case 'local':
        this.service = new LocalModelService();
        break;
    }
  }
  
  async extract(
    template: Template,
    ocrResult: OcrResult,
    documentImage?: string
  ): Promise<ExtractionResult> {
    // 构建提示词
    const prompt = this.buildPrompt(template, ocrResult);
    
    // 调用AI服务
    const result = await this.service.extract(prompt, {
      ocrText: ocrResult.text,
      documentType: template.config.documentType,
    }, template.config.fields);
    
    return result;
  }
  
  private buildPrompt(template: Template, ocrResult: OcrResult): string {
    const fieldsDescription = template.config.fields
      .map(f => `- ${f.name} (${f.type}): ${f.extraction.prompt || ''}`)
      .join('\n');
    
    return `
请从以下OCR识别的文本中提取结构化信息。

文档类型：${template.config.documentType}

需要提取的字段：
${fieldsDescription}

OCR识别文本：
${ocrResult.text}

请以JSON格式返回提取结果，格式如下：
{
  "field_1": {"value": "...", "confidence": 0.95},
  "field_2": {"value": "...", "confidence": 0.90}
}
`;
  }
}

// lib/ai/openai-service.ts
export class OpenAIService implements AIService {
  private client: OpenAI;
  
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  
  async extract(
    prompt: string,
    context: { ocrText: string; documentType: string },
    fields: TemplateField[]
  ): Promise<ExtractionResult> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4-vision-preview', // 或 gpt-4-turbo
      messages: [
        {
          role: 'system',
          content: '你是一个专业的文档信息提取助手。',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            // 如果有图片，可以添加图片
            // { type: 'image_url', image_url: { url: imageBase64 } },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    });
    
    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      fields: result,
      overallConfidence: this.calculateConfidence(result),
    };
  }
}
```

## 5. 模板引擎实现

### 5.1 模板执行引擎

```typescript
// lib/template-engine.ts
export class TemplateEngine {
  constructor(private template: Template) {}
  
  async execute(
    document: Document,
    ocrResult: OcrResult
  ): Promise<ExtractionResult> {
    const extractedFields: Record<string, FieldResult> = {};
    
    // 并行处理所有字段
    const fieldResults = await Promise.all(
      this.template.config.fields.map(field =>
        this.extractField(field, document, ocrResult)
      )
    );
    
    // 组装结果
    fieldResults.forEach((result, index) => {
      const field = this.template.config.fields[index];
      extractedFields[field.id] = result;
    });
    
    // 应用验证规则
    this.validateFields(extractedFields);
    
    // 计算整体置信度
    const overallConfidence = this.calculateOverallConfidence(extractedFields);
    
    return {
      fields: extractedFields,
      overallConfidence,
    };
  }
  
  private async extractField(
    field: TemplateField,
    document: Document,
    ocrResult: OcrResult
  ): Promise<FieldResult> {
    const method = field.extraction.method;
    
    switch (method) {
      case 'ocr':
        return this.extractByOCR(field, ocrResult);
      case 'ai':
        return await this.extractByAI(field, document, ocrResult);
      case 'regex':
        return this.extractByRegex(field, ocrResult);
      case 'position':
        return this.extractByPosition(field, ocrResult);
      case 'hybrid':
        return await this.extractByHybrid(field, document, ocrResult);
      default:
        throw new Error(`Unknown extraction method: ${method}`);
    }
  }
  
  private extractByOCR(field: TemplateField, ocrResult: OcrResult): FieldResult {
    // 基于位置的OCR提取
    if (field.extraction.position) {
      const { x, y, width, height } = field.extraction.position;
      const words = ocrResult.words.filter(w =>
        w.bbox.x >= x &&
        w.bbox.y >= y &&
        w.bbox.x + w.bbox.width <= x + width &&
        w.bbox.y + w.bbox.height <= y + height
      );
      
      return {
        value: words.map(w => w.text).join(' '),
        confidence: words.length > 0 
          ? words.reduce((sum, w) => sum + w.confidence, 0) / words.length 
          : 0,
        source: 'ocr',
        rawText: words.map(w => w.text).join(' '),
      };
    }
    
    // 基于关键词的OCR提取
    // ...
  }
  
  private async extractByAI(
    field: TemplateField,
    document: Document,
    ocrResult: OcrResult
  ): Promise<FieldResult> {
    const aiService = new AIAdapter('openai');
    const prompt = field.extraction.prompt || `提取${field.name}`;
    
    const result = await aiService.extract(
      prompt,
      { ocrText: ocrResult.text, documentType: this.template.config.documentType },
      [field]
    );
    
    return {
      value: result.fields[field.id]?.value || '',
      confidence: result.fields[field.id]?.confidence || 0,
      source: 'ai',
      rawText: ocrResult.text,
    };
  }
  
  private extractByRegex(field: TemplateField, ocrResult: OcrResult): FieldResult {
    if (!field.extraction.regex) {
      throw new Error('Regex pattern is required for regex extraction');
    }
    
    const regex = new RegExp(field.extraction.regex);
    const match = ocrResult.text.match(regex);
    
    return {
      value: match ? match[1] || match[0] : '',
      confidence: match ? 0.9 : 0,
      source: 'regex',
      rawText: match ? match[0] : '',
    };
  }
  
  private extractByPosition(field: TemplateField, ocrResult: OcrResult): FieldResult {
    // 类似OCR提取，但更精确的位置匹配
    return this.extractByOCR(field, ocrResult);
  }
  
  private async extractByHybrid(
    field: TemplateField,
    document: Document,
    ocrResult: OcrResult
  ): Promise<FieldResult> {
    // 先尝试OCR/位置提取
    const ocrResult_field = this.extractByOCR(field, ocrResult);
    
    // 如果置信度低，使用AI补充
    if (ocrResult_field.confidence < 0.7) {
      const aiResult = await this.extractByAI(field, document, ocrResult);
      
      // 合并结果，选择置信度更高的
      if (aiResult.confidence > ocrResult_field.confidence) {
        return {
          ...aiResult,
          source: 'hybrid',
        };
      }
    }
    
    return {
      ...ocrResult_field,
      source: 'hybrid',
    };
  }
  
  private validateFields(fields: Record<string, FieldResult>) {
    this.template.config.fields.forEach(field => {
      const result = fields[field.id];
      
      if (field.required && !result.value) {
        result.validationError = `${field.name}是必填字段`;
      }
      
      if (field.validation) {
        // 应用自定义验证规则
        // ...
      }
    });
  }
  
  private calculateOverallConfidence(
    fields: Record<string, FieldResult>
  ): number {
    const confidences = Object.values(fields)
      .map(f => f.confidence)
      .filter(c => c > 0);
    
    if (confidences.length === 0) return 0;
    
    return confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
  }
}
```

## 6. 数据导出实现

### 6.1 Excel导出

```typescript
// lib/export/excel-exporter.ts
import ExcelJS from 'exceljs';

export class ExcelExporter {
  async export(
    results: ExtractionResult[],
    template: Template,
    options: ExportOptions
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('提取结果');
    
    // 设置表头
    const headers = template.config.fields.map(f => f.name);
    worksheet.addRow(headers);
    
    // 设置表头样式
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
    
    // 添加数据行
    results.forEach(result => {
      const row = template.config.fields.map(field => {
        const fieldResult = result.fields[field.id];
        return fieldResult?.value || '';
      });
      worksheet.addRow(row);
    });
    
    // 自动调整列宽
    worksheet.columns.forEach(column => {
      column.width = 20;
    });
    
    // 生成Buffer
    return await workbook.xlsx.writeBuffer();
  }
}
```

### 6.2 CSV导出

```typescript
// lib/export/csv-exporter.ts
import { stringify } from 'csv-stringify/sync';

export class CSVExporter {
  export(
    results: ExtractionResult[],
    template: Template,
    options: ExportOptions
  ): string {
    // 表头
    const headers = template.config.fields.map(f => f.name);
    
    // 数据行
    const rows = results.map(result =>
      template.config.fields.map(field => {
        const fieldResult = result.fields[field.id];
        return fieldResult?.value || '';
      })
    );
    
    // 生成CSV
    return stringify([headers, ...rows], {
      header: false,
      quoted: true,
    });
  }
}
```

## 7. WebSocket实时更新

```typescript
// lib/websocket/server.ts
import { Server as SocketIOServer } from 'socket.io';

export function setupWebSocket(server: any) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      methods: ['GET', 'POST'],
    },
  });
  
  io.on('connection', (socket) => {
    // 用户加入组织房间
    socket.on('join-organization', (orgId) => {
      socket.join(`org:${orgId}`);
    });
    
    // 用户加入文档房间
    socket.on('join-document', (docId) => {
      socket.join(`doc:${docId}`);
    });
  });
  
  return io;
}

// 发送文档处理进度
export function emitDocumentProgress(
  io: SocketIOServer,
  documentId: string,
  progress: number
) {
  io.to(`doc:${documentId}`).emit('document.processing', {
    documentId,
    progress,
  });
}

// 发送文档处理完成
export function emitDocumentCompleted(
  io: SocketIOServer,
  documentId: string,
  result: ExtractionResult
) {
  io.to(`doc:${documentId}`).emit('document.completed', {
    documentId,
    result,
  });
}
```

## 8. 错误处理与日志

```typescript
// lib/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

// lib/error-handler.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(error: Error, req: Request, res: Response) {
  logger.error('Error occurred', {
    error: error.message,
    stack: error.stack,
    path: req.url,
  });
  
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: {
        message: error.message,
        code: error.code,
      },
    });
  }
  
  return res.status(500).json({
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
  });
}
```


