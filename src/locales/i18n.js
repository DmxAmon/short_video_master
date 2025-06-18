/*
 * @Version    : v1.00
 * @Author     : Amon
 * @Date       : 2025-02-21 13:57
 * @LastAuthor : Amon
 * @LastTime   : 2025-02-23 16:35
 * @desc       : 国际化文案
 */

import { createI18n } from 'vue-i18n';
import en from './en.json';
import zh from './zh.json';
import ja from './ja.json';

// 创建i18n实例
export const i18n = createI18n({
  locale: 'zh',
  allowComposition: true, // 占位符支持
  messages: {
    en: en,
    zh: zh,
    ja: ja,
  },
});

// 检查是否在飞书环境中
let isInLarkEnvironment = false;
try {
  isInLarkEnvironment = window.self !== window.top;
} catch (e) {
  isInLarkEnvironment = false;
}

// 如果在飞书环境中，动态获取语言设置
if (isInLarkEnvironment) {
  // 动态导入飞书SDK
  import('@lark-base-open/js-sdk').then(({ bitable }) => {
    bitable.bridge.getLanguage().then((lang) => {
      i18n.global.locale = lang;
    }).catch(() => {
      console.warn('获取飞书语言失败，使用默认中文');
    });
  }).catch(() => {
    console.warn('加载飞书SDK失败，使用默认中文');
  });
}
