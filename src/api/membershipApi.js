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
 * 获取功能每单位所需积分 - 生产环境真实价格
 * @param {string} featureCode 功能代码
 * @returns {number} 每单位所需积分
 */
function getPointsPerUnit(featureCode) {
  // 功能与积分消耗的映射 - 与前端展示的规则保持一致
  const pointsMap = {
    'douyin:basic': 10,        // 抖音单视频数据提取：10积分/个视频
    'douyin:batch': 1,         // 抖音作者主页批量采集：1积分/个视频
    'douyin:multi': 10,        // 抖音多链接批量提取：10积分/个链接
    'transcribe:basic': 1,     // 基础视频转写功能：1积分/秒钟
    'transcribe:advanced': 2,  // 高级视频转写功能：2积分/秒钟
    'markdown:basic': 5,       // 高级Markdown功能：5积分/次
    'markdown:column': 5,      // 数据导出功能：5积分/次
    'markdown:advanced': 5,    // 高级Markdown功能：5积分/次
    'markdown:export': 5,      // 数据导出功能：5积分/次
    'monitor:basic': 10,       // 基础监控：10积分/次
    'monitor:advanced': 20,    // 高级监控：20积分/次
    'monitor:export': 5        // 监控导出：5积分/次
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