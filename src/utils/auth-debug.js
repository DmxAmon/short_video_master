/**
 * 认证调试工具
 * 用于诊断RefreshToken相关问题
 */

/**
 * 检查认证状态
 */
export function checkAuthStatus() {
  const status = {
    access_token: localStorage.getItem('access_token'),
    refresh_token: localStorage.getItem('refresh_token'),
    user_info: localStorage.getItem('user_info'),
    token_expires_at: localStorage.getItem('token_expires_at'),
    feishu_user_id: localStorage.getItem('feishu_user_id')
  };

  console.log('🔍 === 认证状态检查 ===');
  console.log('Access Token:', status.access_token ? `存在 (长度: ${status.access_token.length})` : '不存在');
  console.log('Refresh Token:', status.refresh_token ? `存在 (长度: ${status.refresh_token.length})` : '不存在');
  console.log('User Info:', status.user_info ? '存在' : '不存在');
  console.log('Token过期时间:', status.token_expires_at ? new Date(parseInt(status.token_expires_at)).toLocaleString() : '未设置');
  console.log('飞书用户ID:', status.feishu_user_id ? `存在 (${status.feishu_user_id})` : '不存在');

  // 检查token是否过期
  if (status.token_expires_at) {
    const expiresAt = parseInt(status.token_expires_at);
    const now = Date.now();
    const isExpired = now > expiresAt;
    const timeLeft = expiresAt - now;
    
    console.log('Token过期状态:', isExpired ? '已过期' : '有效');
    if (!isExpired) {
      console.log('剩余时间:', Math.round(timeLeft / 1000 / 60), '分钟');
    }
  }

  return status;
}

/**
 * 诊断RefreshToken问题
 */
export function diagnoseRefreshTokenIssue() {
  console.log('🔧 === RefreshToken问题诊断 ===');
  
  const status = checkAuthStatus();
  
  // 问题1: 没有refresh_token
  if (!status.refresh_token) {
    console.log('❌ 问题1: 缺少refresh_token');
    console.log('可能原因:');
    console.log('  - 用户首次登录，后端没有返回refresh_token');
    console.log('  - 认证流程中refresh_token没有被正确保存');
    console.log('  - refresh_token被意外清除');
    
    if (status.access_token) {
      console.log('建议: 有access_token但没有refresh_token，可能需要重新认证');
    } else {
      console.log('建议: 完全没有认证信息，需要重新登录');
    }
  }
  
  // 问题2: 有refresh_token但token已过期
  if (status.refresh_token && status.token_expires_at) {
    const expiresAt = parseInt(status.token_expires_at);
    const now = Date.now();
    if (now > expiresAt) {
      console.log('⚠️ 问题2: Access token已过期，但有refresh_token可用');
      console.log('建议: 应该能够使用refresh_token刷新access_token');
    }
  }
  
  // 问题3: 检查环境问题
  const isInFeishu = window.self !== window.top;
  console.log('环境检查:');
  console.log('  - 是否在飞书环境:', isInFeishu ? '是' : '否');
  console.log('  - 当前域名:', window.location.hostname);
  console.log('  - 是否支持localStorage:', typeof localStorage !== 'undefined');
  
  return {
    hasRefreshToken: !!status.refresh_token,
    hasAccessToken: !!status.access_token,
    isTokenExpired: status.token_expires_at ? Date.now() > parseInt(status.token_expires_at) : false,
    isInFeishu,
    recommendations: getRecommendations(status)
  };
}

/**
 * 获取修复建议
 */
function getRecommendations(status) {
  const recommendations = [];
  
  if (!status.refresh_token && !status.access_token) {
    recommendations.push('需要重新进行完整的认证流程');
  } else if (!status.refresh_token && status.access_token) {
    recommendations.push('有access_token但缺少refresh_token，建议重新认证以获取完整的token对');
  } else if (status.refresh_token && status.access_token) {
    const isExpired = status.token_expires_at ? Date.now() > parseInt(status.token_expires_at) : false;
    if (isExpired) {
      recommendations.push('Token已过期，可以尝试使用refresh_token刷新');
    } else {
      recommendations.push('认证状态正常');
    }
  }
  
  return recommendations;
}

/**
 * 模拟token过期场景
 */
export function simulateTokenExpiry() {
  console.log('🧪 === 模拟Token过期场景 ===');
  
  const currentAccessToken = localStorage.getItem('access_token');
  const currentRefreshToken = localStorage.getItem('refresh_token');
  
  if (!currentAccessToken) {
    console.log('❌ 没有access_token，无法模拟过期');
    return false;
  }
  
  // 如果没有refresh_token，使用当前的access_token作为refresh_token
  if (!currentRefreshToken) {
    localStorage.setItem('refresh_token', currentAccessToken);
    console.log('✅ 已将当前access_token保存为refresh_token');
  }
  
  // 设置一个无效的access_token
  const expiredToken = 'expired_token_' + Date.now();
  localStorage.setItem('access_token', expiredToken);
  
  // 设置过期时间为过去的时间
  localStorage.setItem('token_expires_at', Date.now() - 1000);
  
  console.log('✅ 已模拟token过期场景');
  console.log('  - 新的access_token:', expiredToken);
  console.log('  - refresh_token:', localStorage.getItem('refresh_token'));
  
  return true;
}

/**
 * 清理认证信息
 */
export function clearAuthInfo() {
  console.log('🧹 === 清理认证信息 ===');
  
  const keys = ['access_token', 'refresh_token', 'user_info', 'token_expires_at', 'feishu_user_id'];
  keys.forEach(key => {
    const value = localStorage.getItem(key);
    if (value) {
      localStorage.removeItem(key);
      console.log(`✅ 已清除 ${key}`);
    } else {
      console.log(`⚪ ${key} 不存在，跳过`);
    }
  });
  
  console.log('🧹 认证信息清理完成');
}

/**
 * 检查后端API连通性
 */
export async function checkApiConnectivity() {
  console.log('🌐 === 检查API连通性 ===');
  
  const apiBaseUrl = 'https://fsbk.dy2bcsm.cn/api';
  const testEndpoints = [
    '/auth/refresh',
    '/plugin-auth/user',
    '/plugin-auth'
  ];
  
  const results = {};
  
  for (const endpoint of testEndpoints) {
    try {
      console.log(`测试端点: ${apiBaseUrl}${endpoint}`);
      const response = await fetch(`${apiBaseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ test: 'connectivity' })
      });
      
      results[endpoint] = {
        status: response.status,
        statusText: response.statusText,
        accessible: true
      };
      
      console.log(`✅ ${endpoint}: ${response.status} ${response.statusText}`);
    } catch (error) {
      results[endpoint] = {
        error: error.message,
        accessible: false
      };
      
      console.log(`❌ ${endpoint}: ${error.message}`);
    }
  }
  
  return results;
}

/**
 * 完整的认证状态报告
 */
export async function generateAuthReport() {
  console.log('📊 === 生成认证状态报告 ===');
  
  const authStatus = checkAuthStatus();
  const diagnosis = diagnoseRefreshTokenIssue();
  const connectivity = await checkApiConnectivity();
  
  const report = {
    timestamp: new Date().toISOString(),
    authStatus,
    diagnosis,
    connectivity,
    environment: {
      userAgent: navigator.userAgent,
      url: window.location.href,
      isInFeishu: window.self !== window.top,
      domain: window.location.hostname
    }
  };
  
  console.log('📊 完整报告:', JSON.stringify(report, null, 2));
  
  return report;
} 