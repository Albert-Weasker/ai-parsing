import { NextRequest, NextResponse } from 'next/server'
import { Template } from '@/types/template'

// 临时存储
let templates: Template[] = []

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const importedTemplate: Template = body

    // 验证模板结构
    if (!importedTemplate.name || !importedTemplate.sections) {
      return NextResponse.json({
        success: false,
        error: 'Invalid template format',
      }, { status: 400 })
    }

    // 生成新ID
    const template: Template = {
      ...importedTemplate,
      id: `template_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    templates.push(template)

    return NextResponse.json({
      success: true,
      data: template,
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to import template',
    }, { status: 500 })
  }
}


