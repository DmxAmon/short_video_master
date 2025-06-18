/*
 * @Version    : v1.00
 * @Author     : Amon
 * @Date       : 2025-02-21 13:57
 * @LastAuthor : Amon
 * @LastTime   : 2025-02-23 16:34
 * @desc       :
 */
import { createApp } from 'vue';
import App from './App.vue';
import router from './router'; // 导入路由配置
import 'element-plus/dist/index.css';
import './assets/main.css';
import { i18n } from './locales/i18n.js';
import ElementPlus from 'element-plus';
import zhCn from 'element-plus/dist/locale/zh-cn.mjs';
// 导入飞书多维表格SDK
import { bitable } from '@lark-base-open/js-sdk';

console.log('=== main.js 开始执行 ===');

// 检查是否在飞书环境中
let isInLarkEnvironment = false;
try {
  isInLarkEnvironment = window.self !== window.top;
} catch (e) {
  isInLarkEnvironment = false;
}

console.log('是否在飞书环境:', isInLarkEnvironment);
console.log('当前URL:', window.location.href);

// 检查是否为开发环境
const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
console.log('是否为开发环境:', isDev);

// 等待飞书SDK初始化的函数
async function waitForBitableSDK(maxWaitTime = 15000) {
  console.log('🔄 等待飞书SDK初始化...');
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    // 检查导入的bitable SDK是否可用
    const bitableLoaded = bitable && bitable.bridge && bitable.bridge.getBaseUserId;
    
    console.log('⏳ SDK初始化状态:', {
      bitable: bitable ? '已导入' : '未导入',
      bridge: (bitable && bitable.bridge) ? '已初始化' : '未初始化',
      getBaseUserId: (bitable && bitable.bridge && bitable.bridge.getBaseUserId) ? '可用' : '不可用'
    });
    
    // 如果SDK已完全初始化，就认为成功
    if (bitableLoaded) {
      console.log('✅ 飞书SDK已完全初始化');
      return true;
    }
    
    console.log('⏳ 飞书SDK尚未完全初始化，继续等待...');
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.warn('⚠️ 等待飞书SDK初始化超时');
  return false;
}

// 初始化应用的函数
async function initializeApp() {
  console.log('🚀 开始初始化应用...');
  
  // 创建应用实例
  const app = createApp(App);

  // 配置i18n
  i18n.global.locale = 'zh';

  // 如果在飞书环境中，等待SDK加载
  if (isInLarkEnvironment) {
    console.log('📱 在飞书环境中，等待SDK初始化...');
    
    const sdkLoaded = await waitForBitableSDK();
    
    if (sdkLoaded) {
      console.log('✅ 飞书SDK初始化成功，尝试获取语言设置...');
      try {
        // 使用导入的bitable对象
        const lang = await bitable.bridge.getLanguage();
        console.log('飞书语言设置:', lang);
        
        // 设置飞书返回的语言，但如果不是中文相关语言，则仍使用中文
        const _isZh = lang === 'zh' || lang === 'zh-HK' || lang === 'zh-TW';
        if (_isZh) {
          i18n.global.locale = lang;
          console.log('设置语言为:', lang);
        } else {
          console.log('使用默认中文语言');
        }
      } catch (err) {
        console.warn('获取飞书语言失败:', err);
      }
    } else {
      console.warn('⚠️ 飞书SDK初始化失败，使用默认配置');
    }
  } else {
    console.log('🌐 不在飞书环境中，使用默认配置');
  }

  // 设置Element Plus
  app.use(ElementPlus, {
    locale: zhCn, // 始终使用中文
  });

  // 使用路由
  app.use(router);

  // 挂载应用
  app.use(i18n);
  
  console.log('🎯 挂载Vue应用到DOM...');
  app.mount('#app');
  
  console.log('✅ 应用初始化完成');
}

// 启动应用
initializeApp().catch(error => {
  console.error('❌ 应用初始化失败:', error);
});
