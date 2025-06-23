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

// 🎛️ 日志控制开关配置
const LOG_CONFIG = {
  // 是否启用日志输出（总开关）
  enabled: false,
  
  // 自定义日志级别（如果设置，会覆盖环境自动判断）
  // 可选值：'ERROR', 'WARN', 'INFO', 'DEBUG', 'OFF'
  // 设置为 null 时使用环境自动判断
  customLevel: 'DEBUG',
  
  // 特定模块的日志控制（可以单独关闭某些模块的日志）
  moduleFilters: {
    // 'AUTH': false,     // 关闭认证模块日志
    // 'API': false,      // 关闭API模块日志
    // 'ROUTER': false,   // 关闭路由模块日志
  },
  
  // 是否拦截原生console方法（控制所有console.log/warn/error输出）
  interceptConsole: true,
  
  // 允许通过的console日志关键词（即使总开关关闭，包含这些关键词的日志仍会显示）
  allowedConsoleKeywords: [
    // '错误',     // 允许错误相关日志
    // 'Error',    // 允许Error日志
    // '失败',     // 允许失败相关日志
  ]
};

// 计算当前日志级别
const getCurrentLevel = () => {
  if (!LOG_CONFIG.enabled) return -1; // 完全关闭
  
  if (LOG_CONFIG.customLevel) {
    if (LOG_CONFIG.customLevel === 'OFF') return -1;
    return LOG_LEVELS[LOG_CONFIG.customLevel] || LOG_LEVELS.ERROR;
  }
  
  // 默认：开发环境显示所有，生产环境只显示警告和错误
  return envConfig.isDevelopment ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN;
};

const CURRENT_LEVEL = getCurrentLevel();

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
  // 检查总开关
  if (!LOG_CONFIG.enabled) return;
  
  // 检查日志级别
  if (LOG_LEVELS[level] > CURRENT_LEVEL) return;
  
  // 检查模块过滤器
  if (LOG_CONFIG.moduleFilters[module] === false) return;
  
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

// 保存原始console方法
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug
};

// console拦截器
function shouldAllowConsoleLog(args) {
  // 如果日志总开关开启，允许所有日志
  if (LOG_CONFIG.enabled) {
    return true;
  }
  
  // 如果没有设置允许的关键词，直接阻止
  if (!LOG_CONFIG.allowedConsoleKeywords || LOG_CONFIG.allowedConsoleKeywords.length === 0) {
    return false;
  }
  
  // 检查日志内容是否包含允许的关键词
  const logContent = args.map(arg => 
    typeof arg === 'string' ? arg : JSON.stringify(arg)
  ).join(' ');
  
  return LOG_CONFIG.allowedConsoleKeywords.some(keyword => 
    logContent.includes(keyword)
  );
}

// 拦截console方法
function interceptConsole() {
  if (!LOG_CONFIG.interceptConsole) {
    return;
  }
  
  console.log = function(...args) {
    if (shouldAllowConsoleLog(args)) {
      originalConsole.log.apply(console, args);
    }
  };
  
  console.warn = function(...args) {
    if (shouldAllowConsoleLog(args)) {
      originalConsole.warn.apply(console, args);
    }
  };
  
  console.error = function(...args) {
    if (shouldAllowConsoleLog(args)) {
      originalConsole.error.apply(console, args);
    }
  };
  
  console.info = function(...args) {
    if (shouldAllowConsoleLog(args)) {
      originalConsole.info.apply(console, args);
    }
  };
  
  console.debug = function(...args) {
    if (shouldAllowConsoleLog(args)) {
      originalConsole.debug.apply(console, args);
    }
  };
}

// 恢复原始console方法
function restoreConsole() {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.info = originalConsole.info;
  console.debug = originalConsole.debug;
}

// 初始化console拦截
if (LOG_CONFIG.interceptConsole) {
  interceptConsole();
}

// 创建全局日志控制面板
// 只在开发环境或特定条件下暴露给用户
const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
// 检查是否有调试参数（用于生产环境远程调试）
const hasDebugParam = new URLSearchParams(window.location.search).has('debug_logs');

// 调试信息：显示环境检测结果
originalConsole.log('🔍 环境检测结果:', {
  isDevelopment,
  isLocalhost,
  hasDebugParam,
  hostname: window.location.hostname,
  search: window.location.search,
  env_DEV: import.meta.env.DEV,
  env_MODE: import.meta.env.MODE,
  shouldShowControl: isDevelopment || isLocalhost || hasDebugParam
});

// 只在开发环境、本地环境或有调试参数时暴露日志控制面板
if (isDevelopment || isLocalhost || hasDebugParam) {
  window.logControl = {
    // 开启所有日志
    enableAll() {
      LOG_CONFIG.enabled = true;
      LOG_CONFIG.interceptConsole = false;
      restoreConsole();
      originalConsole.log('✅ 已开启所有日志输出');
    },
    
    // 关闭所有日志
    disableAll() {
      LOG_CONFIG.enabled = false;
      LOG_CONFIG.interceptConsole = true;
      LOG_CONFIG.allowedConsoleKeywords = [];
      interceptConsole();
      originalConsole.log('❌ 已关闭所有日志输出');
    },
    
    // 只允许错误日志
    onlyErrors() {
      LOG_CONFIG.enabled = false;
      LOG_CONFIG.interceptConsole = true;
      LOG_CONFIG.allowedConsoleKeywords = ['错误', 'Error', 'error', '失败', 'fail', 'Failed'];
      interceptConsole();
      originalConsole.log('⚠️ 只允许错误相关日志输出');
    },
    
    // 查看当前配置
    status() {
      originalConsole.log('📊 当前日志配置:', {
        enabled: LOG_CONFIG.enabled,
        interceptConsole: LOG_CONFIG.interceptConsole,
        allowedKeywords: LOG_CONFIG.allowedConsoleKeywords,
        customLevel: LOG_CONFIG.customLevel
      });
    },
    
    // 帮助信息
    help() {
      originalConsole.log(`
📋 日志控制面板使用说明：

🟢 logControl.enableAll()    - 开启所有日志输出
🔴 logControl.disableAll()   - 关闭所有日志输出  
🟡 logControl.onlyErrors()   - 只显示错误日志
📊 logControl.status()       - 查看当前配置
❓ logControl.help()         - 显示帮助信息

当前状态: ${LOG_CONFIG.enabled ? '✅ 已开启' : '❌ 已关闭'}
      `);
    }
  };
  
  // 调试信息：确认对象是否被创建
  originalConsole.log('✅ window.logControl 对象已创建');
  originalConsole.log('🔍 验证对象存在:', typeof window.logControl);
  originalConsole.log('🔍 对象方法列表:', Object.keys(window.logControl));
  
  // 创建备用的调试函数，以防名称冲突
  window.debugLogs = window.logControl;
  window.logDebug = window.logControl;
  originalConsole.log('🔧 备用调试函数已创建: window.debugLogs 和 window.logDebug');
  
  // 显示初始化信息（仅开发环境）
  const envType = isDevelopment ? '开发模式' : (hasDebugParam ? '调试模式' : '本地模式');
  originalConsole.log(`
🎛️ 日志控制系统已初始化 (${envType})
📋 在控制台输入 logControl.help() 查看使用说明
📋 或者尝试备用命令: debugLogs.help() 或 logDebug.help()
📊 当前状态: ${LOG_CONFIG.enabled ? '✅ 日志已开启' : '❌ 日志已关闭'}
  `);
} else {
  // 生产环境下，只显示简单的初始化信息
  originalConsole.log('🎛️ 日志系统已初始化 (生产模式 - 日志已关闭)');
  originalConsole.log('💡 如需调试，请在URL后添加 ?debug_logs 参数');
}

// 全局日志记录器实例
const logger = createLogger('APP');

// 统一导出所有需要的方法和配置
export { 
  logger, 
  interceptConsole, 
  restoreConsole, 
  originalConsole,
  LOG_CONFIG
};

// 默认导出全局日志记录器
export default logger; 