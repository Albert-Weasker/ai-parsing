'use client'

import { useState } from 'react'
import { Template, TemplateSection } from '@/types/template'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Button } from './ui/button'
import { ConfirmDialog } from './ConfirmDialog'
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight, Folder, FileText, Download } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

interface TemplateListProps {
  templates: Template[]
  onSelect: (template: Template) => void
  onEdit: (template: Template) => void
  onDelete: (templateId: string) => void
  onRefresh: () => void
}

export function TemplateList({
  templates,
  onSelect,
  onEdit,
  onDelete,
  onRefresh,
}: TemplateListProps) {
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set())
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    templateId: string
    templateName: string
  }>({
    open: false,
    templateId: '',
    templateName: '',
  })

  const toggleExpand = (templateId: string) => {
    const newExpanded = new Set(expandedTemplates)
    if (newExpanded.has(templateId)) {
      newExpanded.delete(templateId)
    } else {
      newExpanded.add(templateId)
    }
    setExpandedTemplates(newExpanded)
  }

  const handleDeleteClick = (templateId: string, templateName: string) => {
    setConfirmDialog({
      open: true,
      templateId,
      templateName,
    })
  }

  const handleDeleteConfirm = async () => {
    const { templateId, templateName } = confirmDialog
    setDeletingId(templateId)
    
    try {
      const response = await axios.delete(`/api/templates/${templateId}`)
      if (response.data.success) {
        toast.success('模板已删除')
        // 先调用onDelete更新本地状态
        onDelete(templateId)
        // 从展开列表中移除
        setExpandedTemplates(prev => {
          const newSet = new Set(prev)
          newSet.delete(templateId)
          return newSet
        })
        // 然后刷新列表确保数据同步
        await onRefresh()
      } else {
        toast.error('删除失败')
      }
    } catch (error: any) {
      console.error('Delete error:', error)
      const errorMessage = error.response?.data?.error || '删除失败'
      toast.error(errorMessage)
      // 如果删除失败，也要刷新列表以确保状态一致
      await onRefresh()
    } finally {
      setDeletingId(null)
      setConfirmDialog({ open: false, templateId: '', templateName: '' })
    }
  }

  const handleExport = (template: Template) => {
    try {
      // 准备导出的DSL数据
      const dslData = {
        name: template.name,
        description: template.description,
        category: template.category,
        version: template.version,
        sections: template.sections.map(section => ({
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
      link.download = `${template.name || 'template'}.dsl.json`
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

  if (templates.length === 0) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border border-gray-200">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="p-4 bg-gray-100 rounded-full mb-4">
            <FileText className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            暂无模板
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            点击"新增模板"创建第一个模板
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {templates.map((template) => {
          const isExpanded = expandedTemplates.has(template.id)
          const sectionCount = template.sections?.length || 0
          const totalFields = template.sections?.reduce(
            (sum, section) => sum + (section.fields?.length || 0),
            0
          ) || 0

          return (
            <Card
              key={template.id}
              className="bg-white/80 backdrop-blur-sm border border-gray-200 hover:shadow-lg transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <button
                        onClick={() => toggleExpand(template.id)}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5" />
                        ) : (
                          <ChevronRight className="h-5 w-5" />
                        )}
                      </button>
                      <CardTitle className="text-lg cursor-pointer" onClick={() => toggleExpand(template.id)}>
                        {template.name}
                      </CardTitle>
                    </div>
                    {template.description && (
                      <p className="text-sm text-gray-500 ml-7">{template.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 ml-7 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Folder className="h-3 w-3" />
                        {sectionCount} 个分组
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {totalFields} 个字段
                      </span>
                      {template.category && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                          {template.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSelect(template)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      使用
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleExport(template)}
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      title="导出模板"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(template)}
                      className="text-gray-600 hover:text-gray-700"
                      title="编辑模板"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(template.id, template.name)}
                      disabled={deletingId === template.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="删除模板"
                    >
                      {deletingId === template.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0 border-t border-gray-100">
                  <div className="space-y-4 mt-4">
                    {template.sections && template.sections.length > 0 ? (
                      template.sections.map((section: TemplateSection) => (
                        <div
                          key={section.id}
                          className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <Folder className="h-4 w-4 text-blue-600" />
                            <h4 className="font-semibold text-gray-700">{section.name}</h4>
                            <span className="text-xs text-gray-400">
                              ({section.fields?.length || 0} 个字段)
                            </span>
                          </div>
                          {section.fields && section.fields.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 ml-6">
                              {section.fields.map((field) => (
                                <div
                                  key={field.id}
                                  className="flex items-center gap-2 px-3 py-2 bg-white rounded border border-gray-200"
                                >
                                  <FileText className="h-3 w-3 text-gray-400" />
                                  <span className="text-sm text-gray-700">{field.name}</span>
                                  {field.required && (
                                    <span className="text-xs text-red-500">*</span>
                                  )}
                                  {field.allowMultiple && (
                                    <span className="text-xs text-blue-500">[多值]</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400 ml-6">暂无字段</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-400 text-center py-4">暂无分组</p>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        title="确认删除"
        description={`确定要删除模板"${confirmDialog.templateName}"吗？此操作不可恢复。`}
        confirmText="删除"
        cancelText="取消"
        onConfirm={handleDeleteConfirm}
        variant="destructive"
      />
    </>
  )
}
