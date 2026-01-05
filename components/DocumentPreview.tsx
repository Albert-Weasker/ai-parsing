'use client'

import { useState, useEffect } from 'react'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { ZoomIn, ZoomOut, RotateCw } from 'lucide-react'

interface DocumentPreviewProps {
  imageUrl?: string
  imageBase64?: string
  highlightBox?: {
    x: number
    y: number
    width: number
    height: number
    page?: number
  }
  onPositionClick?: (x: number, y: number) => void
}

export function DocumentPreview({
  imageUrl,
  imageBase64,
  highlightBox,
  onPositionClick,
}: DocumentPreviewProps) {
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [imageSrc, setImageSrc] = useState<string>('')

  useEffect(() => {
    if (imageBase64) {
      setImageSrc(`data:image/jpeg;base64,${imageBase64}`)
    } else if (imageUrl) {
      setImageSrc(imageUrl)
    }
  }, [imageUrl, imageBase64])

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3))
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5))
  const handleRotate = () => setRotation(prev => (prev + 90) % 360)

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onPositionClick) {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = (e.clientX - rect.left) / scale
      const y = (e.clientY - rect.top) / scale
      onPositionClick(x, y)
    }
  }

  if (!imageSrc) {
    return (
      <Card className="flex items-center justify-center h-full min-h-[400px]">
        <p className="text-muted-foreground">暂无文档预览</p>
      </Card>
    )
  }

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-2 right-2 z-10 flex gap-2 bg-white/90 backdrop-blur-sm rounded-md p-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomOut}
          disabled={scale <= 0.5}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-sm px-2 py-1">{Math.round(scale * 100)}%</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomIn}
          disabled={scale >= 3}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleRotate}>
          <RotateCw className="h-4 w-4" />
        </Button>
      </div>

      <div
        className="overflow-auto p-4"
        style={{ maxHeight: 'calc(100vh - 200px)' }}
        onClick={handleImageClick}
      >
        <div
          className="relative mx-auto"
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
            transformOrigin: 'top left',
          }}
        >
          <img
            src={imageSrc}
            alt="Document preview"
            className="max-w-full h-auto"
            style={{ display: 'block' }}
          />
          {highlightBox && (
            <div
              className="absolute border-2 border-blue-500 bg-blue-500/20 pointer-events-none"
              style={{
                left: `${highlightBox.x}px`,
                top: `${highlightBox.y}px`,
                width: `${highlightBox.width}px`,
                height: `${highlightBox.height}px`,
              }}
            />
          )}
        </div>
      </div>
    </Card>
  )
}


