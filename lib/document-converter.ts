import * as XLSX from 'xlsx'

export interface ConvertedDocument {
  type: 'image' | 'text' | 'table'
  content: string // base64 image or text content
  pages?: number
  metadata?: {
    fileName: string
    fileType: string
    fileSize: number
  }
}

// 注意：mammoth 和 html2canvas 仅在客户端使用
// 使用动态导入确保只在客户端加载

/**
 * 将Word文档转换为图片（客户端）
 */
export async function convertWordToImage(file: File): Promise<ConvertedDocument> {
  if (typeof window === 'undefined') {
    throw new Error('Word转图片功能仅在客户端可用')
  }

  try {
    // 检查文件格式：mammoth 只支持 .docx，不支持旧的 .doc 格式
    const fileName = file.name.toLowerCase()
    const isDocx = fileName.endsWith('.docx') || 
                   file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    
    if (!isDocx && fileName.endsWith('.doc')) {
      throw new Error('暂不支持 .doc 格式，请使用 .docx 格式的 Word 文档')
    }
    
    // 动态导入mammoth（仅在客户端）
    const mammothModule = await import('mammoth')
    const mammoth = mammothModule.default

    const arrayBuffer = await file.arrayBuffer()
    
    // 将Word转换为HTML
    const result = await mammoth.convertToHtml({ arrayBuffer })
    
    let html = result.value
    
    // 彻底清理不支持的CSS颜色函数（如oklch）
    // 使用更全面的正则表达式匹配所有可能的颜色函数
    html = html.replace(/oklch\([^)]*\)/gi, 'rgb(0, 0, 0)')
    html = html.replace(/color-mix\([^)]*\)/gi, 'rgb(0, 0, 0)')
    html = html.replace(/lab\([^)]*\)/gi, 'rgb(0, 0, 0)')
    html = html.replace(/lch\([^)]*\)/gi, 'rgb(0, 0, 0)')
    html = html.replace(/hwb\([^)]*\)/gi, 'rgb(0, 0, 0)')
    
    // 清理style属性中的不支持的CSS
    html = html.replace(/style="[^"]*oklch[^"]*"/gi, '')
    html = html.replace(/style="[^"]*color-mix[^"]*"/gi, '')
    html = html.replace(/style="[^"]*lab\([^"]*"/gi, '')
    html = html.replace(/style="[^"]*lch\([^"]*"/gi, '')
    
    // 动态导入html2canvas（仅在客户端）
    const html2canvasModule = await import('html2canvas')
    const html2canvas = html2canvasModule.default
    
    // 创建临时DOM元素
    const div = document.createElement('div')
    div.innerHTML = html
    
    // 彻底清理所有样式中的不支持的CSS函数
    const allElements = div.querySelectorAll('*')
    allElements.forEach((el: Element) => {
      const htmlEl = el as HTMLElement
      // 检查并清理style属性中的不支持的CSS
      const styleText = htmlEl.getAttribute('style') || ''
      if (styleText && (
        styleText.includes('oklch') || 
        styleText.includes('color-mix') || 
        styleText.includes('lab(') || 
        styleText.includes('lch(') ||
        styleText.includes('hwb(')
      )) {
        // 移除包含不支持CSS的style属性
        htmlEl.removeAttribute('style')
      }
      
      // 同时清理内联样式对象
      if (htmlEl.style) {
        try {
          // 获取所有样式属性并检查
          const style = htmlEl.style
          const styleStr = style.cssText || ''
          if (styleStr.includes('oklch') || styleStr.includes('color-mix') || 
              styleStr.includes('lab(') || styleStr.includes('lch(') || styleStr.includes('hwb(')) {
            htmlEl.style.cssText = ''
          }
        } catch (e) {
          // 如果出错，直接移除style属性
          htmlEl.removeAttribute('style')
        }
      }
    })
    
    div.style.width = '210mm' // A4宽度
    div.style.padding = '20mm'
    div.style.backgroundColor = 'white'
    div.style.fontFamily = 'Arial, sans-serif'
    div.style.position = 'absolute'
    div.style.left = '-9999px'
    div.style.top = '0'
    document.body.appendChild(div)
    
    // 等待DOM渲染
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // 使用html2canvas转换为图片
    let canvas
    try {
      canvas = await html2canvas(div, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        allowTaint: true,
        onclone: (clonedDoc) => {
          // 在克隆的文档中彻底清理不支持的CSS
          const clonedDiv = clonedDoc.querySelector('div')
          if (clonedDiv) {
            // 方法1: 删除所有style标签（最激进的方法）
            const styleTags = clonedDoc.querySelectorAll('style')
            styleTags.forEach((styleTag) => {
              let styleContent = styleTag.textContent || ''
              if (styleContent.includes('oklch') || styleContent.includes('color-mix') || 
                  styleContent.includes('lab(') || styleContent.includes('lch(') || styleContent.includes('hwb(')) {
                // 直接删除包含不支持CSS的style标签
                styleTag.remove()
              } else {
                // 即使没有不支持的CSS，也清理一下
                styleContent = styleContent.replace(/[^{]*\{[^}]*oklch[^}]*\}/gi, '')
                styleContent = styleContent.replace(/[^{]*\{[^}]*color-mix[^}]*\}/gi, '')
                styleContent = styleContent.replace(/[^{]*\{[^}]*lab\([^}]*\}/gi, '')
                styleContent = styleContent.replace(/[^{]*\{[^}]*lch\([^}]*\}/gi, '')
                styleContent = styleContent.replace(/[^{]*\{[^}]*hwb\([^}]*\}/gi, '')
                styleTag.textContent = styleContent
              }
            })
            
            // 方法2: 清理所有元素的style属性
            const allElements = clonedDiv.querySelectorAll('*')
            allElements.forEach((el: Element) => {
              const htmlEl = el as HTMLElement
              const styleText = htmlEl.getAttribute('style') || ''
              
              // 如果style属性包含不支持的CSS，直接移除
              if (styleText && (
                styleText.includes('oklch') || 
                styleText.includes('color-mix') || 
                styleText.includes('lab(') || 
                styleText.includes('lch(') ||
                styleText.includes('hwb(')
              )) {
                htmlEl.removeAttribute('style')
                // 强制设置安全的颜色值
                try {
                  htmlEl.style.color = 'rgb(0, 0, 0)'
                  htmlEl.style.backgroundColor = 'transparent'
                } catch (e) {
                  // 忽略错误
                }
              }
              
              // 清理内联样式对象
              if (htmlEl.style && htmlEl.style.cssText) {
                const cssText = htmlEl.style.cssText
                if (cssText.includes('oklch') || cssText.includes('color-mix') || 
                    cssText.includes('lab(') || cssText.includes('lch(') || cssText.includes('hwb(')) {
                  // 清空样式，然后设置安全的默认值
                  htmlEl.style.cssText = ''
                  try {
                    htmlEl.style.color = 'rgb(0, 0, 0)'
                    htmlEl.style.backgroundColor = 'transparent'
                  } catch (e) {
                    // 忽略错误
                  }
                }
              }
            })
            
            // 方法3: 强制所有文本元素使用安全的颜色（防止继承的不支持颜色）
            const textElements = clonedDiv.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, li, td, th, a')
            textElements.forEach((el: Element) => {
              const htmlEl = el as HTMLElement
              try {
                // 检查计算样式，如果包含不支持的函数，强制设置
                const computedStyle = (clonedDoc.defaultView || window).getComputedStyle(htmlEl)
                const color = computedStyle.color || ''
                const bgColor = computedStyle.backgroundColor || ''
                
                if (color && (color.includes('oklch') || color.includes('color-mix') || 
                    color.includes('lab(') || color.includes('lch(') || color.includes('hwb('))) {
                  htmlEl.style.color = 'rgb(0, 0, 0)'
                }
                if (bgColor && (bgColor.includes('oklch') || bgColor.includes('color-mix') || 
                    bgColor.includes('lab(') || bgColor.includes('lch(') || bgColor.includes('hwb('))) {
                  htmlEl.style.backgroundColor = 'transparent'
                }
              } catch (e) {
                // 如果无法获取计算样式，直接设置安全值
                try {
                  htmlEl.style.color = 'rgb(0, 0, 0)'
                } catch (e2) {
                  // 忽略错误
                }
              }
            })
          }
        },
      })
    } catch (canvasError) {
      document.body.removeChild(div)
      const errorMsg = (canvasError as Error).message
      if (errorMsg.includes('oklch') || errorMsg.includes('color-mix')) {
        throw new Error(`html2canvas不支持某些CSS颜色函数，已尝试自动修复但失败。请尝试使用更简单的Word文档格式。`)
      }
      throw new Error(`html2canvas转换失败: ${errorMsg}`)
    }
    
    document.body.removeChild(div)
    
    const base64 = canvas.toDataURL('image/png').split(',')[1]
    
    return {
      type: 'image',
      content: base64,
      pages: 1,
      metadata: {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      },
    }
  } catch (error) {
    console.error('Word conversion error:', error)
    throw new Error('Word文档转换失败: ' + (error as Error).message)
  }
}

/**
 * 将Word文档转换为文本
 */
export async function convertWordToText(file: File): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('Word转文本功能仅在客户端可用')
  }

  try {
    // 动态导入mammoth（仅在客户端）
    const mammothModule = await import('mammoth')
    const mammoth = mammothModule.default

    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    return result.value
  } catch (error) {
    console.error('Word to text conversion error:', error)
    throw new Error('Word文档转文本失败')
  }
}

/**
 * 将Excel表格转换为图片（客户端）
 */
export async function convertExcelToImage(file: File): Promise<ConvertedDocument> {
  if (typeof window === 'undefined') {
    throw new Error('Excel转图片功能仅在客户端可用')
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    
    // 获取第一个工作表
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]
    
    // 转换为HTML表格
    let html = XLSX.utils.sheet_to_html(worksheet)
    
    // 清理不支持的CSS颜色函数
    html = html.replace(/oklch\([^)]+\)/gi, 'rgb(0, 0, 0)')
    html = html.replace(/color-mix\([^)]+\)/gi, 'rgb(0, 0, 0)')
    html = html.replace(/lab\([^)]+\)/gi, 'rgb(0, 0, 0)')
    html = html.replace(/lch\([^)]+\)/gi, 'rgb(0, 0, 0)')
    
    // 动态导入html2canvas（仅在客户端）
    const html2canvasModule = await import('html2canvas')
    const html2canvas = html2canvasModule.default
    
    // 创建临时DOM元素
    const div = document.createElement('div')
    div.innerHTML = html
    
    // 清理所有样式中的不支持的CSS函数
    const allElements = div.querySelectorAll('*')
    allElements.forEach((el: Element) => {
      const htmlEl = el as HTMLElement
      if (htmlEl.style) {
        const styleText = htmlEl.getAttribute('style') || ''
        if (styleText.includes('oklch') || styleText.includes('color-mix') || styleText.includes('lab') || styleText.includes('lch')) {
          htmlEl.removeAttribute('style')
        }
      }
    })
    
    div.style.width = '297mm' // A4横向宽度
    div.style.padding = '10mm'
    div.style.backgroundColor = 'white'
    div.style.fontFamily = 'Arial, sans-serif'
    div.style.fontSize = '12px'
    div.style.position = 'absolute'
    div.style.left = '-9999px'
    div.style.top = '0'
    
    // 样式化表格
    const table = div.querySelector('table')
    if (table) {
      table.style.borderCollapse = 'collapse'
      table.style.width = '100%'
      const cells = table.querySelectorAll('td, th')
      cells.forEach((cell: any) => {
        cell.style.border = '1px solid #ddd'
        cell.style.padding = '8px'
        cell.style.textAlign = 'left'
      })
    }
    
    document.body.appendChild(div)
    
    // 等待DOM渲染
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // 转换为图片
    let canvas
    try {
      canvas = await html2canvas(div, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        allowTaint: true,
        onclone: (clonedDoc) => {
          // 在克隆的文档中清理不支持的CSS
          const clonedDiv = clonedDoc.querySelector('div')
          if (clonedDiv) {
            const allElements = clonedDiv.querySelectorAll('*')
            allElements.forEach((el: Element) => {
              const htmlEl = el as HTMLElement
              if (htmlEl.style) {
                try {
                  const computedStyle = window.getComputedStyle(htmlEl)
                  const color = computedStyle.color
                  const bgColor = computedStyle.backgroundColor
                  
                  if (color && (color.includes('oklch') || color.includes('color-mix'))) {
                    htmlEl.style.color = 'rgb(0, 0, 0)'
                  }
                  if (bgColor && (bgColor.includes('oklch') || bgColor.includes('color-mix'))) {
                    htmlEl.style.backgroundColor = 'transparent'
                  }
                } catch (e) {
                  htmlEl.removeAttribute('style')
                }
              }
            })
          }
        },
      })
    } catch (canvasError) {
      document.body.removeChild(div)
      const errorMsg = (canvasError as Error).message
      if (errorMsg.includes('oklch') || errorMsg.includes('color-mix')) {
        throw new Error(`html2canvas不支持某些CSS颜色函数，已尝试自动修复但失败。`)
      }
      throw new Error(`html2canvas转换失败: ${errorMsg}`)
    }
    
    document.body.removeChild(div)
    
    const base64 = canvas.toDataURL('image/png').split(',')[1]
    
    return {
      type: 'image',
      content: base64,
      pages: 1,
      metadata: {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      },
    }
  } catch (error) {
    console.error('Excel conversion error:', error)
    throw new Error('Excel表格转换失败: ' + (error as Error).message)
  }
}

/**
 * 将Excel表格转换为JSON
 */
export async function convertExcelToJSON(file: File): Promise<any[]> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    
    const result: any[] = []
    
    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      result.push({
        sheetName,
        data: jsonData,
      })
    })
    
    return result
  } catch (error) {
    console.error('Excel to JSON conversion error:', error)
    throw new Error('Excel表格转JSON失败')
  }
}

/**
 * 统一文档转换接口
 */
export async function convertDocument(file: File): Promise<ConvertedDocument> {
  const fileType = file.type
  const fileName = file.name.toLowerCase()
  
  // Word文档
  if (
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileType === 'application/msword' ||
    fileName.endsWith('.docx') ||
    fileName.endsWith('.doc')
  ) {
    return await convertWordToImage(file)
  }
  
  // Excel表格
  if (
    fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    fileType === 'application/vnd.ms-excel' ||
    fileName.endsWith('.xlsx') ||
    fileName.endsWith('.xls')
  ) {
    return await convertExcelToImage(file)
  }
  
  // PDF和图片直接返回
  if (fileType === 'application/pdf' || fileType.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64 = (event.target?.result as string).split(',')[1]
        resolve({
          type: 'image',
          content: base64,
          pages: 1,
          metadata: {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
          },
        })
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }
  
  throw new Error('不支持的文件格式')
}
