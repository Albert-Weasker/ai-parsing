'use client'

import { useState, useEffect } from 'react'
import { TemplateBuilder } from '@/components/TemplateBuilder'
import { TemplateList } from '@/components/TemplateList'
import { ExtractionResults } from '@/components/ExtractionResults'
import { DocumentPreview } from '@/components/DocumentPreview'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Template, ExtractionResult } from '@/types/template'
import { Upload, FileText, Settings, Sparkles, X, FileSpreadsheet, File, Plus } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { convertDocument } from '@/lib/document-converter'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'template' | 'extract'>('template')
  const [templateMode, setTemplateMode] = useState<'list' | 'edit' | 'create'>('list')
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [documentImage, setDocumentImage] = useState<string>('') // 用于预览的图片（base64）
  const [documentRawData, setDocumentRawData] = useState<string>('') // 原始文件base64（用于解析）
  const [documentText, setDocumentText] = useState<string>('') // 文档文本内容（用于文本预览和高亮）
  const [documentFileName, setDocumentFileName] = useState<string>('')
  const [documentType, setDocumentType] = useState<string>('')
  const [extractionResults, setExtractionResults] = useState<
    Record<string, ExtractionResult>
  >({})
  const [isExtracting, setIsExtracting] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [filledValues, setFilledValues] = useState<Record<string, any>>({})

  // 加载模板列表
  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      const response = await axios.get('/api/templates')
      if (response.data.success) {
        const loadedTemplates = response.data.data || []
        setTemplates(loadedTemplates)
        // 如果当前选中的模板已被删除，清空选择
        if (currentTemplate && !loadedTemplates.find((t: Template) => t.id === currentTemplate.id)) {
          setCurrentTemplate(null)
        }
      } else {
        console.error('Failed to load templates: API returned success=false')
        toast.error('加载模板列表失败')
      }
    } catch (error: any) {
      console.error('Failed to load templates:', error)
      toast.error(error.response?.data?.error || '加载模板列表失败')
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      console.log('No file selected')
      return
    }

    console.log('File selected:', file.name, file.type, file.size)

    // 检查文件类型
    const validTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ]
    
    const fileName = file.name.toLowerCase()
    const fileType = file.type
    const isValidType = validTypes.includes(fileType) ||
      fileName.endsWith('.docx') ||
      fileName.endsWith('.doc') ||
      fileName.endsWith('.xlsx') ||
      fileName.endsWith('.xls')

    if (!isValidType) {
      toast.error('不支持的文件类型，请上传图片、PDF、Word或Excel文件')
      console.log('Invalid file type:', fileType, fileName)
      return
    }

    // 检查文件大小 (100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast.error('文件大小不能超过100MB')
      return
    }

    console.log('Starting file conversion...')
    setIsConverting(true)
    
    // 重置文件输入，允许重复选择同一文件
    e.target.value = ''

    // 处理图片和PDF
    if (fileType.startsWith('image/') || fileType === 'application/pdf') {
      console.log('Processing image/PDF file')
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const base64 = (event.target?.result as string).split(',')[1]
          setDocumentImage(base64)
          setDocumentRawData(base64) // 图片和PDF使用同一个base64
          setDocumentFileName(file.name)
          setDocumentType(fileType.startsWith('image/') ? 'image' : 'pdf')
          setActiveTab('extract')
          setIsConverting(false)
          toast.success('文档上传成功')
          console.log('Image/PDF uploaded successfully')
        } catch (error) {
          console.error('Error processing image/PDF:', error)
          toast.error('文件处理失败')
          setIsConverting(false)
        }
      }
      reader.onerror = (error) => {
        console.error('FileReader error:', error)
        toast.error('文件读取失败')
        setIsConverting(false)
      }
      reader.readAsDataURL(file)
      return // 提前返回，避免执行 finally
    }
    // 处理Word文档
    else if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileType === 'application/msword' ||
      fileName.endsWith('.docx') ||
      fileName.endsWith('.doc')
    ) {
      try {
        console.log('Processing Word file')
        console.log('File name:', fileName)
        console.log('File type:', fileType)
        
        // 优先使用 file.arrayBuffer()，如果失败再使用 FileReader
        let arrayBuffer: ArrayBuffer
        try {
          // 直接使用 file.arrayBuffer()，这是最可靠的方法
          arrayBuffer = await file.arrayBuffer()
          console.log('Using file.arrayBuffer(), file size:', arrayBuffer.byteLength)
        } catch (arrayBufferError) {
          console.warn('file.arrayBuffer() failed, trying FileReader:', arrayBufferError)
          // 如果失败，使用 FileReader 作为备选
          arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => {
              if (e.target?.result instanceof ArrayBuffer) {
                resolve(e.target.result)
              } else {
                reject(new Error('文件读取失败：无法获取 ArrayBuffer'))
              }
            }
            reader.onerror = () => reject(new Error('文件读取失败'))
            reader.readAsArrayBuffer(file)
          })
          console.log('Using FileReader, file size:', arrayBuffer.byteLength)
        }
        
        console.log('Extracting text from Word document, file size:', arrayBuffer.byteLength)
        console.log('Original file size:', file.size)
        
        // 验证文件大小是否匹配
        if (arrayBuffer.byteLength !== file.size) {
          console.warn(`警告：读取的文件大小 (${arrayBuffer.byteLength}) 与原始文件大小 (${file.size}) 不匹配`)
        }
        
        // 验证文件头，确保是有效的 zip/docx 文件
        const uint8Array = new Uint8Array(arrayBuffer)
        console.log('File header bytes:', Array.from(uint8Array.slice(0, 4)).map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(' '))
        
        if (uint8Array.length < 4) {
          throw new Error(`文件格式无效：文件太小 (${uint8Array.length} bytes)，无法验证文件头`)
        }
        
        // 检测文件格式
        const headerBytes = Array.from(uint8Array.slice(0, 4))
        const isDocx = headerBytes[0] === 0x50 && headerBytes[1] === 0x4B // ZIP 格式 (PK)
        const isOldDoc = headerBytes[0] === 0xD0 && headerBytes[1] === 0xCF && headerBytes[2] === 0x11 && headerBytes[3] === 0xE0 // OLE2 格式
        
        if (isOldDoc) {
          // 检测到旧的 .doc 格式
          const headerHex = Array.from(uint8Array.slice(0, 4)).map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(' ')
          const errorMsg = `检测到旧的 .doc 格式文件（文件头: ${headerHex}）。\n\n本系统仅支持 .docx 格式（Office 2007+）。\n\n解决方法：\n1. 使用 Microsoft Word 打开文件\n2. 点击"文件" -> "另存为"\n3. 选择文件类型为"Word 文档 (*.docx)"\n4. 保存后重新上传\n\n或者使用 LibreOffice、WPS Office 等软件进行转换。`
          toast.error(errorMsg.split('\n')[0]) // 只显示第一行在 toast 中
          throw new Error(errorMsg)
        }
        
        if (!isDocx) {
          const headerHex = Array.from(uint8Array.slice(0, 4)).map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(' ')
          throw new Error(`文件格式无效：不是有效的 .docx 文件（缺少 ZIP 文件头 PK）。实际文件头: ${headerHex}。请确保文件是有效的 .docx 格式。`)
        }
        
        if (arrayBuffer.byteLength === 0) {
          throw new Error('文件为空，无法解析')
        }
        
        let textContent = ''
        let lastError: Error | null = null
        
        // 优先使用 mammoth（更可靠，内部有更好的错误处理）
        try {
          console.log('Using mammoth to extract text from docx...')
          const mammothModule = await import('mammoth')
          const mammoth = mammothModule.default
          const result = await mammoth.extractRawText({ arrayBuffer })
          textContent = result.value || ''
          
          if (result.messages && result.messages.length > 0) {
            console.warn('Mammoth warnings:', result.messages)
          }
          
          console.log('Text extracted via mammoth, length:', textContent.length)
          
          if (!textContent || textContent.trim().length === 0) {
            throw new Error('mammoth 提取的文本内容为空')
          }
        } catch (mammothError: any) {
          console.error('Mammoth extraction failed:', mammothError)
          lastError = mammothError
          
          // 如果 mammoth 失败，尝试使用 JSZip 直接解析作为备选
          try {
            console.log('Trying JSZip as fallback...')
            const JSZip = (await import('jszip')).default
            
            // 使用更宽松的选项加载 zip，提高兼容性
            const zip = await JSZip.loadAsync(arrayBuffer, {
              checkCRC32: false, // 不检查 CRC32，提高兼容性
              createFolders: false,
            })
            
            // 读取主文档内容
            const documentXmlFile = zip.file('word/document.xml')
            if (!documentXmlFile) {
              // 尝试查找所有文件，看看是否有其他路径
              const allFiles = Object.keys(zip.files)
              console.log('Available files in zip:', allFiles.slice(0, 10))
              throw new Error('document.xml not found in docx file')
            }
            
            const documentXml = await documentXmlFile.async('string')
            console.log('document.xml loaded, length:', documentXml.length)
            
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
            
            console.log('Text extracted via JSZip fallback, length:', textContent.length, 'segments:', textMatches.length)
            
            if (!textContent || textContent.trim().length === 0) {
              throw new Error('JSZip 提取的文本内容为空')
            }
          } catch (zipError: any) {
            console.error('Both Mammoth and JSZip failed:', zipError)
            const errorMsg = lastError?.message || zipError.message || '未知错误'
            throw new Error(`文档解析失败: ${errorMsg}。请确保文件是有效的 .docx 格式且未损坏。`)
          }
        }
        
        if (!textContent || textContent.trim().length === 0) {
          throw new Error('文档内容为空或无法提取文本')
        }
        
        console.log('Text extracted successfully, length:', textContent.length)
        
        // 将文本内容编码为 base64 用于后端解析
        const textBase64 = btoa(unescape(encodeURIComponent(textContent)))
        setDocumentRawData(textBase64)
        setDocumentText(textContent) // 保存文本内容用于预览和高亮
        setDocumentFileName(file.name)
        setDocumentType('word')
        setActiveTab('extract')
        
        // 立即显示成功，不等待图片转换
        setIsConverting(false)
        toast.success('Word文档已加载，文本提取完成')
        console.log('Word text extracted successfully')
        
        // 异步转换为图片用于预览（不阻塞主流程）
        convertDocument(file)
          .then((converted) => {
            setDocumentImage(converted.content)
            console.log('Word preview image generated')
          })
          .catch((error) => {
            console.warn('Failed to generate preview image, but text extraction succeeded:', error)
            // 预览图片生成失败不影响使用，只记录警告
          })
      } catch (error: any) {
        console.error('Word conversion error:', error)
        toast.error(`Word文档处理失败: ${error.message || '未知错误'}`)
        setIsConverting(false)
      }
    }
    // 处理Excel表格
    else if (
      fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      fileType === 'application/vnd.ms-excel' ||
      fileName.endsWith('.xlsx') ||
      fileName.endsWith('.xls')
    ) {
      console.log('Processing Excel file')
      // 保存原始文件base64用于解析
      const rawReader = new FileReader()
      rawReader.onload = async (event) => {
        try {
          const rawBase64 = (event.target?.result as string).split(',')[1]
          setDocumentRawData(rawBase64)
          
          // 转换为图片用于预览
          const converted = await convertDocument(file)
          setDocumentImage(converted.content)
          setDocumentFileName(file.name)
          setDocumentType('excel')
          setActiveTab('extract')
          setIsConverting(false)
          toast.success('Excel表格已转换')
          console.log('Excel converted successfully')
        } catch (error: any) {
          console.error('Excel conversion error:', error)
          toast.error(`Excel表格转换失败: ${error.message || '未知错误'}`)
          setIsConverting(false)
        }
      }
      rawReader.onerror = (error) => {
        console.error('FileReader error:', error)
        toast.error('文件读取失败')
        setIsConverting(false)
      }
      rawReader.readAsDataURL(file)
      return // 提前返回，避免执行 finally
    }
    else {
      console.log('Unhandled file type:', fileType, fileName)
      toast.error('不支持的文件类型')
      setIsConverting(false)
    }
  }

  const handleSaveTemplate = async (template: Template) => {
    try {
      let response
      if (template.id && templates.some(t => t.id === template.id)) {
        // 更新现有模板
        response = await axios.put(`/api/templates/${template.id}`, template)
      } else {
        // 创建新模板
        response = await axios.post('/api/templates', template)
      }
      
      if (response.data.success) {
        const savedTemplate = response.data.data
        setCurrentTemplate(savedTemplate)
        await loadTemplates()
        setTemplateMode('list')
        toast.success('模板保存成功')
      }
    } catch (error: any) {
      console.error('Save template error:', error)
      toast.error(error.response?.data?.error || '保存失败')
    }
  }

  const handleImportTemplate = (template: Template) => {
    setCurrentTemplate(template)
    setTemplateMode('edit')
  }

  const handleSelectTemplate = (template: Template) => {
    setCurrentTemplate(template)
    setActiveTab('extract')
  }

  const handleEditTemplate = (template: Template) => {
    setCurrentTemplate(template)
    setTemplateMode('edit')
  }

  const handleDeleteTemplate = async (templateId: string) => {
    // 先更新本地状态，立即从列表中移除
    setTemplates(prev => prev.filter(t => t.id !== templateId))
    // 如果删除的是当前选中的模板，清空选择
    if (currentTemplate?.id === templateId) {
      setCurrentTemplate(null)
    }
  }

  const handleCreateTemplate = () => {
    setCurrentTemplate(null)
    setTemplateMode('create')
  }

  const handleCancelEdit = () => {
    setTemplateMode('list')
    setCurrentTemplate(null)
  }

  const handleExtract = async () => {
    if (!currentTemplate || !documentImage) {
      toast.error('请先上传文档并选择模板')
      return
    }

    setIsExtracting(true)
    try {
      // 根据文件类型传递正确的数据
      // 图片和PDF：使用documentImage（也是原始数据）
      // Word和Excel：使用documentRawData（原始文件base64）
      const dataToSend = (documentType === 'word' || documentType === 'excel') 
        ? documentRawData || documentImage 
        : documentImage

      const response = await axios.post('/api/extract', {
        template: currentTemplate,
        documentImage: dataToSend, // 传递用于解析的数据
        documentType, // 传递文件类型
        documentFileName, // 传递文件名
      })

      if (response.data.success) {
        setExtractionResults(response.data.data)
        // 保存文档文本内容（如果有）
        if (response.data.rawParsedData) {
          setDocumentText(response.data.rawParsedData)
        }
        toast.success('提取完成')
      }
    } catch (error: any) {
      console.error('Extract error:', error)
      toast.error(error.response?.data?.error || '提取失败，请检查API配置')
    } finally {
      setIsExtracting(false)
    }
  }

  const handleValueSelect = (fieldId: string, values: any[]) => {
    setFilledValues({
      ...filledValues,
      [fieldId]: values,
    })
  }

  const handleFill = (selectedValues: Record<string, any>) => {
    setFilledValues(selectedValues)
    toast.success('已填充到表单')
  }

  const handleRemoveDocument = () => {
    setDocumentImage('')
    setDocumentRawData('')
    setDocumentText('')
    setDocumentFileName('')
    setDocumentType('')
    setExtractionResults({})
    setFilledValues({})
    setCurrentTemplate(null)
  }

  const getFileIcon = () => {
    if (documentType === 'excel' || documentFileName.endsWith('.xlsx') || documentFileName.endsWith('.xls')) {
      return <FileSpreadsheet className="h-4 w-4 text-green-600" />
    }
    if (documentType === 'word' || documentFileName.endsWith('.docx') || documentFileName.endsWith('.doc')) {
      return <File className="h-4 w-4 text-blue-600" />
    }
    return <FileText className="h-4 w-4 text-blue-600" />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  智能文档解析系统
                </h1>
                <p className="text-sm text-gray-500">AI-Powered Document Extraction</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {documentFileName && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
                  {getFileIcon()}
                  <span className="text-sm text-blue-700 font-medium">{documentFileName}</span>
                  <button
                    onClick={handleRemoveDocument}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isConverting}
                  id="file-upload-input"
                />
                <Button 
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg"
                  disabled={isConverting}
                  onClick={(e) => {
                    e.preventDefault()
                    const input = document.getElementById('file-upload-input') as HTMLInputElement
                    input?.click()
                  }}
                >
                  {isConverting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      处理中...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      上传文档
                    </>
                  )}
                </Button>
              </label>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white/60 backdrop-blur-sm p-1 rounded-lg border border-gray-200 shadow-sm">
          <button
            onClick={() => {
              setActiveTab('template')
              setTemplateMode('list')
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-md font-medium transition-all ${
              activeTab === 'template'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Settings className="h-4 w-4" />
            模板配置
          </button>
          <button
            onClick={() => setActiveTab('extract')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-md font-medium transition-all ${
              activeTab === 'extract'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <FileText className="h-4 w-4" />
            文档解析
          </button>
        </div>

        {/* Template Tab */}
        {activeTab === 'template' && (
          <div className="space-y-6">
            {templateMode === 'list' && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-800">模板管理</h2>
                  <Button
                    onClick={handleCreateTemplate}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    新增模板
                  </Button>
                </div>
                <TemplateList
                  templates={templates}
                  onSelect={handleSelectTemplate}
                  onEdit={handleEditTemplate}
                  onDelete={handleDeleteTemplate}
                  onRefresh={loadTemplates}
                />
              </>
            )}

            {(templateMode === 'create' || templateMode === 'edit') && (
              <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">
                    {templateMode === 'create' ? '创建模板' : '编辑模板'}
                  </h2>
                  <Button variant="outline" onClick={handleCancelEdit}>
                    返回列表
                  </Button>
                </div>
                <TemplateBuilder
                  template={currentTemplate || undefined}
                  onSave={handleSaveTemplate}
                  onImport={handleImportTemplate}
                />
              </div>
            )}
          </div>
        )}

        {/* Extract Tab */}
        {activeTab === 'extract' && (
          <div className="space-y-6">
            {!documentImage ? (
              <Card className="border-2 border-dashed border-gray-300 bg-white/80 backdrop-blur-sm">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="p-4 bg-blue-100 rounded-full mb-4">
                    <Upload className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    请先上传文档
                  </h3>
                  <p className="text-sm text-gray-500 mb-4 text-center">
                    支持图片格式（JPG、PNG、WebP）、PDF、Word文档（.docx、.doc）<br />
                    和Excel表格（.xlsx、.xls）
                  </p>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isConverting}
                      id="file-upload-input-2"
                    />
                    <Button 
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                      disabled={isConverting}
                      onClick={(e) => {
                        e.preventDefault()
                        const input = document.getElementById('file-upload-input-2') as HTMLInputElement
                        input?.click()
                      }}
                    >
                      {isConverting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          处理中...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          选择文件
                        </>
                      )}
                    </Button>
                  </label>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl">选择模板并解析</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-4">
                      <select
                        className="flex-1 h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={currentTemplate?.id || ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            // 直接从本地状态中查找模板，避免API调用
                            const selectedTemplate = templates.find(t => t.id === e.target.value)
                            if (selectedTemplate) {
                              setCurrentTemplate(selectedTemplate)
                              toast.success('模板已选择')
                            } else {
                              // 如果本地找不到，尝试从API加载
                              axios.get(`/api/templates/${e.target.value}`)
                                .then(response => {
                                  if (response.data.success) {
                                    setCurrentTemplate(response.data.data)
                                    // 更新本地模板列表
                                    setTemplates(prev => {
                                      const exists = prev.find(t => t.id === response.data.data.id)
                                      if (!exists) {
                                        return [...prev, response.data.data]
                                      }
                                      return prev
                                    })
                                    toast.success('模板已选择')
                                  }
                                })
                                .catch(error => {
                                  console.error('Failed to load template:', error)
                                  toast.error(error.response?.data?.error || '加载模板失败')
                                  // 重置选择
                                  setCurrentTemplate(null)
                                })
                            }
                          } else {
                            setCurrentTemplate(null)
                          }
                        }}
                      >
                        <option value="">选择模板...</option>
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      <Button
                        onClick={handleExtract}
                        disabled={!currentTemplate || !documentImage || isExtracting}
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50"
                      >
                        {isExtracting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            解析中...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            开始解析
                          </>
                        )}
                      </Button>
                    </div>
                    {currentTemplate && (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-700">
                          <span className="font-medium">已选择模板：</span>
                          {currentTemplate.name}
                          {currentTemplate.description && (
                            <span className="text-blue-600 ml-2">
                              - {currentTemplate.description}
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {Object.keys(extractionResults).length > 0 && currentTemplate ? (
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6">
                    <ExtractionResults
                      results={extractionResults}
                      template={currentTemplate}
                      documentImage={documentImage}
                      documentText={documentText}
                      onValueSelect={handleValueSelect}
                      onFill={handleFill}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                      <DocumentPreview imageBase64={documentImage} />
                    </div>
                    <Card className="bg-white/80 backdrop-blur-sm border border-gray-200">
                      <CardContent className="flex flex-col items-center justify-center h-full min-h-[400px]">
                        <div className="text-center">
                          <div className="p-4 bg-indigo-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                            <FileText className="h-8 w-8 text-indigo-600" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-700 mb-2">
                            {currentTemplate ? '等待解析' : '请选择模板'}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {currentTemplate 
                              ? '点击"开始解析"按钮开始提取'
                              : '请先选择一个模板'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
