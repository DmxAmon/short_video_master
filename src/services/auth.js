import { ElMessage } from 'element-plus'
import { envConfig } from '../config/env'
// 正确导入飞书多维表格SDK
import { bitable } from '@lark-base-open/js-sdk'

// API基础URL - 使用envConfig中的配置，确保与环境配置一致
const API_BASE_URL = envConfig.apiUrl;

// 记录环境和请求基础URL信息，便于问题排查
console.log('=== 认证服务初始化 ===');
console.log('当前环境:', envConfig.isDevelopment ? '开发环境' : '生产环境');
console.log('API认证服务使用基础URL:', API_BASE_URL); // 记录当前使用的API基础URL
console.log('当前页面URL:', window.location.href); // 记录当前页面URL
console.log('当前域名:', window.location.hostname); // 记录当前域名
console.log('是否GitHub Pages:', envConfig.currentDomain.isGitHubPages);

// 检测飞书SDK环境
console.log('=== 飞书SDK环境检测 ===');
console.log('bitable SDK导入状态:', !!bitable);
console.log('bitable.bridge存在:', !!(bitable && bitable.bridge));
console.log('getBaseUserId方法存在:', !!(bitable && bitable.bridge && bitable.bridge.getBaseUserId));
console.log('getUserId方法存在:', !!(bitable && bitable.bridge && bitable.bridge.getUserId));
console.log('是否在iframe中:', window.self !== window.top);
console.log('User-Agent:', navigator.userAgent);

// 如果飞书SDK存在，尝试获取一些基本信息
if (bitable && bitable.bridge) {
  console.log('✅ 飞书SDK已正确导入，尝试获取基本信息...');
  
  // 异步获取一些基本信息
  setTimeout(async () => {
    try {
      if (bitable.bridge.getEnv) {
        const env = await bitable.bridge.getEnv();
        console.log('飞书环境信息:', env);
      }
      if (bitable.bridge.getLocale) {
        const locale = await bitable.bridge.getLocale();
        console.log('飞书语言设置:', locale);
      }
      
      // 检查当前用户ID是否为空，如果为空则清除认证信息
      const currentUserInfo = localStorage.getItem('user_info');
      if (currentUserInfo) {
        try {
          const userObj = JSON.parse(currentUserInfo);
          const userId = userObj?.id || userObj?.user?.id;
          if (!userId || userId.trim() === '') {
            console.log('🔄 检测到用户ID为空，清除认证信息...');
            // 清除所有认证信息，但不自动刷新页面
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user_info');
            localStorage.removeItem('token_expires_at');
            clearUserIdCache();
            
            // 移除自动刷新页面的逻辑，让统一的token过期处理来处理
            console.log('🔐 用户ID为空，已清除认证信息，交由统一处理');
          }
        } catch (parseError) {
          console.warn('解析用户信息失败:', parseError);
        }
      }
    } catch (error) {
      console.warn('获取飞书基本信息失败:', error);
    }
  }, 1000);
} else {
  console.warn('❌ 飞书SDK未正确导入或不完整');
  
  // 如果SDK未加载，等待一段时间后重新检查
  setTimeout(() => {
    if (bitable && bitable.bridge) {
      console.log('🔄 飞书SDK延迟初始化成功');
      // 如果SDK延迟加载成功，检查是否需要重新认证
      const currentUserInfo = localStorage.getItem('user_info');
      if (currentUserInfo) {
        try {
          const userObj = JSON.parse(currentUserInfo);
          const userId = userObj?.id || userObj?.user?.id;
          if (!userId || userId.trim() === '') {
            console.log('�� SDK延迟加载后检测到用户ID为空，清除认证信息...');
            clearUserIdCache();
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user_info');
            localStorage.removeItem('token_expires_at');
            console.log('🔐 用户ID为空，已清除认证信息，交由统一处理');
          }
        } catch (parseError) {
          console.warn('解析用户信息失败:', parseError);
        }
      }
    } else {
      console.warn('⚠️ 飞书SDK仍未正确初始化，可能不在飞书环境中');
    }
  }, 3000);
}

// 增强日志函数
function enhancedLog(level, message, data) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}][AUTH]`;
  
  if (level === 'error') {
    console.error(prefix, message, data || '');
  } else if (level === 'warn') {
    console.warn(prefix, message, data || '');
  } else {
    console.log(prefix, message, data || '');
  }
}

// 用于防止对同一endpoint的重复请求
const pendingRequests = {};

// 用户ID缓存，确保同一会话中用户ID保持一致
let cachedUserId = null;

// 添加larkUser变量的导出函数
let larkUser = null;

/**
 * 获取当前的larkUser对象
 */
export function getLarkUser() {
  return larkUser;
}

/**
 * 等待飞书SDK初始化完成
 */
async function waitForFeishuSDK(maxWaitTime = 10000, checkInterval = 500) {
  console.log('🔄 等待飞书SDK初始化完成...');
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    // 检查导入的bitable SDK是否可用
    const bitableLoaded = bitable && bitable.bridge && bitable.bridge.getBaseUserId;
    
    console.log('⏳ SDK初始化状态检查:', {
      bitable: bitable ? '已导入' : '未导入',
      bridge: (bitable && bitable.bridge) ? '已初始化' : '未初始化',
      getBaseUserId: (bitable && bitable.bridge && bitable.bridge.getBaseUserId) ? '可用' : '不可用'
    });
      
    // 如果SDK已完全初始化，返回成功
    if (bitableLoaded) {
      console.log('✅ 飞书多维表格SDK已完全初始化');
      return true;
      }
      
    console.log('⏳ 飞书SDK尚未完全初始化，等待中...');
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  
  console.error('❌ 等待飞书SDK初始化超时');
  return false;
}

/**
 * 使用飞书SDK获取稳定的用户ID
 */
async function getFeishuUserId() {
  console.log('=== getFeishuUserId 函数开始执行 ===');
      
  // 首先检查缓存
  if (cachedUserId) {
    console.log('✅ 使用缓存的用户ID:', cachedUserId);
    console.log('=== getFeishuUserId 函数结束 (使用缓存) ===');
    return cachedUserId;
  }
  console.log('❌ 内存缓存中没有用户ID');
  
  // 检查localStorage中是否有保存的用户ID
  const savedUserId = localStorage.getItem('feishu_user_id');
  if (savedUserId && savedUserId.trim() !== '') {
    console.log('✅ 从localStorage获取用户ID:', savedUserId);
    cachedUserId = savedUserId;
    console.log('✅ 已将用户ID保存到内存缓存');
    console.log('=== getFeishuUserId 函数结束 (使用localStorage) ===');
    return cachedUserId;
  }
  console.log('❌ localStorage中没有有效的用户ID');
  
  // 等待飞书SDK初始化完成
  const sdkLoaded = await waitForFeishuSDK();
  if (!sdkLoaded) {
    throw new Error('飞书SDK初始化超时，请确保在飞书环境中使用此插件');
      }
      
  // 使用飞书多维表格SDK的getBaseUserId方法
  try {
    console.log('🔍 使用飞书多维表格SDK获取用户ID...');
    console.log('🚀 调用 bitable.bridge.getBaseUserId()...');
    
    const baseUserId = await bitable.bridge.getBaseUserId();
    console.log('✅ 成功获取到用户ID:', baseUserId);
    console.log('📝 用户ID类型:', typeof baseUserId);
    console.log('📝 用户ID长度:', baseUserId ? baseUserId.length : 0);
    
    if (!baseUserId || baseUserId.trim() === '') {
      throw new Error('获取到的用户ID为空');
      }
      
    // 保存到缓存
    cachedUserId = baseUserId;
    localStorage.setItem('feishu_user_id', baseUserId);
    console.log('✅ 已将用户ID保存到内存缓存和localStorage');
    console.log('=== getFeishuUserId 函数结束 (使用多维表格SDK) ===');
    return baseUserId;
  } catch (error) {
    console.error('❌ 获取用户ID失败:', error.message);
    console.log('=== getFeishuUserId 函数结束 (失败) ===');
    throw new Error('无法获取飞书用户ID: ' + error.message);
  }
}

/**
 * 清除用户ID缓存（登出时调用）
 */
function clearUserIdCache() {
  cachedUserId = null;
  localStorage.removeItem('feishu_user_id');
  console.log('已清除用户ID缓存');
}

/**
 * 基础认证函数
 */
export async function authenticate() {
  try {
    console.log('=== 开始基础认证流程 ===');
    
    // 检查本地存储的token
    const token = localStorage.getItem('access_token');
    console.log('本地token存在:', !!token);
    if (token) {
      console.log('本地token长度:', token.length);
      console.log('🔍 验证本地token有效性...');
      
      // 验证token有效性
      try {
        const userInfo = await callApi('/plugin-auth/user');
        console.log('token验证响应:', JSON.stringify(userInfo, null, 2));
        
        if (userInfo && userInfo.code === 0) {
          console.log('✅ 使用本地token认证成功');
          console.log('📝 用户信息:', JSON.stringify(userInfo.data, null, 2));
          return { 
            user: userInfo.data, 
            access_token: token,
            refresh_token: localStorage.getItem('refresh_token')
          };
        }
  } catch (error) {
        console.log('❌ 本地token无效:', error.message);
        // 清除无效token
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_info');
        localStorage.removeItem('token_expires_at');
        // 同时清除用户ID缓存，确保重新获取
        clearUserIdCache();
        console.log('✅ 已清除无效的本地认证信息和用户ID缓存');
      }
    }
    
    // 如果没有有效token，调用初始化认证
    console.log('🚀 开始初始化认证流程...');
    const success = await initializeAuth();
    console.log('初始化认证结果:', success);
    
    if (success) {
      const userInfo = getCurrentUser();
      const newToken = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');
      
      console.log('✅ 认证流程完成');
      console.log('📝 最终用户信息:', JSON.stringify(userInfo, null, 2));
      console.log('📝 新token长度:', newToken ? newToken.length : 0);
      
      return {
        user: userInfo,
        access_token: newToken,
        refresh_token: refreshToken
      };
    } else {
      console.error('❌ 初始化认证失败');
      throw new Error('认证失败');
    }
  } catch (error) {
    console.error('❌ 认证流程失败:', error);
    console.error('❌ 错误详情:', error.message);
    console.error('❌ 错误堆栈:', error.stack);
    throw error;
  }
}

/**
 * API请求工具函数 - 携带认证令牌
 */
export async function callApi(endpoint, options = {}) {
  // 检查是否有相同endpoint的请求正在进行中
  const requestKey = `${endpoint}:${JSON.stringify(options)}`;
  
  if (pendingRequests[requestKey]) {
    console.log(`请求已在进行中，跳过重复请求: ${endpoint}`);
    return pendingRequests[requestKey];
  }
  
  // 创建请求Promise
  const requestPromise = (async () => {
    try {
      // 检查token是否即将过期
      await checkAndRefreshToken();
      
      const token = localStorage.getItem('access_token');
      
      const defaultOptions = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // 根据文档使用 Bearer token 格式
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      };
      
      const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
          ...defaultOptions.headers,
          ...options.headers
        }
      };

      const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
      
      enhancedLog('info', 'API请求', {
        url,
        method: finalOptions.method,
        headers: finalOptions.headers
      });

      const response = await fetch(url, finalOptions);
      
      // 如果是401错误，尝试刷新token
      if (response.status === 401) {
        console.log('收到401响应，尝试刷新token...');
        const refreshSuccess = await refreshToken();
        if (refreshSuccess) {
          // 刷新成功，重新发起请求
          const newToken = localStorage.getItem('access_token');
          finalOptions.headers['Authorization'] = `Bearer ${newToken}`;
          
          const retryResponse = await fetch(url, finalOptions);
          if (!retryResponse.ok) {
            throw new Error(`HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
          }
          const retryData = await retryResponse.json();
          enhancedLog('info', 'API重试响应', {
            url,
            status: retryResponse.status,
            data: retryData
          });
          return retryData;
        } else {
          throw new Error('登陆已过期，请刷新插件页面');
        }
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      enhancedLog('info', 'API响应', {
        url,
        status: response.status,
        data
      });

      return data;
    } catch (error) {
      enhancedLog('error', 'API请求失败', {
        endpoint,
        error: error.message
      });
      throw error;
    } finally {
      // 请求完成后清除pending状态
        delete pendingRequests[requestKey];
    }
  })();
  
  // 存储pending请求
  pendingRequests[requestKey] = requestPromise;
  
  return requestPromise;
}

/**
 * 检查并刷新token
 */
async function checkAndRefreshToken() {
  const expiresAt = localStorage.getItem('token_expires_at');
  if (!expiresAt) return;
  
  const now = Date.now();
  const expireTime = parseInt(expiresAt);
  
  // 如果token在5分钟内过期，提前刷新
  if (expireTime - now < 5 * 60 * 1000) {
    console.log('Token即将过期，提前刷新...');
    await refreshToken();
  }
}

/**
 * 刷新token
 */
export async function refreshToken() {
  try {
    const refreshTokenValue = localStorage.getItem('refresh_token');
    if (!refreshTokenValue) {
      console.log('🔐 没有refresh token，无法刷新');
      return false;
    }
    
    console.log('🔄 开始刷新token，refresh_token长度:', refreshTokenValue.length);
    console.log('🌐 请求URL:', `${API_BASE_URL}/auth/refresh`);
    
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        refresh_token: refreshTokenValue
      })
    });
    
    console.log('📡 刷新请求响应状态:', response.status, response.statusText);
    
    if (response.ok) {
      const result = await response.json();
      console.log('📦 刷新响应数据:', JSON.stringify(result, null, 2));
      
      if (result.code === 0) {
        // 保存新的token
        localStorage.setItem('access_token', result.data.access_token);
        localStorage.setItem('refresh_token', result.data.refresh_token);
        localStorage.setItem('token_expires_at', Date.now() + (result.data.expires_in * 1000));
        console.log('✅ Token刷新成功');
        return true;
      } else {
        console.log('❌ Token刷新失败，错误代码:', result.code, '错误信息:', result.message);
        return false;
      }
    } else {
      // 获取错误响应内容
      let errorText = '';
      try {
        const errorData = await response.json();
        errorText = JSON.stringify(errorData);
      } catch (e) {
        errorText = await response.text();
      }
      console.log('❌ Token刷新HTTP错误:', response.status, response.statusText, '响应内容:', errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ Token刷新网络错误:', error.message);
    console.error('❌ 错误详情:', error);
    
    // 检查是否是网络连接问题
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      console.log('🌐 可能是网络连接问题或CORS问题');
    }
    
    return false;
  }
}

/**
 * 检查用户是否已认证
 */
export function isAuthenticated() {
  const token = localStorage.getItem('access_token');
  return !!token;
}

/**
 * 获取当前用户信息
 */
export function getCurrentUser() {
  try {
    const userInfo = localStorage.getItem('user_info');
    return userInfo ? JSON.parse(userInfo) : null;
  } catch (error) {
    console.error('解析用户信息失败:', error);
    return null;
    }
}

/**
 * 登出函数
 */
export function logout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user_info');
  localStorage.removeItem('token_expires_at');
  console.log('用户已登出，已清除所有认证信息');
  clearUserIdCache();
}

// 节流函数
function throttle(fn, delay) {
  let timeoutId;
  let lastExecTime = 0;
  return function (...args) {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      fn.apply(this, args);
      lastExecTime = currentTime;
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fn.apply(this, args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
}

/**
 * 初始化认证
 */
export async function initializeAuth() {
  console.log('=== 初始化认证系统 ===');
  console.log('环境配置:', envConfig);
  console.log('当前URL:', window.location.href);
  console.log('当前时间:', new Date().toLocaleString());
  
  try {
    // 检查是否已有有效的认证令牌
    const existingToken = localStorage.getItem('access_token');
    console.log('现有令牌状态:', existingToken ? '存在' : '不存在');
    
    if (existingToken) {
      // 验证现有令牌是否有效
      try {
        console.log('验证现有令牌...');
        // 根据文档，获取用户信息的接口是 /plugin-auth/user
        const userInfo = await callApi('/plugin-auth/user');
        if (userInfo && userInfo.code === 0) {
          // 检查用户ID是否为空
          const userId = userInfo.data?.id || userInfo.data?.user?.id;
          console.log('现有token对应的用户ID:', userId);
          
          if (userId && userId.trim() !== '') {
            // 令牌有效且用户ID不为空，保存用户信息
            // 确保保存完整的用户数据，包括membership信息
            const completeUserData = {
              ...userInfo.data.user || userInfo.data,
              membership: userInfo.data.membership
            };
            localStorage.setItem('user_info', JSON.stringify(completeUserData));
            console.log('使用现有令牌认证成功，用户ID有效');
            console.log('✅ 保存的完整用户数据:', JSON.stringify(completeUserData, null, 2));
            return true;
          } else {
            console.log('⚠️ 现有token有效但用户ID为空，需要重新获取用户ID');
            // 用户ID为空，需要重新认证以获取正确的用户ID
            // 清除用户ID缓存，确保重新获取
            clearUserIdCache();
          }
        }
      } catch (error) {
        console.log('现有令牌无效，需要重新认证:', error.message);
        // 清除无效令牌
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_info');
        // 同时清除用户ID缓存
        clearUserIdCache();
      }
    }
    
    // 检查是否在飞书环境中
    const isInLarkEnvironment = window.self !== window.top;
    console.log('是否在飞书环境:', isInLarkEnvironment);
    
    if (isInLarkEnvironment) {
      // 在飞书环境中，尝试获取飞书用户信息进行认证
      try {
        console.log('飞书环境认证流程...');
        
        // 尝试使用飞书SDK获取真实用户信息
        // 注意：这里不要重新声明larkUser，而是使用全局的larkUser变量
        
        try {
          console.log('=== 开始获取飞书用户信息 ===');
          
          // 等待飞书SDK初始化完成（如果还没初始化的话）
          console.log('🔍 检查飞书SDK是否已初始化...');
          if (!bitable || !bitable.bridge || !bitable.bridge.getBaseUserId) {
            console.log('⏳ 飞书SDK尚未完全初始化，等待初始化...');
            const sdkLoaded = await waitForFeishuSDK(5000); // 减少等待时间到5秒
            if (!sdkLoaded) {
              throw new Error('飞书SDK初始化超时');
            }
          }
          
          // 使用飞书多维表格SDK获取用户信息
          console.log('✅ 检测到飞书多维表格SDK，尝试获取用户信息');
          console.log('🚀 调用 bitable.bridge.getBaseUserId()...');
          
          const baseUserId = await bitable.bridge.getBaseUserId();
          console.log('✅ 从飞书多维表格SDK获取到稳定用户ID:', baseUserId);
          console.log('📝 用户ID详细信息:');
          console.log('  - 类型:', typeof baseUserId);
          console.log('  - 长度:', baseUserId ? baseUserId.length : 0);
          console.log('  - 是否以ou_开头:', baseUserId ? baseUserId.startsWith('ou_') : false);
          
          larkUser = {
            id: baseUserId,
            open_id: baseUserId,
            name: '飞书用户',
            email: 'lark.user@example.com'
          };
        
          // 保存真实的用户ID到缓存
          cachedUserId = baseUserId;
          localStorage.setItem('feishu_user_id', baseUserId);
          console.log('✅ 已将用户ID保存到缓存');
          console.log('✅ 构造的larkUser对象:', JSON.stringify(larkUser, null, 2));
          console.log('✅ 使用飞书多维表格SDK getBaseUserId获取到用户信息');
        } catch (sdkError) {
          console.error('❌ 使用飞书多维表格SDK获取用户信息失败:', sdkError);
          console.error('❌ SDK错误详情:', sdkError.message);
          console.error('❌ SDK错误堆栈:', sdkError.stack);
          throw new Error('无法获取飞书用户信息，请确保在飞书多维表格环境中使用此插件');
        }
        
        // 如果无法获取用户信息，直接抛出错误
        if (!larkUser) {
          console.error('❌ larkUser为空，无法继续认证流程');
          throw new Error('无法获取飞书用户信息，请确保在飞书多维表格环境中使用此插件');
        }
        
        console.log('✅ 最终使用的飞书用户信息:', JSON.stringify(larkUser, null, 2));
        
        // 根据文档格式发送认证请求
        console.log('=== 开始发送认证请求 ===');
        console.log('🚀 调用认证API: /plugin-auth');
        console.log('📤 请求数据:', JSON.stringify({ user_info: larkUser }, null, 2));
        
        const authResult = await callApi('/plugin-auth', {
          method: 'POST',
          body: JSON.stringify({
            user_info: larkUser
          })
        });
        
        console.log('📥 认证API响应:', JSON.stringify(authResult, null, 2));
        
        if (authResult && authResult.code === 0) {
          console.log('✅ 认证成功！');
          console.log('📝 返回的用户数据:', JSON.stringify(authResult.data.user, null, 2));
          console.log('📝 access_token长度:', authResult.data.access_token ? authResult.data.access_token.length : 0);
          console.log('📝 refresh_token长度:', authResult.data.refresh_token ? authResult.data.refresh_token.length : 0);
        
          // 认证成功，保存令牌和用户信息
          localStorage.setItem('access_token', authResult.data.access_token);
          localStorage.setItem('refresh_token', authResult.data.refresh_token);
          
          // 保存完整的用户数据，包括membership信息和飞书open_id
          const completeUserData = {
            ...authResult.data.user,
            open_id: larkUser.open_id, // 保存飞书的open_id
            membership: authResult.data.membership
          };
          localStorage.setItem('user_info', JSON.stringify(completeUserData));
          localStorage.setItem('token_expires_at', Date.now() + (authResult.data.expires_in * 1000));
          
          console.log('✅ 保存的完整用户数据:', JSON.stringify(completeUserData, null, 2));
          console.log('✅ 已保存认证信息到localStorage');
          console.log('✅ 飞书认证成功');
          return true;
        } else {
          console.error('❌ 认证失败，API返回错误:');
          console.error('  - code:', authResult?.code);
          console.error('  - message:', authResult?.message);
          console.error('  - 完整响应:', JSON.stringify(authResult, null, 2));
          throw new Error(authResult?.message || '认证失败');
        }
      } catch (error) {
        console.error('飞书认证失败:', error);
        throw error;
      }
    } else {
      // 非飞书环境，无法进行认证
      console.error('非飞书环境，无法进行认证');
      throw new Error('请在飞书环境中使用此插件');
    }
  } catch (error) {
    console.error('=== 认证初始化失败 ===');
    console.error('错误信息:', error.message);
    console.error('错误堆栈:', error.stack);
    console.error('当前时间:', new Date().toLocaleString());
    throw error;
  }
}

function diagnoseDomainIssues() {
  const currentDomain = window.location.hostname;
  const expectedDomain = 'fsbk.dy2bcsm.cn';
  
  if (currentDomain !== expectedDomain) {
    console.warn(`域名不匹配: 当前=${currentDomain}, 期望=${expectedDomain}`);
    return false;
      }
  
  return true;
} 