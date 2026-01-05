import { NextRequest, NextResponse } from 'next/server'
import { Template } from '@/types/template'
import { documentParser } from '@/lib/document-parser'
import { qwenPlusService } from '@/lib/qwen-plus'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { template, documentImage, documentType, documentFileName } = body

    if (!template || !documentImage) {
      return NextResponse.json({
        success: false,
        error: 'Missing template or documentImage',
      }, { status: 400 })
    }

    // 步骤1: 根据文件类型解析文档
    let parsedDocument
    try {
      // 判断文件类型
      const fileType = documentType || 'image' // 默认图片
      
      // 根据文件类型选择解析方式
      // 图片和PDF：使用 qwen-vl 解析
      // Word和Excel：直接代码解析（需要原始文件的base64）
      parsedDocument = await documentParser.parseDocument(
        fileType,
        documentImage, // base64字符串
        documentFileName
      )
    } catch (error: any) {
      console.error('Document parsing error:', error)
      return NextResponse.json({
        success: false,
        error: `文档解析失败: ${error.message}`,
      }, { status: 500 })
    }

    // 步骤2: 使用 qwen-plus 将解析结果与模板字段绑定
    try {
      // 定义模板字段类型
      interface TemplateFieldForExtraction {
        id: string
        name: string
        type: string
        allowMultiple: boolean
        prompt: string
      }
      
      // 收集所有模板字段
      const templateFields: TemplateFieldForExtraction[] = template.sections.flatMap((section: any) =>
        section.fields.map((field: any) => ({
          id: field.id,
          name: field.name,
          type: field.type,
          allowMultiple: field.allowMultiple || false,
          prompt: field.extraction?.prompt || '', // 包含字段的提示词
        }))
      )

      // 准备解析数据
      const extractedData = parsedDocument.structuredData 
        ? JSON.stringify(parsedDocument.structuredData, null, 2)
        : parsedDocument.rawData

      // 调用 qwen-plus 进行字段绑定
      const boundFields = await qwenPlusService.bindFieldsToTemplate(
        extractedData,
        templateFields
      )

      // 步骤3: 转换为前端需要的格式（保持兼容性）
      const results: Record<string, any> = {}
      templateFields.forEach((field) => {
        const value = boundFields[field.name] || ''
        // 如果允许多值，转换为数组
        const values = value ? value.split(',').map(v => v.trim()).filter(v => v) : []
        
        results[field.id] = {
          fieldId: field.id,
          fieldName: field.name,
          candidates: values.map((v, index) => ({
            value: v,
            confidence: 0.95 - index * 0.05, // 第一个值置信度最高
            source: parsedDocument.type === 'image' || parsedDocument.type === 'pdf' ? 'qwen-vl' : 'direct',
            context: '',
          })),
          selectedValues: values,
        }
      })

      return NextResponse.json({
        success: true,
        data: results,
        rawParsedData: parsedDocument.rawData, // 可选：返回原始解析数据用于调试
      })
    } catch (error: any) {
      console.error('Field binding error:', error)
      return NextResponse.json({
        success: false,
        error: 'ai服务部署过多，同时运行会导致算力不足，请稍后再试',
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error('Extraction error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Extraction failed',
    }, { status: 500 })
  }
}

