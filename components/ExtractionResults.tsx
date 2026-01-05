'use client'

import { useState } from 'react'
import { ExtractionResult, Template } from '@/types/template'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Checkbox } from './ui/checkbox'
import { Input } from './ui/input'
import { DocumentPreview } from './DocumentPreview'
import { TextPreview } from './TextPreview'
import { Eye, CheckCircle2, Download } from 'lucide-react'
import * as XLSX from 'xlsx'

interface ExtractionResultsProps {
  results: Record<string, ExtractionResult>
  template: Template
  documentImage?: string
  documentText?: string
  onValueSelect: (fieldId: string, values: any[]) => void
  onFill?: (selectedValues: Record<string, any>) => void
}

export function ExtractionResults({
  results,
  template,
  documentImage,
  documentText,
  onValueSelect,
  onFill,
}: ExtractionResultsProps) {
  const [selectedCandidates, setSelectedCandidates] = useState<
    Record<string, Set<number>>
  >({})
  const [highlightBox, setHighlightBox] = useState<{
    x: number
    y: number
    width: number
    height: number
  } | null>(null)
  const [highlightText, setHighlightText] = useState<string>('') // 要高亮的文本
  const [filledValues, setFilledValues] = useState<Record<string, any>>({})

  const handleCandidateToggle = (fieldId: string, index: number) => {
    const current = selectedCandidates[fieldId] || new Set()
    const newSet = new Set(current)
    
    if (newSet.has(index)) {
      newSet.delete(index)
    } else {
      newSet.add(index)
    }

    setSelectedCandidates({
      ...selectedCandidates,
      [fieldId]: newSet,
    })

    // 更新选中的值
    const result = results[fieldId]
    if (result) {
      const selectedValues = Array.from(newSet).map(
        (i) => result.candidates[i]?.value
      )
      onValueSelect(fieldId, selectedValues)
      
      // 更新填充值
      setFilledValues(prev => ({
        ...prev,
        [fieldId]: selectedValues.length === 1 ? selectedValues[0] : selectedValues,
      }))
    }
  }

  const handleCandidateClick = (
    fieldId: string,
    candidate: ExtractionResult['candidates'][0]
  ) => {
    // 如果有位置信息（图片），高亮图片位置
    if (candidate.position) {
      setHighlightBox(candidate.position.bbox)
    }
    
    // 如果有文本内容，高亮文本
    if (documentText && candidate.value) {
      const valueStr = String(candidate.value).trim()
      if (valueStr) {
        setHighlightText(valueStr)
      }
    }
  }

  const handleFill = () => {
    const filled: Record<string, any> = {}
    
    Object.keys(results).forEach((fieldId) => {
      const result = results[fieldId]
      const selected = selectedCandidates[fieldId] || new Set()
      
      if (selected.size > 0) {
        const values = Array.from(selected).map(
          (i) => result.candidates[i]?.value
        )
        filled[fieldId] = values.length === 1 ? values[0] : values
      } else if (result.candidates.length > 0) {
        // 如果没有选择，使用第一个候选值
        filled[fieldId] = result.candidates[0].value
      }
    })

    setFilledValues(filled)
    if (onFill) {
      onFill(filled)
    }
  }

  const handleExportExcel = () => {
    try {
      // 准备导出数据
      const exportData: any[] = []
      
      // 表头：字段名称
      const headers: string[] = []
      template.sections.forEach(section => {
        section.fields.forEach(field => {
          headers.push(field.name)
        })
      })
      exportData.push(headers)

      // 数据行：提取的值
      const row: any[] = []
      template.sections.forEach(section => {
        section.fields.forEach(field => {
          const value = filledValues[field.id] || results[field.id]?.candidates[0]?.value || ''
          row.push(Array.isArray(value) ? value.join(', ') : value)
        })
      })
      exportData.push(row)

      // 创建工作簿
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet(exportData)
      
      // 设置列宽
      const colWidths = headers.map(() => ({ wch: 20 }))
      ws['!cols'] = colWidths

      XLSX.utils.book_append_sheet(wb, ws, '提取结果')
      
      // 导出文件
      const fileName = `提取结果_${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(wb, fileName)
    } catch (error) {
      console.error('Export error:', error)
      alert('导出失败')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">提取结果</h3>
        <div className="flex gap-2">
          <Button
            onClick={handleFill}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            一键填充
          </Button>
          <Button
            onClick={handleExportExcel}
            variant="outline"
            className="border-green-500 text-green-600 hover:bg-green-50"
          >
            <Download className="h-4 w-4 mr-2" />
            导出Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 h-full">
        <div className="space-y-4 overflow-y-auto max-h-[600px]">
          {template.sections.map((section) => (
            <Card key={section.id} className="bg-white/80 backdrop-blur-sm border border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="text-blue-600">{section.name}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {section.fields.map((field) => {
                  const result = results[field.id]
                  if (!result) return null

                  return (
                    <div key={field.id} className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        {field.name}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      
                      {result.candidates.length === 0 ? (
                        <Input
                          placeholder="未找到匹配值"
                          className="bg-gray-50"
                          disabled
                        />
                      ) : (
                        <div className="space-y-2">
                          {result.candidates.map((candidate, index) => {
                            const isSelected = selectedCandidates[field.id]?.has(index) || false
                            
                            return (
                              <div
                                key={index}
                                className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                                  isSelected
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50 bg-white'
                                }`}
                                onClick={() => handleCandidateClick(field.id, candidate)}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Checkbox
                                        checked={isSelected}
                                        onChange={() => handleCandidateToggle(field.id, index)}
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                      <span className="font-medium text-gray-800">
                                        {String(candidate.value)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-gray-500 ml-6">
                                      <span>置信度: {Math.round(candidate.confidence * 100)}%</span>
                                      {candidate.position && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-2 text-xs"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setHighlightBox(candidate.position!.bbox)
                                          }}
                                        >
                                          <Eye className="h-3 w-3 mr-1" />
                                          查看位置
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      
                      {/* 显示已填充的值 */}
                      {filledValues[field.id] && (
                        <Input
                          value={Array.isArray(filledValues[field.id]) 
                            ? filledValues[field.id].join(', ') 
                            : filledValues[field.id]}
                          onChange={(e) => {
                            setFilledValues(prev => ({
                              ...prev,
                              [field.id]: e.target.value,
                            }))
                          }}
                          className="mt-2"
                        />
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="sticky top-0">
          {documentText ? (
            <TextPreview
              text={documentText}
              highlightText={highlightText}
            />
          ) : (
            <DocumentPreview
              imageBase64={documentImage}
              highlightBox={highlightBox || undefined}
            />
          )}
        </div>
      </div>
    </div>
  )
}
