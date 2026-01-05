import { NextRequest, NextResponse } from 'next/server'
import { Template } from '@/types/template'
import { getTemplates, addTemplate } from '@/lib/template-store'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')

    let filteredTemplates = getTemplates()
    if (category) {
      filteredTemplates = filteredTemplates.filter(t => t.category === category)
    }

    return NextResponse.json({
      success: true,
      data: filteredTemplates,
    })
  } catch (error) {
    console.error('GET templates error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch templates',
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const template: Template = {
      ...body,
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const savedTemplate = addTemplate(template)

    return NextResponse.json({
      success: true,
      data: savedTemplate,
    }, { status: 201 })
  } catch (error) {
    console.error('POST template error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create template',
    }, { status: 500 })
  }
}
