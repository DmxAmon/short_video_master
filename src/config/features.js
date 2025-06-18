/**
 * 功能特性配置文件
 * 定义系统中各种功能及其对应的权限要求和使用限制
 */

// 会员等级定义
export const memberLevels = {
  NORMAL: 'normal',
  ADVANCED: 'advanced',
  PROFESSIONAL: 'professional'
};

// 会员等级显示名称
export const memberLevelNames = {
  [memberLevels.NORMAL]: '普通会员',
  [memberLevels.ADVANCED]: '高级会员',
  [memberLevels.PROFESSIONAL]: '专业会员'
};

// 权限与会员等级对应关系
export const memberLevelPermissions = {
  [memberLevels.NORMAL]: ['douyin:basic', 'transcribe:basic', 'monitor:basic', 'markdown:basic'],
  [memberLevels.ADVANCED]: ['douyin:basic', 'douyin:batch', 'transcribe:basic', 'monitor:basic', 'monitor:export', 'markdown:basic', 'markdown:column'],
  [memberLevels.PROFESSIONAL]: ['douyin:basic', 'douyin:batch', 'douyin:multi', 'transcribe:basic', 'transcribe:advanced', 'monitor:basic', 'monitor:advanced', 'monitor:export', 'markdown:basic', 'markdown:column', 'markdown:advanced', 'markdown:export']
};

// 功能配置定义
export const features = {
  // 视频提取相关功能
  videoExtract: {
    id: 'videoExtract',
    name: '视频提取',
    description: '从视频中提取关键信息',
    requiredPermission: 'douyin:basic',
    usageLimits: {
      [memberLevels.NORMAL]: 10,
      [memberLevels.ADVANCED]: 30,
      [memberLevels.PROFESSIONAL]: 100
    },
    upgradeMessage: '升级会员可提高每日视频提取次数'
  },
  
  // 视频转写相关功能
  videoTranscribe: {
    id: 'videoTranscribe',
    name: '视频转写',
    description: '将视频内容转写为文本',
    requiredPermission: 'transcribe:basic',
    usageLimits: {
      [memberLevels.NORMAL]: 5,
      [memberLevels.ADVANCED]: 15,
      [memberLevels.PROFESSIONAL]: 50
    },
    upgradeMessage: '升级专业版可使用高级视频转写功能'
  },
  
  // 批量处理功能
  videoBatch: {
    id: 'videoBatch',
    name: '批量处理',
    description: '批量处理多个视频',
    requiredPermission: 'douyin:batch',
    usageLimits: {
      [memberLevels.NORMAL]: 3,
      [memberLevels.ADVANCED]: 10,
      [memberLevels.PROFESSIONAL]: 30
    },
    upgradeMessage: '升级高级版及以上可使用批量处理功能'
  },
  
  // 多链接处理功能
  videoMulti: {
    id: 'videoMulti',
    name: '多链接处理',
    description: '处理多个视频链接',
    requiredPermission: 'douyin:multi',
    usageLimits: {
      [memberLevels.NORMAL]: 0,
      [memberLevels.ADVANCED]: 0,
      [memberLevels.PROFESSIONAL]: 30
    },
    upgradeMessage: '升级专业版可使用多链接处理功能'
  },
  
  // Markdown高级功能
  markdownAdvanced: {
    id: 'markdownAdvanced',
    name: 'Markdown高级功能',
    description: '使用高级Markdown编辑功能',
    requiredPermission: 'markdown:advanced',
    usageLimits: {
      [memberLevels.NORMAL]: 0,
      [memberLevels.ADVANCED]: 0,
      [memberLevels.PROFESSIONAL]: -1
    },
    upgradeMessage: '升级专业版可使用Markdown高级功能'
  },
  
  // Markdown列格式功能
  markdownColumn: {
    id: 'markdownColumn',
    name: 'Markdown列格式',
    description: '使用Markdown列格式功能',
    requiredPermission: 'markdown:column',
    usageLimits: {
      [memberLevels.NORMAL]: 0,
      [memberLevels.ADVANCED]: -1,
      [memberLevels.PROFESSIONAL]: -1
    },
    upgradeMessage: '升级高级版及以上可使用Markdown列格式功能'
  }
};

/**
 * 根据会员等级获取功能使用限制
 * @param {string} featureId 功能ID
 * @param {string} memberLevel 会员等级
 * @returns {number} 使用限制次数，-1表示无限制
 */
export function getFeatureUsageLimit(featureId, memberLevel) {
  const feature = features[featureId];
  if (!feature) return 0;
  
  // 如果未指定会员等级，默认为普通会员
  const level = memberLevel || memberLevels.NORMAL;
  
  // 返回对应会员等级的使用限制
  return feature.usageLimits[level] !== undefined 
    ? feature.usageLimits[level] 
    : 0;
}

/**
 * 获取所有功能的配置及其在指定会员等级下的使用限制
 * @param {string} memberLevel 会员等级
 * @returns {Array} 功能配置数组
 */
export function getAllFeaturesWithLimits(memberLevel) {
  // 如果未指定会员等级，默认为普通会员
  const level = memberLevel || memberLevels.NORMAL;
  
  return Object.values(features).map(feature => ({
    ...feature,
    usageLimit: feature.usageLimits[level] !== undefined 
      ? feature.usageLimits[level] 
      : 0,
    isAvailable: memberLevelPermissions[level].includes(feature.requiredPermission)
  }));
} 