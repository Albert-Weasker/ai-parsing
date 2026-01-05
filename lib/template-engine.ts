import { Template, TemplateField, ExtractionResult } from '@/types/template'
import { qwenVLService } from './qwen-vl'

export class TemplateEngine {
  async extract(
    template: Template,
    documentImage: string, // base64
    ocrResult?: any
  ): Promise<Record<string, ExtractionResult>> {
    const results: Record<string, ExtractionResult> = {}

    // 按section分组处理
    for (const section of template.sections) {
      for (const field of section.fields) {
        const result = await this.extractField(field, documentImage, ocrResult)
        results[field.id] = result
      }
    }

    return results
  }

  private async extractField(
    field: TemplateField,
    documentImage: string,
    ocrResult?: any
  ): Promise<ExtractionResult> {
    const { extraction, allowMultiple } = field

    switch (extraction.method) {
      case 'ai':
      case 'hybrid':
        return await this.extractByAI(field, documentImage, allowMultiple)
      
      case 'regex':
        return this.extractByRegex(field, ocrResult?.text || '')
      
      case 'position':
        return this.extractByPosition(field, ocrResult)
      
      case 'ocr':
        return this.extractByOCR(field, ocrResult)
      
      default:
        return {
          fieldId: field.id,
          fieldName: field.name,
          candidates: [],
          selectedValues: [],
        }
    }
  }

  private async extractByAI(
    field: TemplateField,
    documentImage: string,
    allowMultiple?: boolean
  ): Promise<ExtractionResult> {
    const prompt = field.extraction.prompt || `提取"${field.name}"字段的值`
    
    if (allowMultiple) {
      // 多值提取
      const promptWithMultiple = `${prompt}\n注意：此字段可能有多个值，请提取所有匹配的值，并返回数组格式。`
      
      const result = await qwenVLService.extractFromImage(
        documentImage,
        promptWithMultiple,
        field.name
      )

      const candidates = (result.candidates || [{
        value: result.value,
        confidence: result.confidence,
      }]).map((candidate: any) => ({
        value: candidate.value,
        confidence: candidate.confidence,
        source: 'ai' as const,
        context: candidate.context || '',
      }))

      return {
        fieldId: field.id,
        fieldName: field.name,
        candidates,
        selectedValues: Array.isArray(result.value) ? result.value : [result.value],
      }
    } else {
      // 单值提取，但返回多个候选
      const result = await qwenVLService.extractFromImage(
        documentImage,
        `${prompt}\n如果文档中有多个疑似匹配的值，请全部列出，并标注最可能的值。`,
        field.name
      )

      const candidates = (result.candidates || [{
        value: result.value,
        confidence: result.confidence,
      }]).map((candidate: any) => ({
        value: candidate.value,
        confidence: candidate.confidence,
        source: 'ai' as const,
        context: candidate.context || '',
      }))

      return {
        fieldId: field.id,
        fieldName: field.name,
        candidates,
        selectedValues: candidates.length > 0 ? [candidates[0].value] : [],
      }
    }
  }

  private extractByRegex(
    field: TemplateField,
    text: string
  ): Promise<ExtractionResult> {
    if (!field.extraction.regex) {
      return Promise.resolve({
        fieldId: field.id,
        fieldName: field.name,
        candidates: [],
        selectedValues: [],
      })
    }

    const regex = new RegExp(field.extraction.regex, 'g')
    const matches = text.matchAll(regex)
    const candidates: ExtractionResult['candidates'] = []

    for (const match of matches) {
      candidates.push({
        value: match[1] || match[0],
        confidence: 0.9,
        source: 'regex',
        context: match[0],
      })
    }

    return Promise.resolve({
      fieldId: field.id,
      fieldName: field.name,
      candidates,
      selectedValues: candidates.length > 0 ? [candidates[0].value] : [],
    })
  }

  private extractByPosition(
    field: TemplateField,
    ocrResult?: any
  ): Promise<ExtractionResult> {
    if (!field.extraction.position || !ocrResult) {
      return Promise.resolve({
        fieldId: field.id,
        fieldName: field.name,
        candidates: [],
        selectedValues: [],
      })
    }

    const { x, y, width, height } = field.extraction.position
    const words = ocrResult.words?.filter((w: any) =>
      w.bbox.x >= x &&
      w.bbox.y >= y &&
      w.bbox.x + w.bbox.width <= x + width &&
      w.bbox.y + w.bbox.height <= y + height
    ) || []

    const value = words.map((w: any) => w.text).join(' ')
    const confidence = words.length > 0
      ? words.reduce((sum: number, w: any) => sum + (w.confidence || 0.8), 0) / words.length
      : 0

    return Promise.resolve({
      fieldId: field.id,
      fieldName: field.name,
      candidates: [{
        value,
        confidence,
        source: 'position',
        position: {
          page: field.extraction.position.page || 1,
          bbox: { x, y, width, height },
        },
        context: value,
      }],
      selectedValues: value ? [value] : [],
    })
  }

  private extractByOCR(
    field: TemplateField,
    ocrResult?: any
  ): Promise<ExtractionResult> {
    if (!ocrResult) {
      return Promise.resolve({
        fieldId: field.id,
        fieldName: field.name,
        candidates: [],
        selectedValues: [],
      })
    }

    // 简单的关键词匹配
    const keywords = field.name.split(/[，,、]/)
    const text = ocrResult.text || ''
    const candidates: ExtractionResult['candidates'] = []

    for (const keyword of keywords) {
      const index = text.indexOf(keyword)
      if (index !== -1) {
        // 提取关键词后的内容
        const afterText = text.substring(index + keyword.length, index + keyword.length + 50)
        const match = afterText.match(/[:：]\s*(.+?)(?:\n|$)/)
        if (match) {
          candidates.push({
            value: match[1].trim(),
            confidence: 0.85,
            source: 'ocr',
            context: match[0],
          })
        }
      }
    }

    return Promise.resolve({
      fieldId: field.id,
      fieldName: field.name,
      candidates,
      selectedValues: candidates.length > 0 ? [candidates[0].value] : [],
    })
  }
}

export const templateEngine = new TemplateEngine()


