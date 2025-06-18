/**
 * API配置钩子
 * 提供API URL和请求头配置
 */
import { ref, inject } from 'vue';

export function useApiConfig() {
  // 尝试从全局配置中获取基础URL，如果不存在则使用默认值
  const baseApiUrl = ref(inject('baseApiUrl', 'https://api.example.com'));
  
  /**
   * 获取完整的API URL
   * @param {string} path API路径
   * @returns {string} 完整URL
   */
  const getApiUrl = (path) => {
    return `${baseApiUrl.value}${path}`;
  };
  
  /**
   * 获取API请求头
   * @returns {Object} 请求头对象
   */
  const getHeaders = () => {
    // TODO: 可以在这里添加授权令牌等信息
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  };
  
  return {
    baseApiUrl,
    getApiUrl,
    getHeaders
  };
} 