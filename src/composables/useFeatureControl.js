/**
 * 功能控制钩子函数
 * 用于管理功能的权限控制和使用限制
 */
import { ref, computed, watchEffect } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useRouter } from 'vue-router';
import { features, getFeatureUsageLimit, memberLevels } from '../config/features';

/**
 * 功能控制钩子函数
 * @param {Object} user 用户对象
 * @returns {Object} 功能控制相关的方法和属性
 */
export function useFeatureControl(user) {
  const router = useRouter();
  
  // 功能使用记录
  const featureUsage = ref({
    videoExtract: { used: 0, limit: 0 },
    videoTranscribe: { used: 0, limit: 0 },
    videoBatch: { used: 0, limit: 0 },
    videoMulti: { used: 0, limit: 0 },
    markdownAdvanced: { used: 0, limit: 0 },
    markdownColumn: { used: 0, limit: 0 }
  });
  
  // 监听用户数据变化，更新功能使用限制
  watchEffect(() => {
    if (user && user.memberLevel) {
      // 更新各功能的使用限制
      Object.keys(features).forEach(featureId => {
        // 如果用户对象中有此功能的使用统计，则使用用户对象的数据
        if (user.usageStats && user.usageStats[featureId]) {
          featureUsage.value[featureId] = { 
            used: user.usageStats[featureId].used || 0,
            limit: user.usageStats[featureId].limit || getFeatureUsageLimit(featureId, user.memberLevel)
          };
        } else {
          // 否则仅更新限制值
          if (featureUsage.value[featureId]) {
            featureUsage.value[featureId].limit = getFeatureUsageLimit(featureId, user.memberLevel);
          } else {
            featureUsage.value[featureId] = { 
              used: 0,
              limit: getFeatureUsageLimit(featureId, user.memberLevel)
            };
          }
        }
      });
    }
  });
  
  /**
   * 检查用户是否拥有指定权限
   * @param {string} permission 权限名称
   * @returns {boolean} 是否拥有权限
   */
  const hasPermission = (permission) => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  };
  
  /**
   * 检查是否可以使用指定功能
   * @param {string} featureId 功能ID
   * @returns {boolean} 是否可以使用
   */
  const canUseFeature = (featureId) => {
    // 获取功能配置
    const feature = features[featureId];
    if (!feature) return false;
    
    // 检查权限
    if (!hasPermission(feature.requiredPermission)) {
      return false;
    }
    
    // 检查使用限制
    if (featureUsage.value[featureId]) {
      const { used, limit } = featureUsage.value[featureId];
      // limit 为 -1 表示无限制
      if (limit > 0 && used >= limit) {
        return false;
      }
    }
    
    return true;
  };
  
  /**
   * 获取功能无法使用的原因
   * @param {string} featureId 功能ID
   * @returns {string} 无法使用的原因
   */
  const getFeatureDisabledReason = (featureId) => {
    // 获取功能配置
    const feature = features[featureId];
    if (!feature) return '功能不存在';
    
    // 检查权限
    if (!hasPermission(feature.requiredPermission)) {
      return feature.upgradeMessage || '需要升级会员';
    }
    
    // 检查使用限制
    if (featureUsage.value[featureId]) {
      const { used, limit } = featureUsage.value[featureId];
      if (limit > 0 && used >= limit) {
        return `已达到使用限制 (${used}/${limit})`;
      }
    }
    
    return '';
  };
  
  /**
   * 尝试使用功能
   * @param {string} featureId 功能ID
   * @param {Function} callback 成功时的回调函数
   * @param {Object} options 选项
   * @returns {boolean} 是否成功使用
   */
  const tryUseFeature = (featureId, callback, options = {}) => {
    const { 
      showError = true, 
      autoIncrement = true,
      redirectToUpgrade = true
    } = options;
    
    // 检查是否可以使用
    if (!canUseFeature(featureId)) {
      const reason = getFeatureDisabledReason(featureId);
      
      if (showError) {
        ElMessageBox.confirm(
          `无法使用此功能：${reason}。是否查看会员方案？`,
          '功能受限',
          {
            confirmButtonText: '查看会员方案',
            cancelButtonText: '取消',
            type: 'warning'
          }
        ).then(() => {
          if (redirectToUpgrade) {
            router.push('/membership');
          }
        }).catch(() => {});
      }
      
      return false;
    }
    
    // 增加使用次数
    if (autoIncrement && featureUsage.value[featureId]) {
      featureUsage.value[featureId].used += 1;
    }
    
    // 执行回调
    if (typeof callback === 'function') {
      callback();
    }
    
    return true;
  };
  
  /**
   * 获取功能的使用情况
   * @param {string} featureId 功能ID
   * @returns {Object|null} 使用情况对象
   */
  const getFeatureUsage = (featureId) => {
    return featureUsage.value[featureId] || null;
  };
  
  /**
   * 重置功能的使用次数
   * @param {string} featureId 功能ID (可选，不传则重置所有)
   */
  const resetFeatureUsage = (featureId = null) => {
    if (featureId && featureUsage.value[featureId]) {
      featureUsage.value[featureId].used = 0;
    } else if (!featureId) {
      Object.keys(featureUsage.value).forEach(id => {
        featureUsage.value[id].used = 0;
      });
    }
  };
  
  /**
   * 检查当前会员等级是否至少为指定等级
   * @param {string} requiredLevel 所需会员等级
   * @returns {boolean} 是否符合要求
   */
  const checkMemberLevel = (requiredLevel) => {
    const levelValue = {
      [memberLevels.NORMAL]: 0,
      [memberLevels.ADVANCED]: 1,
      [memberLevels.PROFESSIONAL]: 2
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
    
    const currentLevel = user?.memberLevel || memberLevels.NORMAL;
    const normalizedCurrentLevel = frontendToBackendMap[currentLevel] || currentLevel;
    const normalizedRequiredLevel = frontendToBackendMap[requiredLevel] || requiredLevel;
    
    return levelValue[normalizedCurrentLevel] >= levelValue[normalizedRequiredLevel];
  };
  
  // 当前功能使用情况的计算属性
  const featureStatus = computed(() => {
    const result = {};
    
    Object.keys(features).forEach(featureId => {
      const feature = features[featureId];
      const usage = featureUsage.value[featureId];
      
      result[featureId] = {
        id: featureId,
        name: feature.name,
        description: feature.description,
        isAvailable: canUseFeature(featureId),
        disabledReason: getFeatureDisabledReason(featureId),
        usageInfo: usage ? {
          used: usage.used,
          limit: usage.limit,
          percentage: usage.limit > 0 ? Math.min(Math.round(usage.used / usage.limit * 100), 100) : 0,
          unlimited: usage.limit === -1
        } : null,
        requiredPermission: feature.requiredPermission
      };
    });
    
    return result;
  });
  
  return {
    featureUsage,
    hasPermission,
    canUseFeature,
    getFeatureDisabledReason,
    tryUseFeature,
    getFeatureUsage,
    resetFeatureUsage,
    checkMemberLevel,
    featureStatus
  };
} 