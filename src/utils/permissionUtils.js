/**
 * @Version    : v1.00
 * @Author     : AI Codex
 * @Date       : 2024-05-15
 * @desc       : 权限检查工具函数，用于在组件中方便地检查用户权限
 */
import { ref, reactive } from 'vue';
import * as membershipApi from '../api/membershipApi';

/**
 * 创建权限检查钩子
 * @returns {Object} 权限检查钩子
 */
export function usePermissionCheck() {
  // 状态
  const checking = ref(false);
  const permissionState = reactive({
    hasPermission: false,
    permissionData: null,
    showDialog: false,
    featureName: ''
  });
  
  /**
   * 检查功能权限
   * @param {string} featureCode 功能代码
   * @param {number} amount 使用数量
   * @param {string} featureName 功能名称（用于显示）
   * @returns {Promise<boolean>} 是否有权限
   */
  const checkPermission = async (featureCode, amount = 1, featureName = null) => {
    try {
      checking.value = true;
      
      // 调用API检查权限
      const result = await membershipApi.checkFeaturePermission(featureCode, amount);
      
      // 更新权限状态
      permissionState.permissionData = result.data;
      permissionState.hasPermission = result.code === 0 && result.data?.hasPermission === true;
      
      // 如果没有权限，准备显示对话框
      if (!permissionState.hasPermission) {
        permissionState.featureName = featureName || featureCode;
        permissionState.showDialog = true;
      }
      
      return permissionState.hasPermission;
    } catch (error) {
      console.error('检查功能权限出错:', error);
      permissionState.hasPermission = false;
      return false;
    } finally {
      checking.value = false;
    }
  };
  
  /**
   * 关闭权限对话框
   */
  const closePermissionDialog = () => {
    permissionState.showDialog = false;
  };
  
  /**
   * 重置权限状态
   */
  const resetPermissionState = () => {
    permissionState.hasPermission = false;
    permissionState.permissionData = null;
    permissionState.showDialog = false;
    permissionState.featureName = '';
  };
  
  return {
    checking,
    permissionState,
    checkPermission,
    closePermissionDialog,
    resetPermissionState
  };
}

/**
 * 检查会员等级是否满足要求
 * @param {string} userLevel 用户会员等级
 * @param {string} requiredLevel 所需会员等级
 * @returns {boolean} 是否满足要求
 */
export function checkMemberLevel(userLevel, requiredLevel) {
  // 会员等级权重
  const levelWeight = {
    'normal': 0,
    'advanced': 1,
    'professional': 2
  };
  
  // 前端代码与后端代码映射
  const frontendToBackendMap = {
    'free': 'normal',
    'standard': 'advanced',
    'basic': 'advanced',
    'premium': 'professional',
    'pro': 'professional',
    'professional': 'professional'
  };
  
  // 转换为后端代码
  const normalizedUserLevel = frontendToBackendMap[userLevel] || userLevel;
  const normalizedRequiredLevel = frontendToBackendMap[requiredLevel] || requiredLevel;
  
  // 如果用户等级权重大于等于所需等级权重，则满足要求
  return (levelWeight[normalizedUserLevel] || 0) >= (levelWeight[normalizedRequiredLevel] || 0);
}

/**
 * 获取会员等级显示名称
 * @param {string} level 会员等级代码
 * @returns {string} 会员等级名称
 */
export function getMemberLevelName(level) {
  const levelNames = {
    'normal': '普通会员',
    'advanced': '高级会员',
    'professional': '专业会员',
    // 兼容旧代码
    'free': '普通会员',
    'standard': '高级会员',
    'basic': '高级会员',
    'premium': '专业会员',
    'pro': '专业会员'
  };
  
  return levelNames[level] || level;
}

/**
 * 获取功能所需的会员等级
 * @param {string} featureCode 功能代码
 * @returns {string|null} 所需会员等级，如果不需要特定等级则返回null
 */
export function getRequiredMemberLevel(featureCode) {
  // 功能与所需会员等级的映射
  const featureLevelMap = {
    // 抖音视频提取功能
    'douyin:basic': null, // 所有用户都可以使用，但有额度限制
    'douyin:batch': 'advanced', // 需要高级会员
    'douyin:multi': 'professional', // 需要专业会员
    
    // 视频转写功能
    'transcribe:basic': null, // 所有用户都可以使用，但有额度限制
    'transcribe:advanced': 'professional', // 需要专业会员
    
    // 视频监控功能
    'monitor:basic': null, // 所有用户都可以使用
    'monitor:advanced': 'professional', // 需要专业会员
    'monitor:export': 'advanced', // 需要高级会员
    
    // Markdown功能
    'markdown:basic': null, // 所有用户都可以使用
    'markdown:column': 'advanced', // 需要高级会员
    'markdown:advanced': 'professional', // 需要专业会员
    'markdown:export': 'professional' // 需要专业会员
  };
  
  return featureLevelMap[featureCode] || null;
} 