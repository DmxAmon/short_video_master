/**
 * 权限管理相关逻辑钩子
 * 提供权限检查和管理功能
 */
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';

export function usePermissions(initialPermissions = []) {
  // 用户权限列表
  const permissions = ref(Array.isArray(initialPermissions) ? [...initialPermissions] : []);
  
  // 基础权限 - 所有用户默认拥有
  const basicPermissions = ['view', 'download'];
  
  // 会员权限 - 需要会员资格
  const memberPermissions = {
    basic: ['extract', 'markdown:column'],
    pro: ['extract', 'transcribe', 'batch', 'markdown:column'],
    enterprise: ['extract', 'transcribe', 'batch', 'api', 'markdown:column']
  };
  
  // 会员等级与权限的映射
  const memberLevelMap = {
    'free': [],
    'basic': memberPermissions.basic,
    'pro': memberPermissions.pro,
    'enterprise': memberPermissions.enterprise
  };
  
  /**
   * 检查是否拥有指定权限
   * @param {string} permissionName 权限名称
   * @returns {boolean} 是否拥有权限
   */
  const hasPermission = (permissionName) => {
    return permissions.value.includes(permissionName);
  };
  
  /**
   * 检查是否拥有任意一个指定权限
   * @param {Array} permissionNames 权限名称数组
   * @returns {boolean} 是否拥有任意一个权限
   */
  const hasAnyPermission = (permissionNames) => {
    if (!Array.isArray(permissionNames) || permissionNames.length === 0) {
      return false;
    }
    
    return permissionNames.some(name => hasPermission(name));
  };
  
  /**
   * 检查是否拥有所有指定权限
   * @param {Array} permissionNames 权限名称数组
   * @returns {boolean} 是否拥有所有权限
   */
  const hasAllPermissions = (permissionNames) => {
    if (!Array.isArray(permissionNames) || permissionNames.length === 0) {
      return true;
    }
    
    return permissionNames.every(name => hasPermission(name));
  };
  
  /**
   * 更新权限列表
   * @param {Array} newPermissions 新的权限列表
   */
  const updatePermissions = (newPermissions) => {
    if (Array.isArray(newPermissions)) {
      permissions.value = [...newPermissions];
    }
  };
  
  /**
   * 根据会员等级设置权限
   * @param {string} memberLevel 会员等级 (free, basic, pro, enterprise)
   */
  const setPermissionsByMemberLevel = (memberLevel) => {
    // 确保基础权限
    const newPermissions = [...basicPermissions];
    
    // 添加会员权限
    const levelPermissions = memberLevelMap[memberLevel] || [];
    levelPermissions.forEach(perm => {
      if (!newPermissions.includes(perm)) {
        newPermissions.push(perm);
      }
    });
    
    // 更新权限列表
    permissions.value = newPermissions;
  };
  
  /**
   * 添加单个权限
   * @param {string} permissionName 权限名称
   */
  const addPermission = (permissionName) => {
    if (permissionName && !permissions.value.includes(permissionName)) {
      permissions.value.push(permissionName);
    }
  };
  
  /**
   * 移除单个权限
   * @param {string} permissionName 权限名称
   */
  const removePermission = (permissionName) => {
    const index = permissions.value.indexOf(permissionName);
    if (index !== -1) {
      permissions.value.splice(index, 1);
    }
  };
  
  /**
   * 重置为基础权限
   */
  const resetToBasic = () => {
    permissions.value = [...basicPermissions];
  };
  
  /**
   * 检查功能点是否可用
   * @param {Object} featureConfig 功能配置
   * @returns {boolean} 功能是否可用
   */
  const isFeatureAvailable = (featureConfig) => {
    if (!featureConfig) return true;
    
    // 检查权限
    if (featureConfig.requiredPermission && !hasPermission(featureConfig.requiredPermission)) {
      return false;
    }
    
    // 检查使用限制
    if (featureConfig.usageCount !== undefined && 
        featureConfig.usageLimit !== undefined && 
        featureConfig.usageLimit > 0 && 
        featureConfig.usageCount >= featureConfig.usageLimit) {
      return false;
    }
    
    return true;
  };
  
  /**
   * 获取功能不可用的原因
   * @param {Object} featureConfig 功能配置
   * @returns {string} 不可用原因
   */
  const getFeatureUnavailableReason = (featureConfig) => {
    if (!featureConfig) return '';
    
    // 检查权限
    if (featureConfig.requiredPermission && !hasPermission(featureConfig.requiredPermission)) {
      return `需要 ${featureConfig.requiredPermission} 权限`;
    }
    
    // 检查使用限制
    if (featureConfig.usageCount !== undefined && 
        featureConfig.usageLimit !== undefined && 
        featureConfig.usageLimit > 0 && 
        featureConfig.usageCount >= featureConfig.usageLimit) {
      return `已达到使用限制 (${featureConfig.usageCount}/${featureConfig.usageLimit})`;
    }
    
    return '';
  };
  
  /**
   * 尝试使用需要权限的功能
   * @param {string} permissionName 所需权限名称
   * @param {Function} callback 成功时的回调函数
   * @param {Object} options 配置选项
   * @returns {boolean} 是否执行了回调
   */
  const tryUseFeature = (permissionName, callback, options = {}) => {
    const { 
      showError = true, 
      errorMessage = '您没有权限执行此操作'
    } = options;
    
    if (!hasPermission(permissionName)) {
      if (showError) {
        ElMessage.warning(errorMessage);
      }
      return false;
    }
    
    if (typeof callback === 'function') {
      callback();
    }
    return true;
  };
  
  // 计算属性：当前会员等级（基于权限推断）
  const memberLevel = computed(() => {
    if (hasAnyPermission(memberPermissions.enterprise)) {
      return 'enterprise';
    } else if (hasAnyPermission(memberPermissions.pro)) {
      return 'pro';
    } else if (hasAnyPermission(memberPermissions.basic)) {
      return 'basic';
    } else {
      return 'free';
    }
  });
  
  // 计算属性：会员等级显示名称
  const memberLevelName = computed(() => {
    const names = {
      'free': '免费用户',
      'basic': '基础会员',
      'pro': '专业会员',
      'enterprise': '企业会员'
    };
    return names[memberLevel.value] || '未知';
  });
  
  return {
    permissions,
    memberLevel,
    memberLevelName,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    updatePermissions,
    setPermissionsByMemberLevel,
    addPermission,
    removePermission,
    resetToBasic,
    isFeatureAvailable,
    getFeatureUnavailableReason,
    tryUseFeature
  };
} 