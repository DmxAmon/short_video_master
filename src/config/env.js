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

// 根据当前域名选择API基础URL
const apiBaseUrl = currentHostname === 'fs.dy2bcsm.cn' 
  ? 'https://fsbk.dy2bcsm.cn/api'  // 错误域名时使用硬编码的完整URL
  : '/api';                        // 正确域名时使用相对路径

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
    isIncorrectDomain: currentHostname === 'fs.dy2bcsm.cn'
  }
}; 