/**
 * @Version    : v1.00
 * @Author     : Amon
 * @Date       : 2024-05-06
 * @desc       : 环境配置
 */

// 获取当前环境
const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
const isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production';

// 获取当前域名
const currentHostname = window.location.hostname;

// 判断是否为GitHub Pages部署
const isGitHubPages = currentHostname.includes('github.io');

// 根据当前环境和域名选择API基础URL
let apiBaseUrl;

if (isGitHubPages) {
  // GitHub Pages部署时，使用完整的API URL
  apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fsbk.dy2bcsm.cn/api';
} else if (currentHostname === 'fsbk.dy2bcsm.cn') {
  // 正确的生产域名时使用相对路径
  apiBaseUrl = '/api';
} else {
  // 其他情况（如错误域名、本地开发）使用完整URL
  apiBaseUrl = 'https://fsbk.dy2bcsm.cn/api';
}

// 环境配置
export const envConfig = {
  isDevelopment,
  isProduction,
  // 后端API基础URL
  backendUrl: apiBaseUrl,
  // API URL（给axios实例使用）
  apiUrl: apiBaseUrl,
  // 当前域名信息（调试用）
  currentDomain: {
    hostname: currentHostname,
    isCorrectDomain: currentHostname === 'fsbk.dy2bcsm.cn',
    isIncorrectDomain: currentHostname === 'fs.dy2bcsm.cn',
    isGitHubPages: isGitHubPages
  }
}; 
