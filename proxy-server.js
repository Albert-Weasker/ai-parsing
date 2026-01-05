#!/usr/bin/env node

/**
 * 简单的 HTTP 服务器
 * 在 9872 端口提供一个 HTML 页面，用 iframe 嵌入 https://ai-parsing.vercel.app/
 */

const http = require('http');
const path = require('path');

const LOCAL_PORT = 9872;
const TARGET_URL = 'https://ai-parsing.vercel.app/';

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>智能文档解析系统</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        html, body {
            width: 100%;
            height: 100%;
            overflow: hidden;
        }
        iframe {
            width: 100%;
            height: 100%;
            border: none;
        }
    </style>
</head>
<body>
    <iframe src="${TARGET_URL}" frameborder="0" allowfullscreen></iframe>
</body>
</html>`;

const server = http.createServer((req, res) => {
  // 只处理 GET 请求，返回 HTML
  if (req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache'
    });
    res.end(html);
  } else {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
  }
});

// 启动服务器
server.listen(LOCAL_PORT, () => {
  console.log('='.repeat(60));
  console.log(`服务器已启动`);
  console.log(`访问地址: http://localhost:${LOCAL_PORT}`);
  console.log(`目标网站: ${TARGET_URL}`);
  console.log('='.repeat(60));
  console.log('按 Ctrl+C 停止服务器');
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});
