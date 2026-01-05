import { NextRequest, NextResponse } from 'next/server'
import { getTemplateById, updateTemplate, deleteTemplate } from '@/lib/template-store'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const template = getTemplateById(id)
    
    if (!template) {
      return NextResponse.json({
        success: false,
        error: 'Template not found',
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: template,
    })
  } catch (error) {
    console.error('GET template error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch template',
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const updated = updateTemplate(id, body)
    
    if (!updated) {
      return NextResponse.json({
        success: false,
        error: 'Template not found',
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    console.error('PUT template error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update template',
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('Deleting template:', id)
    
    // 先检查模板是否存在
    const template = getTemplateById(id)
    if (!template) {
      console.log('Template not found:', id)
      return NextResponse.json({
        success: false,
        error: 'Template not found',
      }, { status: 404 })
    }
    
    const deleted = deleteTemplate(id)
    console.log('Delete result:', deleted)
    
    if (!deleted) {
      return NextResponse.json({
        success: false,
        error: 'Failed to delete template',
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Template deleted',
    })
  } catch (error) {
    console.error('DELETE template error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete template',
    }, { status: 500 })
  }
}
