'use client'

import { useState, useEffect } from 'react'
import { Template, TemplateSection, TemplateField } from '@/types/template'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Checkbox } from './ui/checkbox'
import { Plus, Trash2, Save, Download, Upload } from 'lucide-react'
import toast from 'react-hot-toast'

interface TemplateBuilderProps {
  template?: Template
  onSave: (template: Template) => void
  onExport?: (template: Template) => void
  onImport?: (template: Template) => void
}

export function TemplateBuilder({
  template,
  onSave,
  onExport,
  onImport,
}: TemplateBuilderProps) {
  const [currentTemplate, setCurrentTemplate] = useState<Template>(
    template || {
      id: '',
      name: '',
      description: '',
      category: '',
      version: 1,
      sections: [],
      createdAt: '',
      updatedAt: '',
    }
  )

  // 当template prop变化时更新状态
  useEffect(() => {
    if (template) {
      setCurrentTemplate(template)
    } else {
      setCurrentTemplate({
        id: '',
        name: '',
        description: '',
        category: '',
        version: 1,
        sections: [],
        createdAt: '',
        updatedAt: '',
      })
    }
  }, [template])

  const addSection = () => {
    const newSection: TemplateSection = {
      id: `section_${Date.now()}`,
      name: '新分组',
      fields: [],
    }
    setCurrentTemplate({
      ...currentTemplate,
      sections: [...currentTemplate.sections, newSection],
    })
  }

  const updateSection = (sectionId: string, updates: Partial<TemplateSection>) => {
    setCurrentTemplate({
      ...currentTemplate,
      sections: currentTemplate.sections.map(s =>
        s.id === sectionId ? { ...s, ...updates } : s
      ),
    })
  }

  const deleteSection = (sectionId: string) => {
    setCurrentTemplate({
      ...currentTemplate,
      sections: currentTemplate.sections.filter(s => s.id !== sectionId),
    })
  }

  const addField = (sectionId: string) => {
    const newField: TemplateField = {
      id: `field_${Date.now()}`,
      name: '新字段',
      type: 'text',
      required: false,
      extraction: {
        method: 'ai',
        prompt: '',
      },
    }
    updateSection(sectionId, {
      fields: [...(currentTemplate.sections.find(s => s.id === sectionId)?.fields || []), newField],
    })
  }

  const updateField = (sectionId: string, fieldId: string, updates: Partial<TemplateField>) => {
    const section = currentTemplate.sections.find(s => s.id === sectionId)
    if (!section) return

    setCurrentTemplate({
      ...currentTemplate,
      sections: currentTemplate.sections.map(s =>
        s.id === sectionId
          ? {
              ...s,
              fields: s.fields.map(f =>
                f.id === fieldId ? { ...f, ...updates } : f
              ),
            }
          : s
      ),
    })
  }

  const deleteField = (sectionId: string, fieldId: string) => {
    const section = currentTemplate.sections.find(s => s.id === sectionId)
    if (!section) return

    setCurrentTemplate({
      ...currentTemplate,
      sections: currentTemplate.sections.map(s =>
        s.id === sectionId
          ? { ...s, fields: s.fields.filter(f => f.id !== fieldId) }
          : s
      ),
    })
  }

  const handleExport = () => {
    try {
      // 准备导出的DSL数据
      const dslData = {
        name: currentTemplate.name,
        description: currentTemplate.description,
        category: currentTemplate.category,
        version: currentTemplate.version,
        sections: currentTemplate.sections.map(section => ({
          name: section.name,
          fields: section.fields.map(field => ({
            name: field.name,
            type: field.type,
            required: field.required,
            allowMultiple: field.allowMultiple || false,
          })),
        })),
      }

      // 创建JSON字符串
      const jsonString = JSON.stringify(dslData, null, 2)
      
      // 创建Blob
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      
      // 创建下载链接
      const link = document.createElement('a')
      link.href = url
      link.download = `${currentTemplate.name || 'template'}.dsl.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      toast.success('模板导出成功')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('导出失败')
    }
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.dsl.json,application/json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const imported = JSON.parse(text)
        
        // 验证导入的数据结构
        if (!imported.name || !imported.sections) {
          toast.error('无效的模板文件格式')
          return
        }

        // 转换导入的数据为模板格式
        const template: Template = {
          id: '',
          name: imported.name,
          description: imported.description || '',
          category: imported.category || '',
          version: imported.version || 1,
          sections: imported.sections.map((section: any, index: number) => ({
            id: `section_${Date.now()}_${index}`,
            name: section.name,
            fields: (section.fields || []).map((field: any, fieldIndex: number) => ({
              id: `field_${Date.now()}_${index}_${fieldIndex}`,
              name: field.name,
              type: field.type || 'text',
              required: field.required || false,
              allowMultiple: field.allowMultiple || false,
              extraction: {
                method: 'ai',
                prompt: field.name, // 默认使用字段名作为提示词
              },
            })),
          })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        if (onImport) {
          onImport(template)
        } else {
          setCurrentTemplate(template)
        }
        
        toast.success('模板导入成功')
      } catch (error) {
        console.error('Import error:', error)
        toast.error('导入失败：文件格式错误')
      }
    }
    input.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <Input
            placeholder="模板名称 *"
            value={currentTemplate.name}
            onChange={(e) =>
              setCurrentTemplate({ ...currentTemplate, name: e.target.value })
            }
            className="text-lg font-semibold"
          />
          <div className="flex gap-2">
            <Input
              placeholder="类别（可选）"
              value={currentTemplate.category}
              onChange={(e) =>
                setCurrentTemplate({ ...currentTemplate, category: e.target.value })
              }
              className="flex-1"
            />
          </div>
          <Textarea
            placeholder="模板描述（可选）"
            value={currentTemplate.description}
            onChange={(e) =>
              setCurrentTemplate({ ...currentTemplate, description: e.target.value })
            }
            rows={2}
          />
        </div>
        <div className="flex gap-2 ml-4">
          <Button variant="outline" onClick={handleImport}>
            <Upload className="h-4 w-4 mr-2" />
            导入
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExport}
            disabled={!currentTemplate.name.trim()}
          >
            <Download className="h-4 w-4 mr-2" />
            导出
          </Button>
          <Button 
            onClick={() => onSave(currentTemplate)}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
            disabled={!currentTemplate.name.trim()}
          >
            <Save className="h-4 w-4 mr-2" />
            保存
          </Button>
        </div>
      </div>

      {currentTemplate.sections.map((section) => (
        <Card key={section.id} className="bg-white/80 backdrop-blur-sm border border-gray-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Input
                value={section.name}
                onChange={(e) => updateSection(section.id, { name: e.target.value })}
                className="text-lg font-semibold border-none p-0 bg-transparent"
                placeholder="分组名称"
              />
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addField(section.id)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  添加字段
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteSection(section.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {section.fields.map((field) => (
              <div key={field.id} className="border rounded-lg p-4 space-y-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 grid grid-cols-2 gap-4">
                    <Input
                      placeholder="字段名称 *"
                      value={field.name}
                      onChange={(e) =>
                        updateField(section.id, field.id, { name: e.target.value })
                      }
                    />
                    <select
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={field.type}
                      onChange={(e) =>
                        updateField(section.id, field.id, {
                          type: e.target.value as TemplateField['type'],
                        })
                      }
                    >
                      <option value="text">文本</option>
                      <option value="number">数字</option>
                      <option value="date">日期</option>
                      <option value="select">选择</option>
                      <option value="multi-select">多选</option>
                      <option value="array">数组</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={field.required}
                        onChange={(e) =>
                          updateField(section.id, field.id, {
                            required: e.target.checked,
                          })
                        }
                      />
                      必填
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={field.allowMultiple}
                        onChange={(e) =>
                          updateField(section.id, field.id, {
                            allowMultiple: e.target.checked,
                          })
                        }
                      />
                      多值
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteField(section.id, field.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {/* 提示词输入框 */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <span>提取提示词</span>
                    <span className="text-xs text-gray-500 font-normal">
                      (可选：说明字段含义或位置，帮助AI更准确提取)
                    </span>
                  </label>
                  <Textarea
                    placeholder='例如：在文档的"技术参数"部分查找，或：表示电缆的额定电压值，单位是kV'
                    value={field.extraction?.prompt || ''}
                    onChange={(e) =>
                      updateField(section.id, field.id, {
                        extraction: {
                          ...field.extraction,
                          prompt: e.target.value,
                        },
                      })
                    }
                    rows={2}
                    className="text-sm"
                  />
                  <p className="text-xs text-gray-500">
                    提示：可以描述字段在文档中的位置（如"在表格第2列"、"在标题下方"）或字段的含义（如"表示产品型号"、"表示日期"），帮助AI更准确地找到对应内容。
                  </p>
                </div>
              </div>
            ))}
            {section.fields.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">
                暂无字段，点击"添加字段"开始配置
              </p>
            )}
          </CardContent>
        </Card>
      ))}

      <Button onClick={addSection} variant="outline" className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        添加分组
      </Button>
    </div>
  )
}
