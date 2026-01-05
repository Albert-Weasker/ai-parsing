import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file provided',
      }, { status: 400 })
    }

    const fileType = file.type
    const fileName = file.name.toLowerCase()
    
    // 处理图片和PDF
    if (fileType.startsWith('image/') || fileType === 'application/pdf') {
      const arrayBuffer = await file.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString('base64')
      
      return NextResponse.json({
        success: true,
        data: {
          type: 'image',
          content: base64,
          metadata: {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
          },
        },
      })
    }

    // Word文档 - 转换为文本（服务端无法直接转图片，返回文本供OCR处理）
    if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.docx')
    ) {
      // 这里需要安装mammoth服务端版本
      // 暂时返回错误，提示客户端处理
      return NextResponse.json({
        success: false,
        error: 'Word文档请在客户端处理',
      }, { status: 400 })
    }

    // Excel表格 - 转换为JSON
    if (
      fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      fileName.endsWith('.xlsx') ||
      fileName.endsWith('.xls')
    ) {
      const XLSX = require('xlsx')
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      
      const result: any[] = []
      workbook.SheetNames.forEach((sheetName: string) => {
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        result.push({
          sheetName,
          data: jsonData,
        })
      })
      
      return NextResponse.json({
        success: true,
        data: {
          type: 'table',
          content: JSON.stringify(result),
          metadata: {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
          },
        },
      })
    }

    return NextResponse.json({
      success: false,
      error: '不支持的文件格式',
    }, { status: 400 })
  } catch (error: any) {
    console.error('Convert error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '转换失败',
    }, { status: 500 })
  }
}


