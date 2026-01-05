/**
 * 测试 Word 文档读取功能
 * 使用与 page.tsx 相同的方法读取 docx 文件
 */

import * as fs from 'fs'
import * as path from 'path'

async function testDocxRead() {
  const filePath = '/Users/herchejane/ai_parsing/20251107094440911.docx'
  
  console.log('='.repeat(60))
  console.log('开始测试 Word 文档读取')
  console.log('文件路径:', filePath)
  console.log('='.repeat(60))
  
  try {
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`)
    }
    
    // 读取文件为 Buffer（Node.js 环境，相当于浏览器的 ArrayBuffer）
    const fileBuffer = fs.readFileSync(filePath)
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    )
    
    console.log('\n文件信息:')
    console.log('- 文件大小:', arrayBuffer.byteLength, 'bytes')
    console.log('- 文件大小:', (arrayBuffer.byteLength / 1024).toFixed(2), 'KB')
    
    // 验证文件头，确保是有效的 zip/docx 文件
    const uint8Array = new Uint8Array(arrayBuffer)
    if (uint8Array.length < 4 || uint8Array[0] !== 0x50 || uint8Array[1] !== 0x4B) {
      throw new Error('文件格式无效：不是有效的 .docx 文件（缺少 ZIP 文件头 PK）')
    }
    
    console.log('- 文件头验证: ✓ 有效的 ZIP/DOCX 文件')
    
    if (arrayBuffer.byteLength === 0) {
      throw new Error('文件为空，无法解析')
    }
    
    let textContent = ''
    let lastError: Error | null = null
    
    // 优先使用 mammoth（更可靠，内部有更好的错误处理）
    try {
      console.log('\n尝试使用 mammoth 提取文本...')
      const mammoth = require('mammoth')
      // 在 Node.js 环境中，需要将 ArrayBuffer 转换为 Buffer
      const buffer = Buffer.from(arrayBuffer)
      const result = await mammoth.extractRawText({ buffer })
      textContent = result.value || ''
      
      if (result.messages && result.messages.length > 0) {
        console.warn('Mammoth 警告:', result.messages)
      }
      
      console.log('✓ Mammoth 提取成功')
      console.log('- 提取的文本长度:', textContent.length, '字符')
      
      if (!textContent || textContent.trim().length === 0) {
        throw new Error('mammoth 提取的文本内容为空')
      }
    } catch (mammothError: any) {
      console.error('✗ Mammoth 提取失败:', mammothError.message)
      lastError = mammothError
      
      // 如果 mammoth 失败，尝试使用 JSZip 直接解析作为备选
      try {
        console.log('\n尝试使用 JSZip 作为备选方案...')
        const JSZip = require('jszip')
        
        // 使用更宽松的选项加载 zip，提高兼容性
        const zip = await JSZip.loadAsync(arrayBuffer, {
          checkCRC32: false, // 不检查 CRC32，提高兼容性
          createFolders: false,
        })
        
        console.log('✓ JSZip 加载成功')
        
        // 读取主文档内容
        const documentXmlFile = zip.file('word/document.xml')
        if (!documentXmlFile) {
          // 尝试查找所有文件，看看是否有其他路径
          const allFiles = Object.keys(zip.files)
          console.log('ZIP 文件中的文件列表（前10个）:')
          allFiles.slice(0, 10).forEach((file: string) => {
            console.log('  -', file)
          })
          throw new Error('document.xml not found in docx file')
        }
        
        const documentXml = await documentXmlFile.async('string')
        console.log('- document.xml 长度:', documentXml.length, '字符')
        
        // 提取所有 <w:t> 标签中的文本
        const textMatches: string[] = []
        const textTagRegex = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g
        let match
        while ((match = textTagRegex.exec(documentXml)) !== null) {
          let text = match[1]
          if (text) {
            // 移除可能嵌套的标签
            text = text.replace(/<[^>]+>/g, '')
            // 解码 XML 实体
            text = text
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&amp;/g, '&')
              .replace(/&quot;/g, '"')
              .replace(/&apos;/g, "'")
              .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
              .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
            
            if (text.trim()) {
              textMatches.push(text.trim())
            }
          }
        }
        
        // 合并所有文本，保留段落结构
        textContent = textMatches
          .filter(text => text.trim().length > 0)
          .join('\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim()
        
        console.log('✓ JSZip 提取成功')
        console.log('- 提取的文本段数:', textMatches.length)
        console.log('- 提取的文本长度:', textContent.length, '字符')
        
        if (!textContent || textContent.trim().length === 0) {
          throw new Error('JSZip 提取的文本内容为空')
        }
      } catch (zipError: any) {
        console.error('✗ JSZip 提取也失败:', zipError.message)
        const errorMsg = lastError?.message || zipError.message || '未知错误'
        throw new Error(`文档解析失败: ${errorMsg}。请确保文件是有效的 .docx 格式且未损坏。`)
      }
    }
    
    // 显示提取的文本内容（前500字符）
    console.log('\n' + '='.repeat(60))
    console.log('提取的文本内容（前500字符）:')
    console.log('='.repeat(60))
    console.log(textContent.substring(0, 500))
    if (textContent.length > 500) {
      console.log('\n... (还有', textContent.length - 500, '字符)')
    }
    
    // 统计信息
    console.log('\n' + '='.repeat(60))
    console.log('统计信息:')
    console.log('='.repeat(60))
    console.log('- 总字符数:', textContent.length)
    console.log('- 总行数:', textContent.split('\n').length)
    console.log('- 非空行数:', textContent.split('\n').filter(line => line.trim().length > 0).length)
    
    // 将文本内容编码为 base64（与 page.tsx 中的处理方式一致）
    const textBase64 = Buffer.from(textContent, 'utf-8').toString('base64')
    console.log('- Base64 编码长度:', textBase64.length, '字符')
    
    console.log('\n' + '='.repeat(60))
    console.log('✓ 测试完成：文档读取成功！')
    console.log('='.repeat(60))
    
    return {
      success: true,
      textContent,
      textBase64,
      stats: {
        length: textContent.length,
        lines: textContent.split('\n').length,
        nonEmptyLines: textContent.split('\n').filter(line => line.trim().length > 0).length,
      }
    }
    
  } catch (error: any) {
    console.error('\n' + '='.repeat(60))
    console.error('✗ 测试失败:', error.message)
    console.error('='.repeat(60))
    if (error.stack) {
      console.error('\n错误堆栈:')
      console.error(error.stack)
    }
    process.exit(1)
  }
}

// 运行测试
testDocxRead()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('未处理的错误:', error)
    process.exit(1)
  })

