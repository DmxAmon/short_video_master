/**
 * 智能认证工具
 * 提供统一的token过期处理和智能重新认证功能
 */

import { ElMessage } from 'element-plus';
import { refreshToken, initializeAuth } from '../services/auth';

// 全局状态管理
let isTokenExpiredHandled = false;

/**
 * 检查是否为token过期错误
 */
export const isTokenExpiredError = (error) => {
  // 检查HTTP状态码401
  if (error.response && error.response.status === 401) {
    return true;
  }
  
  // 检查错误信息中的关键词
  return error.message && (
    error.message.includes('Token') || 
    error.message.includes('登录') || 
    error.message.includes('过期') ||
    error.message.includes('Unauthorized') ||
    error.message.includes('401')
  );
};

/**
 * 智能token过期处理
 * @param {Object} options - 配置选项
 * @param {Function} options.onSuccess - 认证成功回调
 * @param {Function} options.onFailed - 认证失败回调
 * @param {string} options.pageName - 页面名称，用于日志
 */
export const handleTokenExpiredSmart = async (options = {}) => {
  const { onSuccess, onFailed, pageName = '页面' } = options;
  
  if (isTokenExpiredHandled) {
    console.log(`🔐 [${pageName}] Token过期已在处理中，跳过重复处理`);
    return false;
  }
  isTokenExpiredHandled = true;
  
  console.log(`🔐 [${pageName}] 检测到token过期，开始智能重新认证流程`);
  
  try {
    // 方法1: 尝试使用refresh token刷新
    console.log(`🔄 [${pageName}] 尝试使用refresh token刷新...`);
    const refreshResult = await refreshToken();
    if (refreshResult === true) {
      console.log(`✅ [${pageName}] Token刷新成功`);
      
      // 重置状态
      isTokenExpiredHandled = false;
      
      // 调用成功回调
      if (onSuccess) {
        await onSuccess();
      }
      return true;
    }
  } catch (error) {
    console.log(`❌ [${pageName}] Refresh token刷新失败:`, error.message);
  }
  
  try {
    // 方法2: 尝试重新初始化认证
    console.log(`🚀 [${pageName}] 尝试重新初始化认证...`);
    const authResult = await initializeAuth();
    if (authResult) {
      console.log(`✅ [${pageName}] 重新认证成功`);
      
      // 重置状态
      isTokenExpiredHandled = false;
      
      // 调用成功回调
      if (onSuccess) {
        await onSuccess();
      }
      return true;
    }
  } catch (error) {
    console.log(`❌ [${pageName}] 重新认证失败:`, error.message);
  }
  
  // 方法3: 如果以上方法都失败，则刷新页面
  console.log(`🔄 [${pageName}] 智能认证失败，回退到页面刷新方式`);
  ElMessage.warning('正在刷新页面以重新认证...');
  
  // 清除过期的认证信息
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user_info');
  localStorage.removeItem('token_expires_at');
  
  // 调用失败回调
  if (onFailed) {
    onFailed();
  }
  
  // 延迟刷新页面，让用户看到提示信息
  setTimeout(() => {
    console.log(`[${pageName}] 开始页面刷新重新认证流程...`);
    window.location.reload();
  }, 2000);
  
  return false;
};

/**
 * 重置token过期处理状态
 * 用于页面卸载或其他需要重置状态的场景
 */
export const resetTokenExpiredState = () => {
  isTokenExpiredHandled = false;
};

/**
 * 检查当前token过期处理状态
 */
export const isTokenExpiredHandling = () => {
  return isTokenExpiredHandled;
};

/**
 * 创建带有智能认证的API调用包装器
 * @param {Function} apiCall - API调用函数
 * @param {Object} options - 配置选项
 */
export const createSmartApiCall = (apiCall, options = {}) => {
  return async (...args) => {
    try {
      return await apiCall(...args);
    } catch (error) {
      if (isTokenExpiredError(error)) {
        console.log('🔐 API调用检测到token过期，启动智能认证');
        const success = await handleTokenExpiredSmart(options);
        if (success) {
          // 认证成功后重试API调用
          return await apiCall(...args);
        }
      }
      throw error;
    }
  };
};

/**
 * 为Vue组件提供的智能认证混入
 */
export const useSmartAuth = (pageName) => {
  return {
    isTokenExpiredError,
    handleTokenExpiredSmart: (options = {}) => handleTokenExpiredSmart({
      ...options,
      pageName
    }),
    resetTokenExpiredState,
    isTokenExpiredHandling,
    createSmartApiCall: (apiCall, options = {}) => createSmartApiCall(apiCall, {
      ...options,
      pageName
    })
  };
}; 