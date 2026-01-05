// DSL模板类型定义
export interface TemplateField {
  id: string
  name: string
  type: 'text' | 'number' | 'date' | 'select' | 'multi-select' | 'array'
  required: boolean
  description?: string
  extraction: {
    method: 'ocr' | 'ai' | 'regex' | 'position' | 'hybrid'
    prompt?: string
    regex?: string
    position?: {
      page?: number
      x: number
      y: number
      width: number
      height: number
    }
  }
  validation?: {
    type: string
    rule?: string
  }
  options?: string[] // for select type
  allowMultiple?: boolean // 是否允许多值
}

export interface TemplateSection {
  id: string
  name: string
  fields: TemplateField[]
}

export interface Template {
  id: string
  name: string
  description?: string
  category: string
  version: number
  sections: TemplateSection[]
  createdAt: string
  updatedAt: string
}

export interface ExtractionResult {
  fieldId: string
  fieldName: string
  candidates: Array<{
    value: any
    confidence: number
    source: string
    position?: {
      page: number
      bbox: {
        x: number
        y: number
        width: number
        height: number
      }
    }
    context?: string
  }>
  selectedValues: any[] // 用户选择的值
}


