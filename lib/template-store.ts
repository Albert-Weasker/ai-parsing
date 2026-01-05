// 共享的模板存储（临时方案，生产环境应使用数据库）
// 使用Map确保在模块间共享
const templatesMap = new Map<string, any>()

export function getTemplates() {
  return Array.from(templatesMap.values())
}

export function addTemplate(template: any) {
  templatesMap.set(template.id, template)
  return template
}

export function getTemplateById(id: string) {
  const template = templatesMap.get(id)
  console.log('getTemplateById:', id, template ? 'found' : 'not found')
  console.log('Current templates:', Array.from(templatesMap.keys()))
  return template || null
}

export function updateTemplate(id: string, updates: any) {
  const template = templatesMap.get(id)
  if (template) {
    const updated = { 
      ...template, 
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    templatesMap.set(id, updated)
    return updated
  }
  return null
}

export function deleteTemplate(id: string) {
  console.log('deleteTemplate called with id:', id)
  console.log('Before delete, templates:', Array.from(templatesMap.keys()))
  const result = templatesMap.delete(id)
  console.log('After delete, result:', result)
  console.log('After delete, templates:', Array.from(templatesMap.keys()))
  return result
}

// 清空所有模板（用于测试）
export function clearTemplates() {
  templatesMap.clear()
}
