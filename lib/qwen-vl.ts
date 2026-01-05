import axios from 'axios'

interface QwenVLResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

export class QwenVLService {
  private apiKey: string
  private apiBase: string

  constructor() {
    this.apiKey = process.env.QWEN_API_KEY || ''
    this.apiBase = process.env.QWEN_API_BASE || 'https://dashscope.aliyuncs.com/compatible-mode/v1'
  }

  async extractFromImage(
    imageBase64: string,
    prompt: string,
    fieldName: string
  ): Promise<{
    value: any
    confidence: number
    candidates?: Array<{
      value: any
      confidence: number
      context: string
    }>
  }> {
    try {
      const response = await axios.post<QwenVLResponse>(
        `${this.apiBase}/chat/completions`,
        {
          model: 'qwen-vl-max',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${imageBase64}`
                  }
                },
                {
                  type: 'text',
                  text: prompt
                }
              ]
            }
          ],
          temperature: 0.1,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      )

      const content = response.data.choices[0]?.message?.content || ''
      
      // 解析返回内容，提取值和置信度
      return this.parseResponse(content, fieldName)
    } catch (error) {
      console.error('Qwen-VL API Error:', error)
      throw error
    }
  }

  async extractMultipleFields(
    imageBase64: string,
    fields: Array<{ name: string; prompt: string; allowMultiple?: boolean }>
  ): Promise<Record<string, any>> {
    const combinedPrompt = fields.map(f => 
      `字段"${f.name}": ${f.prompt}${f.allowMultiple ? '（可能有多值，请全部提取）' : ''}`
    ).join('\n')

    const fullPrompt = `请从图片中提取以下字段信息，以JSON格式返回：
${combinedPrompt}

返回格式：
{
  "字段名": {
    "value": "值或数组",
    "confidence": 0.95,
    "candidates": [{"value": "...", "confidence": 0.9, "context": "..."}]
  }
}`

    try {
      const response = await axios.post<QwenVLResponse>(
        `${this.apiBase}/chat/completions`,
        {
          model: 'qwen-vl-max',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${imageBase64}`
                  }
                },
                {
                  type: 'text',
                  text: fullPrompt
                }
              ]
            }
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      )

      const content = response.data.choices[0]?.message?.content || ''
      return JSON.parse(content)
    } catch (error) {
      console.error('Qwen-VL Multi-field Extraction Error:', error)
      throw error
    }
  }

  private parseResponse(content: string, fieldName: string): {
    value: any
    confidence: number
    candidates?: Array<{
      value: any
      confidence: number
      context: string
    }>
  } {
    // 尝试解析JSON
    try {
      const json = JSON.parse(content)
      return {
        value: json.value || json,
        confidence: json.confidence || 0.9,
        candidates: json.candidates,
      }
    } catch {
      // 如果不是JSON，直接返回文本
      return {
        value: content.trim(),
        confidence: 0.8,
      }
    }
  }
}

export const qwenVLService = new QwenVLService()


