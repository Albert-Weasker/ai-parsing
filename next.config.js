/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
  },
  webpack: (config, { isServer }) => {
    // 处理服务端渲染时的模块问题
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push('mammoth', 'html2canvas', 'xlsx')
    } else {
      // 客户端：确保这些库正确加载
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
      }
    }
    
    // 处理canvas相关
    config.resolve.alias.canvas = false
    
    return config
  },
}

module.exports = nextConfig
