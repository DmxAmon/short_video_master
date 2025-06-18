/**
 * 日志记录工具
 * 用于统一管理应用中的日志输出
 */

import { envConfig } from '../config/env';

// 日志级别
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// 当前日志级别（生产环境只显示ERROR和WARN，开发环境显示所有）
const CURRENT_LEVEL = envConfig.isDevelopment ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN;

// 日志颜色配置
const LOG_COLORS = {
  ERROR: '#ff4757',
  WARN: '#ffa502',
  INFO: '#2ed573',
  DEBUG: '#5352ed'
};

/**
 * 格式化日志消息
 * @param {string} level 日志级别
 * @param {string} module 模块名称
 * @param {string} message 日志消息
 * @param {any} data 附加数据
 */
const formatLog = (level, module, message, data) => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}][${level}][${module}]`;
  
  return {
    prefix,
    message,
    data,
    fullMessage: data ? `${prefix} ${message}` : `${prefix} ${message}`
  };
};

/**
 * 输出日志
 * @param {string} level 日志级别
 * @param {string} module 模块名称
 * @param {string} message 日志消息
 * @param {any} data 附加数据
 */
const log = (level, module, message, data) => {
  if (LOG_LEVELS[level] > CURRENT_LEVEL) {
    return; // 跳过不需要的日志级别
  }
  
  const formatted = formatLog(level, module, message, data);
  const color = LOG_COLORS[level];
  
  switch (level) {
    case 'ERROR':
      console.error(`%c${formatted.prefix}`, `color: ${color}; font-weight: bold;`, message, data || '');
      break;
    case 'WARN':
      console.warn(`%c${formatted.prefix}`, `color: ${color}; font-weight: bold;`, message, data || '');
      break;
    case 'INFO':
      console.info(`%c${formatted.prefix}`, `color: ${color}; font-weight: bold;`, message, data || '');
      break;
    case 'DEBUG':
      console.log(`%c${formatted.prefix}`, `color: ${color}; font-weight: bold;`, message, data || '');
      break;
    default:
      console.log(formatted.fullMessage, data || '');
  }
};

/**
 * 创建模块日志记录器
 * @param {string} moduleName 模块名称
 */
export const createLogger = (moduleName) => {
  return {
    error: (message, data) => log('ERROR', moduleName, message, data),
    warn: (message, data) => log('WARN', moduleName, message, data),
    info: (message, data) => log('INFO', moduleName, message, data),
    debug: (message, data) => log('DEBUG', moduleName, message, data),
    
    // 特殊方法：API请求日志
    apiRequest: (method, url, data) => {
      log('DEBUG', moduleName, `API请求: ${method.toUpperCase()} ${url}`, data);
    },
    
    apiResponse: (method, url, status, data) => {
      const level = status >= 400 ? 'ERROR' : 'DEBUG';
      log(level, moduleName, `API响应: ${method.toUpperCase()} ${url} [${status}]`, data);
    },
    
    // 特殊方法：认证相关日志
    authEvent: (event, data) => {
      log('INFO', moduleName, `认证事件: ${event}`, data);
    }
  };
};

// 默认导出全局日志记录器
export default createLogger('APP'); 