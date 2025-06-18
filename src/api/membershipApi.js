/**
 * @Version    : v1.00
 * @Author     : AI Codex
 * @Date       : 2024-05-15
 * @desc       : 会员系统API接口
 */
import { callApi } from '../services/auth';
import { envConfig } from '../config/env';

/**
 * 获取当前用户的会员信息
 * @returns {Promise<Object>} 会员信息
 */
export async function getMemberInfo() {
  try {
    // 调用后端API获取会员信息
    const response = await callApi('/membership/info');
    return response;
  } catch (error) {
    console.error('获取会员信息失败:', error);
    throw error;
  }
}

/**
 * 获取会员等级列表
 * @returns {Promise<Object>} 会员等级列表
 */
export async function getMemberLevels() {
  try {
    // 调用后端API获取会员等级列表
    const response = await callApi('/membership/levels');
    return response;
  } catch (error) {
    console.error('获取会员等级列表失败:', error);
    throw error;
  }
}

/**
 * 检查功能权限
 * @param {string} featureCode 功能代码
 * @param {number} amount 使用数量
 * @returns {Promise<Object>} 权限检查结果
 */
export async function checkFeaturePermission(featureCode, amount = 1) {
  try {
    // 调用后端API检查权限
    const response = await callApi('/permission/check', {
      method: 'POST',
      body: JSON.stringify({
        featureCode,
        amount
      })
    });
    return response;
  } catch (error) {
    console.error('检查功能权限失败:', error);
    throw error;
  }
}

/**
 * 获取用户功能使用配额
 * @param {string} featureCode 功能代码
 * @returns {Promise<Object>} 功能使用配额
 */
export async function getFeatureQuota(featureCode) {
  try {
    // 调用后端API获取功能使用配额
    const response = await callApi(`/user/quota?featureCode=${featureCode}`);
    return response;
  } catch (error) {
    console.error('获取功能使用配额失败:', error);
    throw error;
  }
}

/**
 * 获取功能每单位所需积分
 * @param {string} featureCode 功能代码
 * @returns {number} 每单位所需积分
 */
function getPointsPerUnit(featureCode) {
  // 功能与积分消耗的映射
  const pointsMap = {
    'douyin:basic': 10,
    'douyin:batch': 50,
    'douyin:multi': 20,
    'transcribe:basic': 30,
    'transcribe:advanced': 50,
    'monitor:basic': 10,
    'monitor:advanced': 20,
    'monitor:export': 5,
    'markdown:basic': 5,
    'markdown:column': 10,
    'markdown:advanced': 15,
    'markdown:export': 5
  };
  
  return pointsMap[featureCode] || 10; // 默认10积分/单位
}

/**
 * 更新用户会员等级（测试用）
 * @param {Object} userData 用户数据
 * @returns {Promise<Object>} 更新结果
 */
export async function updateMemberLevel(userData) {
  try {
    // 调用后端API更新会员等级
    const response = await callApi('/membership/update-level', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    return response;
  } catch (error) {
    console.error('更新会员等级失败:', error);
    throw error;
  }
} 