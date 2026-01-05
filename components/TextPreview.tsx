'use client'

import { useEffect, useRef, useState } from 'react'
import { Card } from './ui/card'

interface TextPreviewProps {
  text: string
  highlightText?: string // 要高亮的文本
  onHighlight?: (position: number) => void // 高亮位置回调
}

export function TextPreview({ text, highlightText, onHighlight }: TextPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const highlightRef = useRef<HTMLSpanElement>(null)
  const [highlightedText, setHighlightedText] = useState<string>('')

  // 高亮文本
  useEffect(() => {
    if (!highlightText || !text) {
      setHighlightedText(text)
      return
    }

    // 清理高亮文本，移除多余空格和换行
    const cleanHighlight = highlightText.trim().replace(/\s+/g, ' ')
    
    // 转义特殊字符用于正则表达式
    const escapedText = cleanHighlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    
    // 创建高亮标记（不区分大小写，全局匹配）
    const regex = new RegExp(`(${escapedText})`, 'gi')
    const parts = text.split(regex)
    
    // 构建高亮后的 HTML
    let highlightIndex = 0
    const highlighted = parts.map((part, index) => {
      if (part.match(regex)) {
        highlightIndex++
        const isFirst = highlightIndex === 1
        return `<mark class="bg-orange-300 text-orange-900 px-1 rounded transition-all duration-300 ${
          isFirst ? 'ring-2 ring-orange-500' : ''
        }" data-highlight="true" data-highlight-index="${highlightIndex}">${part}</mark>`
      }
      return part
    }).join('')
    
    setHighlightedText(highlighted)
  }, [text, highlightText])

  // 滚动到高亮位置
  useEffect(() => {
    if (highlightText && containerRef.current) {
      // 等待 DOM 更新
      setTimeout(() => {
        // 优先滚动到第一个高亮元素
        const firstHighlight = containerRef.current?.querySelector('[data-highlight-index="1"]')
        const anyHighlight = containerRef.current?.querySelector('[data-highlight="true"]')
        const highlightElement = firstHighlight || anyHighlight
        
        if (highlightElement) {
          highlightElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest',
          })
          
          // 触发高亮动画
          highlightElement.classList.add('animate-pulse')
          setTimeout(() => {
            highlightElement.classList.remove('animate-pulse')
          }, 2000)
          
          if (onHighlight) {
            const position = text.indexOf(highlightText.trim())
            onHighlight(position >= 0 ? position : 0)
          }
        }
      }, 150)
    }
  }, [highlightText, text, onHighlight])

  if (!text) {
    return (
      <Card className="flex items-center justify-center h-full min-h-[400px]">
        <p className="text-muted-foreground">暂无文档内容</p>
      </Card>
    )
  }

  return (
    <Card className="relative overflow-hidden h-full">
      <div
        ref={containerRef}
        className="overflow-auto p-6 text-sm leading-relaxed"
        style={{ maxHeight: 'calc(100vh - 200px)' }}
      >
        <div
          className="whitespace-pre-wrap break-words"
          dangerouslySetInnerHTML={{ __html: highlightedText }}
        />
        <span ref={highlightRef} className="hidden" />
      </div>
    </Card>
  )
}

