# API接口设计文档

## 1. API规范

### 1.1 基础信息

- **Base URL**: `/api`
- **认证方式**: JWT Token (Bearer Token)
- **数据格式**: JSON
- **字符编码**: UTF-8

### 1.2 通用响应格式

#### 成功响应
```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}
```

#### 错误响应
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": { ... }
  }
}
```

### 1.3 HTTP状态码

- `200` - 成功
- `201` - 创建成功
- `400` - 请求参数错误
- `401` - 未授权
- `403` - 无权限
- `404` - 资源不存在
- `500` - 服务器错误

## 2. 认证API

### 2.1 用户登录

```
POST /api/auth/login
```

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "张三",
      "role": "user",
      "organizationId": "uuid"
    }
  }
}
```

### 2.2 用户注册

```
POST /api/auth/register
```

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "张三",
  "organizationName": "公司名称"
}
```

### 2.3 刷新Token

```
POST /api/auth/refresh
```

**请求头**:
```
Authorization: Bearer <refresh_token>
```

## 3. 模板管理API

### 3.1 获取模板列表

```
GET /api/templates
```

**查询参数**:
- `organizationId` (string, optional): 组织ID
- `status` (string, optional): 状态筛选 (draft, active, archived)
- `category` (string, optional): 类别筛选
- `page` (number, optional): 页码，默认1
- `pageSize` (number, optional): 每页数量，默认20
- `search` (string, optional): 搜索关键词

**响应**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "火车票模板",
        "description": "用于识别火车票信息",
        "category": "train_ticket",
        "status": "active",
        "version": 1,
        "fieldCount": 5,
        "createdBy": {
          "id": "uuid",
          "name": "张三"
        },
        "createdAt": "2024-01-15T10:00:00Z",
        "updatedAt": "2024-01-15T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

### 3.2 获取模板详情

```
GET /api/templates/:id
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "火车票模板",
    "description": "用于识别火车票信息",
    "category": "train_ticket",
    "organizationId": "uuid",
    "config": {
      "documentType": "train_ticket",
      "fields": [
        {
          "id": "field_1",
          "name": "乘车人",
          "type": "text",
          "required": true,
          "extraction": {
            "method": "hybrid",
            "prompt": "提取乘车人姓名",
            "position": {
              "x": 100,
              "y": 200,
              "width": 200,
              "height": 30
            }
          },
          "validation": {
            "type": "custom",
            "rule": "length > 0"
          }
        }
      ]
    },
    "status": "active",
    "version": 1,
    "createdBy": { ... },
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
}
```

### 3.3 创建模板

```
POST /api/templates
```

**请求体**:
```json
{
  "name": "火车票模板",
  "description": "用于识别火车票信息",
  "category": "train_ticket",
  "config": {
    "documentType": "train_ticket",
    "fields": [ ... ]
  }
}
```

**响应**: 返回创建的模板详情（同3.2）

### 3.4 更新模板

```
PUT /api/templates/:id
```

**请求体**: 同3.3（部分更新）

**响应**: 返回更新后的模板详情

### 3.5 删除模板

```
DELETE /api/templates/:id
```

**响应**:
```json
{
  "success": true,
  "message": "模板已删除"
}
```

### 3.6 测试模板

```
POST /api/templates/:id/test
```

**请求体**:
```json
{
  "documentId": "uuid"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "extractedData": {
      "field_1": {
        "value": "张三",
        "confidence": 0.95,
        "source": "hybrid"
      }
    },
    "overallConfidence": 0.92,
    "processingTime": 1.5
  }
}
```

### 3.7 复制模板

```
POST /api/templates/:id/duplicate
```

**请求体**:
```json
{
  "name": "火车票模板（副本）"
}
```

**响应**: 返回新创建的模板详情

## 4. 文档管理API

### 4.1 上传文档

```
POST /api/documents
Content-Type: multipart/form-data
```

**表单数据**:
- `file` (File, required): 文档文件
- `templateId` (string, optional): 模板ID（可选，系统可自动匹配）
- `organizationId` (string, required): 组织ID

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "filename": "train_ticket_001.pdf",
    "originalFilename": "火车票.pdf",
    "fileType": "pdf",
    "fileSize": 1024000,
    "status": "pending",
    "templateId": "uuid",
    "uploadedAt": "2024-01-15T10:00:00Z"
  }
}
```

### 4.2 批量上传文档

```
POST /api/documents/batch
Content-Type: multipart/form-data
```

**表单数据**:
- `files` (File[], required): 文档文件数组
- `templateId` (string, optional): 模板ID
- `organizationId` (string, required): 组织ID

**响应**:
```json
{
  "success": true,
  "data": {
    "batchJobId": "uuid",
    "totalCount": 10,
    "uploadedCount": 10
  }
}
```

### 4.3 获取文档列表

```
GET /api/documents
```

**查询参数**:
- `organizationId` (string, required)
- `templateId` (string, optional)
- `status` (string, optional): pending, processing, completed, failed
- `page` (number, optional)
- `pageSize` (number, optional)
- `search` (string, optional)

**响应**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "filename": "train_ticket_001.pdf",
        "originalFilename": "火车票.pdf",
        "fileType": "pdf",
        "fileSize": 1024000,
        "status": "completed",
        "processingProgress": 100,
        "template": {
          "id": "uuid",
          "name": "火车票模板"
        },
        "uploadedBy": {
          "id": "uuid",
          "name": "张三"
        },
        "createdAt": "2024-01-15T10:00:00Z",
        "updatedAt": "2024-01-15T10:05:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

### 4.4 获取文档详情

```
GET /api/documents/:id
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "filename": "train_ticket_001.pdf",
    "originalFilename": "火车票.pdf",
    "fileType": "pdf",
    "fileSize": 1024000,
    "filePath": "/documents/uuid/train_ticket_001.pdf",
    "status": "completed",
    "processingProgress": 100,
    "template": { ... },
    "uploadedBy": { ... },
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:05:00Z"
  }
}
```

### 4.5 获取文档预览

```
GET /api/documents/:id/preview
```

**响应**: 返回文档预览URL或Base64图片

```json
{
  "success": true,
  "data": {
    "previewUrl": "https://storage.example.com/preview/uuid",
    "pages": [
      {
        "pageNumber": 1,
        "imageUrl": "https://storage.example.com/preview/uuid/page1.jpg"
      }
    ]
  }
}
```

### 4.6 删除文档

```
DELETE /api/documents/:id
```

## 5. 解析结果API

### 5.1 获取结果列表

```
GET /api/results
```

**查询参数**:
- `organizationId` (string, required)
- `templateId` (string, optional)
- `documentId` (string, optional)
- `reviewStatus` (string, optional): pending, approved, rejected, needs_review
- `minConfidence` (number, optional): 最小置信度
- `dateFrom` (string, optional): 开始日期
- `dateTo` (string, optional): 结束日期
- `page` (number, optional)
- `pageSize` (number, optional)

**响应**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "document": {
          "id": "uuid",
          "originalFilename": "火车票.pdf"
        },
        "template": {
          "id": "uuid",
          "name": "火车票模板"
        },
        "extractedData": {
          "field_1": {
            "value": "张三",
            "confidence": 0.95
          },
          "field_2": {
            "value": "G123",
            "confidence": 0.98
          }
        },
        "confidenceScore": 0.92,
        "reviewStatus": "pending",
        "createdAt": "2024-01-15T10:05:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

### 5.2 获取结果详情

```
GET /api/results/:id
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "document": { ... },
    "template": { ... },
    "rawData": {
      "text": "完整的OCR识别文本...",
      "words": [ ... ]
    },
    "extractedData": {
      "field_1": {
        "value": "张三",
        "confidence": 0.95,
        "source": "hybrid",
        "rawText": "乘车人：张三",
        "bbox": {
          "x": 100,
          "y": 200,
          "width": 200,
          "height": 30
        }
      }
    },
    "confidenceScore": 0.92,
    "reviewStatus": "pending",
    "reviewedBy": null,
    "reviewedAt": null,
    "reviewNotes": null,
    "createdAt": "2024-01-15T10:05:00Z",
    "updatedAt": "2024-01-15T10:05:00Z"
  }
}
```

### 5.3 更新结果（校对）

```
PUT /api/results/:id
```

**请求体**:
```json
{
  "extractedData": {
    "field_1": {
      "value": "张三（修正）"
    }
  },
  "reviewStatus": "approved",
  "reviewNotes": "已确认"
}
```

**响应**: 返回更新后的结果详情

### 5.4 批量审核

```
POST /api/results/batch-review
```

**请求体**:
```json
{
  "resultIds": ["uuid1", "uuid2", "uuid3"],
  "reviewStatus": "approved",
  "reviewNotes": "批量审核通过"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "successCount": 3,
    "failedCount": 0
  }
}
```

### 5.5 获取统计信息

```
GET /api/results/statistics
```

**查询参数**:
- `organizationId` (string, required)
- `templateId` (string, optional)
- `dateFrom` (string, optional)
- `dateTo` (string, optional)

**响应**:
```json
{
  "success": true,
  "data": {
    "totalCount": 1000,
    "byStatus": {
      "pending": 100,
      "approved": 800,
      "rejected": 50,
      "needs_review": 50
    },
    "byConfidence": {
      "high": 850,
      "medium": 100,
      "low": 50
    },
    "averageConfidence": 0.92,
    "byTemplate": [
      {
        "templateId": "uuid",
        "templateName": "火车票模板",
        "count": 500,
        "averageConfidence": 0.95
      }
    ]
  }
}
```

## 6. 批量任务API

### 6.1 创建批量任务

```
POST /api/batch-jobs
```

**请求体**:
```json
{
  "name": "批量处理火车票",
  "templateId": "uuid",
  "documentIds": ["uuid1", "uuid2", "uuid3"],
  "config": {
    "autoReview": false,
    "minConfidence": 0.8
  }
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "批量处理火车票",
    "status": "pending",
    "totalCount": 3,
    "processedCount": 0,
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

### 6.2 获取批量任务列表

```
GET /api/batch-jobs
```

**查询参数**:
- `organizationId` (string, required)
- `status` (string, optional)
- `page` (number, optional)
- `pageSize` (number, optional)

### 6.3 获取批量任务详情

```
GET /api/batch-jobs/:id
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "批量处理火车票",
    "template": { ... },
    "status": "processing",
    "totalCount": 100,
    "processedCount": 50,
    "successCount": 48,
    "failedCount": 2,
    "progress": 50,
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:10:00Z"
  }
}
```

### 6.4 获取批量任务进度

```
GET /api/batch-jobs/:id/progress
```

**响应**:
```json
{
  "success": true,
  "data": {
    "status": "processing",
    "progress": 50,
    "processedCount": 50,
    "totalCount": 100,
    "successCount": 48,
    "failedCount": 2,
    "currentDocument": {
      "id": "uuid",
      "filename": "train_ticket_051.pdf"
    }
  }
}
```

### 6.5 取消批量任务

```
POST /api/batch-jobs/:id/cancel
```

## 7. 导出API

### 7.1 创建导出任务

```
POST /api/exports
```

**请求体**:
```json
{
  "name": "导出火车票数据",
  "format": "excel",
  "filters": {
    "templateIds": ["uuid"],
    "reviewStatus": ["approved"],
    "dateRange": {
      "start": "2024-01-01",
      "end": "2024-01-31"
    },
    "minConfidence": 0.8
  },
  "fields": ["field_1", "field_2", "field_3"]
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "导出火车票数据",
    "format": "excel",
    "status": "pending",
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

### 7.2 获取导出任务列表

```
GET /api/exports
```

### 7.3 获取导出任务详情

```
GET /api/exports/:id
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "导出火车票数据",
    "format": "excel",
    "status": "completed",
    "filePath": "/exports/uuid/export_20240115.xlsx",
    "totalRecords": 1000,
    "fileSize": 1024000,
    "createdAt": "2024-01-15T10:00:00Z",
    "completedAt": "2024-01-15T10:05:00Z"
  }
}
```

### 7.4 下载导出文件

```
GET /api/exports/:id/download
```

**响应**: 文件流（Content-Type根据格式设置）

## 8. WebSocket事件

### 8.1 连接

客户端连接到WebSocket服务器后，需要加入相应的房间：

```javascript
socket.emit('join-organization', organizationId);
socket.emit('join-document', documentId);
socket.emit('join-batch-job', batchJobId);
```

### 8.2 事件列表

#### document.processing
文档处理进度更新

```json
{
  "documentId": "uuid",
  "progress": 50,
  "status": "processing"
}
```

#### document.completed
文档处理完成

```json
{
  "documentId": "uuid",
  "resultId": "uuid",
  "status": "completed",
  "confidence": 0.92
}
```

#### document.failed
文档处理失败

```json
{
  "documentId": "uuid",
  "status": "failed",
  "error": "OCR服务不可用"
}
```

#### batch.progress
批量任务进度更新

```json
{
  "batchJobId": "uuid",
  "progress": 50,
  "processedCount": 50,
  "totalCount": 100,
  "successCount": 48,
  "failedCount": 2
}
```

#### batch.completed
批量任务完成

```json
{
  "batchJobId": "uuid",
  "status": "completed",
  "totalCount": 100,
  "successCount": 95,
  "failedCount": 5
}
```

#### export.completed
导出任务完成

```json
{
  "exportJobId": "uuid",
  "status": "completed",
  "filePath": "/exports/uuid/export.xlsx",
  "totalRecords": 1000
}
```

## 9. 错误码说明

| 错误码 | HTTP状态码 | 说明 |
|--------|-----------|------|
| AUTH_REQUIRED | 401 | 需要认证 |
| AUTH_INVALID | 401 | 认证失败 |
| PERMISSION_DENIED | 403 | 权限不足 |
| RESOURCE_NOT_FOUND | 404 | 资源不存在 |
| VALIDATION_ERROR | 400 | 参数验证失败 |
| TEMPLATE_NOT_FOUND | 404 | 模板不存在 |
| DOCUMENT_NOT_FOUND | 404 | 文档不存在 |
| DOCUMENT_PROCESSING | 400 | 文档正在处理中 |
| OCR_SERVICE_ERROR | 500 | OCR服务错误 |
| AI_SERVICE_ERROR | 500 | AI服务错误 |
| STORAGE_ERROR | 500 | 存储服务错误 |
| INTERNAL_ERROR | 500 | 内部服务器错误 |

## 10. Rate Limiting

API请求限制：

- 认证API: 5次/分钟
- 文档上传: 10次/分钟
- 其他API: 100次/分钟

超过限制返回 `429 Too Many Requests`。


