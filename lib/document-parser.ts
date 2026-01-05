import { qwenVLService } from './qwen-vl'
import * as XLSX from 'xlsx'

export interface ParsedDocument {
  type: 'image' | 'pdf' | 'word' | 'excel'
  rawData: string | Record<string, any>
  structuredData?: any
}

export class DocumentParser {
  /**
   * 解析文档
   * @param fileType 文件类型: 'image', 'pdf', 'word', 'excel'
   * @param fileContent 文件内容（base64字符串或File对象）
   * @param fileName 文件名（用于判断类型）
   */
  async parseDocument(
    fileType: string,
    fileContent: string | File,
    fileName?: string
  ): Promise<ParsedDocument> {
    // 判断文件类型
    const docType = this.detectDocumentType(fileType, fileName)

    switch (docType) {
      case 'image':
      case 'pdf':
        // 图片和PDF使用 qwen-vl 解析
        if (typeof fileContent !== 'string') {
          throw new Error('图片和PDF需要base64字符串格式')
        }
        return await this.parseWithQwenVL(fileContent, docType)
      
      case 'word':
        // Word文档直接解析为文本（服务端）
        return await this.parseWord(fileContent)
      
      case 'excel':
        // Excel直接解析为结构化数据（服务端）
        return await this.parseExcel(fileContent)
      
      default:
        throw new Error(`不支持的文件类型: ${fileType}`)
    }
  }

  /**
   * 使用 qwen-vl 解析图片和PDF
   */
  private async parseWithQwenVL(
    imageBase64: string,
    type: 'image' | 'pdf'
  ): Promise<ParsedDocument> {
    try {
      const prompt = `请仔细分析这个${type === 'pdf' ? 'PDF文档' : '图片'}，提取其中的所有文本内容和结构化信息。

要求：
1. 提取所有可见的文本内容
2. 识别表格、列表等结构化数据
3. 保留文本的层次结构和格式信息
4. 如果有多页，请按页组织内容

请以结构化的方式返回提取的内容，包括：
- 所有文本内容
- 表格数据（如果有）
- 关键信息点

返回格式：纯文本，清晰描述文档内容。`

      const response = await qwenVLService.extractFromImage(
        imageBase64,
        prompt,
        'document_content'
      )

      return {
        type,
        rawData: typeof response.value === 'string' 
          ? response.value 
          : JSON.stringify(response.value),
      }
    } catch (error: any) {
      console.error('Qwen-VL parsing error:', error)
      throw new Error(`解析${type === 'pdf' ? 'PDF' : '图片'}失败: ${error.message}`)
    }
  }

  /**
   * 解析Word文档为文本（服务端）
   * 注意：这里接收的是前端提取的文本内容（base64编码的文本），不是图片
   */
  private async parseWord(fileContent: string | File): Promise<ParsedDocument> {
    try {
      // fileContent 应该是前端提取的文本内容（base64编码）
      if (typeof fileContent === 'string') {
        // 解码 base64 文本内容
        try {
          const textContent = Buffer.from(fileContent, 'base64').toString('utf-8')
          return {
            type: 'word',
            rawData: textContent,
          }
        } catch (decodeError) {
          // 如果解码失败，可能是直接传的文本（不是base64）
          return {
            type: 'word',
            rawData: fileContent,
          }
        }
      } else {
        // 如果是 File 对象，需要在前端处理
        throw new Error('Word 文档解析需要在前端提取文本后传递')
      }
    } catch (error: any) {
      console.error('Word parsing error:', error)
      throw new Error(`解析Word文档失败: ${error.message}`)
    }
  }

  /**
   * 解析Excel为结构化数据（服务端）
   */
  private async parseExcel(fileContent: string | File): Promise<ParsedDocument> {
    try {
      // 如果是 base64 字符串，需要先解码
      let arrayBuffer: ArrayBuffer
      
      if (typeof fileContent === 'string') {
        // base64 字符串
        const buffer = Buffer.from(fileContent, 'base64')
        arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
      } else {
        // File 对象
        arrayBuffer = await fileContent.arrayBuffer()
      }

      // 使用 xlsx 解析 Excel
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      
      const jsonData: any[] = []
      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName]
        const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
        jsonData.push({
          sheetName,
          data: sheetData,
        })
      })
      
      // 将Excel数据转换为更易读的文本格式
      let textData = ''
      jsonData.forEach((sheet, index) => {
        textData += `工作表 ${index + 1}: ${sheet.sheetName}\n`
        textData += '数据内容：\n'
        
        // 将表格数据转换为文本
        if (Array.isArray(sheet.data) && sheet.data.length > 0) {
          sheet.data.forEach((row: any[], rowIndex: number) => {
            if (Array.isArray(row) && row.length > 0) {
              const rowText = row.map(cell => String(cell || '')).join(' | ')
              textData += `行${rowIndex + 1}: ${rowText}\n`
            }
          })
        }
        textData += '\n'
      })

      return {
        type: 'excel',
        rawData: textData,
        structuredData: jsonData,
      }
    } catch (error: any) {
      console.error('Excel parsing error:', error)
      throw new Error(`解析Excel表格失败: ${error.message}`)
    }
  }

  /**
   * 检测文档类型
   */
  private detectDocumentType(fileType: string, fileName?: string): 'image' | 'pdf' | 'word' | 'excel' {
    const lowerFileName = fileName?.toLowerCase() || ''
    
    // 图片类型
    if (fileType.startsWith('image/') || 
        lowerFileName.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)) {
      return 'image'
    }
    
    // PDF类型
    if (fileType === 'application/pdf' || lowerFileName.endsWith('.pdf')) {
      return 'pdf'
    }
    
    // Word类型
    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileType === 'application/msword' ||
        lowerFileName.endsWith('.docx') ||
        lowerFileName.endsWith('.doc')) {
      return 'word'
    }
    
    // Excel类型
    if (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        fileType === 'application/vnd.ms-excel' ||
        lowerFileName.endsWith('.xlsx') ||
        lowerFileName.endsWith('.xls')) {
      return 'excel'
    }
    
    // 默认根据fileType判断
    if (fileType === 'word') return 'word'
    if (fileType === 'excel') return 'excel'
    if (fileType === 'pdf') return 'pdf'
    
    return 'image' // 默认
  }
}

export const documentParser = new DocumentParser()

