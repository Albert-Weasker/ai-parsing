import axios from 'axios'

interface QwenPlusResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

export class QwenPlusService {
  private apiKey: string
  private apiBase: string

  constructor() {
    this.apiKey = process.env.QWEN_API_KEY || ''
    this.apiBase = process.env.QWEN_API_BASE || 'https://dashscope.aliyuncs.com/compatible-mode/v1'
  }

  /**
   * 将解析结果与模板字段绑定，输出JSON格式
   * @param extractedData 解析出的原始数据（文本或结构化数据）
   * @param templateFields 模板字段列表
   * @returns 绑定后的JSON对象，字段名对应准确值，多个值用英文逗号分开
   */
  async bindFieldsToTemplate(
    extractedData: string | Record<string, any>,
    templateFields: Array<{ id: string; name: string; type: string; allowMultiple?: boolean; prompt?: string }>
  ): Promise<Record<string, string>> {
    try {
      // 准备字段描述
      const fieldsDescription = templateFields.map(field => {
        const typeDesc = this.getTypeDescription(field.type)
        const multipleDesc = field.allowMultiple ? '（可能有多值，请全部提取，用英文逗号分隔）' : ''
        const promptDesc = field.prompt ? `\n  提取说明：${field.prompt}` : ''
        return `- "${field.name}": ${typeDesc}${multipleDesc}${promptDesc}`
      }).join('\n')

      // 准备提取的数据描述
      let dataDescription = ''
      if (typeof extractedData === 'string') {
        dataDescription = extractedData
      } else {
        dataDescription = JSON.stringify(extractedData, null, 2)
      }

      const prompt = `你是一个文档解析助手。请从以下解析结果中提取并匹配模板字段的值。

模板字段列表：
${fieldsDescription}

解析结果：
${dataDescription}

要求：
1. 仔细分析解析结果，准确匹配每个字段的值
2. 如果某个字段在解析结果中找不到，该字段值为空字符串
3. 如果字段允许多值（标注了"可能有多值"），请提取所有匹配的值，用英文逗号分隔
4. 只返回准确的、确定的值，不要猜测
5. 输出格式必须是纯JSON对象，字段名使用模板中的字段名

请直接返回JSON，格式如下：
{
  "字段名1": "值1",
  "字段名2": "值2,值3",
  "字段名3": ""
}`

      const response = await axios.post<QwenPlusResponse>(
        `${this.apiBase}/chat/completions`,
        {
          model: 'qwen-plus',
          messages: [
            {
              role: 'user',
              content: prompt
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

      const content = response.data.choices[0]?.message?.content || '{}'
      
      // 解析JSON响应
      let result: Record<string, string> = {}
      try {
        result = JSON.parse(content)
      } catch (e) {
        // 如果解析失败，尝试提取JSON部分
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0])
        } else {
          console.error('Failed to parse Qwen-Plus response:', content)
          throw new Error('无法解析AI返回的JSON格式')
        }
      }

      // 确保所有字段都有值（即使为空字符串）
      const finalResult: Record<string, string> = {}
      templateFields.forEach(field => {
        finalResult[field.name] = result[field.name] || ''
      })

      return finalResult
    } catch (error: any) {
      console.error('Qwen-Plus API Error:', error)
      throw new Error(`字段绑定失败: ${error.message || '未知错误'}`)
    }
  }

  private getTypeDescription(type: string): string {
    const typeMap: Record<string, string> = {
      'text': '文本类型',
      'number': '数字类型',
      'date': '日期类型',
      'select': '选择类型',
      'multi-select': '多选类型',
      'array': '数组类型',
    }
    return typeMap[type] || '文本类型'
  }
}

export const qwenPlusService = new QwenPlusService()


