/*
 * @Version    : v1.00
 * @Author     : Amon
 * @Date       : 2024-06-21 11:48
 * @LastAuthor : Amon
 * @LastTime   : 2025-02-25 17:23
 * @desc       :
 */

import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import fs from 'node:fs';
import path from 'node:path';

// 自动导入组件
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';

import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';

// https://vitejs.dev/config/
export default defineConfig({
   base: process.env.NODE_ENV === 'production' 
     ? '/short_video_master/'  // GitHub Pages 需要仓库名作为base路径
     : './',
  server: {
    host: '0.0.0.0', // 允许局域网内其他设备访问
    port: 5173,
    strictPort: true, // 如果端口被占用，不自动尝试下一个端口
    hmr: true, //启动热更新，就是更改了代码自动刷新页面
    // open: true, //代表vite项目在启动时自动打开浏览器
    https: {
      // 生成自签名证书或使用已有证书
      cert: fs.readFileSync(path.resolve(__dirname, './cert/cert.pem')),
      key: fs.readFileSync(path.resolve(__dirname, './cert/key.pem')),
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Security-Policy': "frame-ancestors 'self' https://*.feishu.cn https://*.larksuite.com;"
    },
    proxy: {
      '/api': {
        target: 'https://fsbk.dy2bcsm.cn', // 指向后端真实API地址
        changeOrigin: true, // 允许跨域
        secure: false, // 忽略安全证书
        rewrite: (path) => {
          console.log('代理请求路径:', path);
          return path; // 不修改路径，因为后端也有/api路径
        },
        headers: {
          'Host': 'fsbk.dy2bcsm.cn', // 设置正确的Host头
          'Origin': 'https://fsbk.dy2bcsm.cn',
          'Referer': 'https://fsbk.dy2bcsm.cn'
        },
        onProxyReq: (proxyReq, req, res) => {
          // 在代理请求发送前记录信息
          console.log('代理请求:', req.method, req.url, '到', proxyReq.host);
        },
        onProxyRes: (proxyRes, req, res) => {
          // 在代理响应返回时记录信息
          console.log('代理响应:', proxyRes.statusCode, req.url);
        }
      },
    },
  },
  plugins: [
    vue(),

    AutoImport({
      imports: ['vue', 'vue-router', 'pinia'],
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
