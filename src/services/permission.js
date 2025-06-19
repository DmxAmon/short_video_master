/**
 * @Version    : v1.00
 * @Author     : AI Codex
 * @Date       : 2024-05-15
 * @desc       : 权限检查服务，用于验证用户是否有权限使用特定功能
 */
import { envConfig } from '../config/env';

/**
 * 检查用户是否有权限使用特定功能
 * @param {Object} user 用户信息
 * @param {string} featureCode 功能代码
 * @param {number} amount 使用数量，默认为1
 * @returns {Object} 检查结果
 */
export function checkPermission(user, featureCode, amount = 1) {
  // 检查用户是否存在
  if (!user || !user.id) {
    return {
      hasPermission: false,
      reason: 'user_not_found',
      message: '用户未登录或不存在'
    };
  }

  // 检查功能是否需要特定会员等级
  const requiredLevel = getRequiredMemberLevel(featureCode);
  if (requiredLevel && !hasSufficientMemberLevel(user.memberLevel, requiredLevel)) {
    return {
      hasPermission: false,
      reason: 'insufficient_member_level',
      message: `该功能需要${getMemberLevelName(requiredLevel)}会员`,
      requiredLevel: requiredLevel,
      currentLevel: user.memberLevel,
      recommendedUpgrade: {
        level: requiredLevel,
        link: `/membership/buy?level=${requiredLevel}`
      }
    };
  }

  // 检查用户是否有该功能的权限
  if (user.features && !user.features.includes(featureCode) && 
      !user.features.includes('all')) {
    return {
      hasPermission: false,
      reason: 'feature_not_allowed',
      message: '您没有使用该功能的权限',
      requiredFeature: featureCode,
      recommendedUpgrade: {
        level: requiredLevel || 'standard',
        link: `/membership/buy?level=${requiredLevel || 'standard'}`
      }
    };
  }

  // 检查功能使用额度
  const quotaCheck = checkQuotaLimit(user, featureCode, amount);
  if (!quotaCheck.hasQuota) {
    return {
      hasPermission: false,
      reason: 'quota_exceeded',
      message: quotaCheck.message,
      quotaLeft: quotaCheck.quotaLeft,
      recommendedAction: quotaCheck.recommendedAction
    };
  }

  // 所有检查通过，用户有权限使用该功能
  return {
    hasPermission: true,
    source: quotaCheck.source,
    consumedAmount: amount,
    quotaLeft: quotaCheck.quotaLeft,
    message: '权限验证通过'
  };
}

/**
 * 检查用户是否有足够的功能使用额度
 * @param {Object} user 用户信息
 * @param {string} featureCode 功能代码
 * @param {number} amount 使用数量
 * @returns {Object} 额度检查结果
 */
function checkQuotaLimit(user, featureCode, amount) {
  // 获取用户的配额限制
  const quotaLimits = user.quotaLimits || {};
  let quotaKey = '';
  
  // 根据功能代码确定对应的配额字段
  switch (featureCode) {
    case 'single_collect':
      quotaKey = 'single_video_collect_limit';
      break;
    case 'batch_collect':
      quotaKey = 'batch_video_collect_limit';
      break;
    case 'transcription':
      quotaKey = 'transcription_minutes';
      break;
    case 'markdown':
    case 'markdown:column':
    case 'markdown:advanced':
      quotaKey = 'markdown_limit';
      break;
    default:
      quotaKey = `${featureCode}_limit`;
  }
  
  // 获取会员额度
  const memberQuota = quotaLimits[quotaKey] || 0;
  
  // 获取功能包额度（实际项目中应从数据库或缓存获取）
  // 这里简化处理，假设功能包额度为0
  const packageQuota = 0;
  
  // 获取用户积分
  const points = user.points || 0;
  
  // 计算所需积分（简化处理，假设每单位功能消耗10积分）
  const pointsPerUnit = getPointsPerUnit(featureCode);
  const requiredPoints = amount * pointsPerUnit;
  
  // 检查会员额度
  if (memberQuota >= amount) {
    return {
      hasQuota: true,
      source: 'member',
      message: '使用会员额度',
      quotaLeft: {
        memberQuota: memberQuota - amount,
        packageQuota: packageQuota,
        points: points
      }
    };
  }
  
  // 检查功能包额度
  if (packageQuota >= amount) {
    return {
      hasQuota: true,
      source: 'package',
      message: '使用功能包额度',
      quotaLeft: {
        memberQuota: memberQuota,
        packageQuota: packageQuota - amount,
        points: points
      }
    };
  }
  
  // 检查积分是否足够
  if (points >= requiredPoints) {
    return {
      hasQuota: true,
      source: 'points',
      message: `使用${requiredPoints}积分`,
      quotaLeft: {
        memberQuota: memberQuota,
        packageQuota: packageQuota,
        points: points - requiredPoints
      }
    };
  }
  
  // 所有额度都不足
  return {
    hasQuota: false,
    message: '您的使用额度不足',
    quotaLeft: {
      memberQuota: memberQuota,
      packageQuota: packageQuota,
      points: points
    },
    recommendedAction: {
      upgradeLink: `/membership/buy?level=${user.memberLevel === 'standard' ? 'premium' : 'standard'}`,
      packageLink: `/packages?feature=${featureCode}`,
      pointsLink: '/points/buy'
    }
  };
}

/**
 * 获取功能所需的会员等级
 * @param {string} featureCode 功能代码
 * @returns {string|null} 所需会员等级，如果不需要特定等级则返回null
 */
function getRequiredMemberLevel(featureCode) {
  // 功能与所需会员等级的映射
  const featureLevelMap = {
    'single_collect': null, // 所有用户都可以使用，但有额度限制
    'batch_collect': 'standard', // 需要标准会员
    'transcription': null, // 所有用户都可以使用，但有额度限制
    'markdown': null, // 基础markdown所有用户可用
    'markdown:column': 'standard', // 列格式需要标准会员
    'markdown:advanced': 'premium', // 高级功能需要高级会员
    'extract': 'standard', // 提取功能需要标准会员
    'download': 'standard' // 下载功能需要标准会员
  };
  
  return featureLevelMap[featureCode] || null;
}

/**
 * 检查用户会员等级是否满足要求
 * @param {string} userLevel 用户会员等级
 * @param {string} requiredLevel 所需会员等级
 * @returns {boolean} 是否满足要求
 */
function hasSufficientMemberLevel(userLevel, requiredLevel) {
  // 会员等级权重
  const levelWeight = {
    'free': 0,
    'standard': 1,
    'premium': 2,
    'professional': 2 // 专业版与高级版同级
  };
  
  // 如果用户等级权重大于等于所需等级权重，则满足要求
  return (levelWeight[userLevel] || 0) >= (levelWeight[requiredLevel] || 0);
}

/**
 * 获取会员等级的显示名称
 * @param {string} level 会员等级代码
 * @returns {string} 会员等级名称
 */
function getMemberLevelName(level) {
  const levelNames = {
    'free': '免费',
    'standard': '标准',
    'premium': '高级',
    'professional': '专业'
  };
  
  return levelNames[level] || level;
}

/**
 * 获取功能每单位所需积分 - 生产环境真实价格
 * @param {string} featureCode 功能代码
 * @returns {number} 每单位所需积分
 */
function getPointsPerUnit(featureCode) {
  // 功能与积分消耗的映射 - 与前端展示的规则保持一致
  const pointsMap = {
    'single_collect': 10,          // 抖音单视频数据提取：10积分/个视频
    'batch_collect': 1,            // 抖音作者主页批量采集：1积分/个视频
    'multi_collect': 10,           // 抖音多链接批量提取：10积分/个链接
    'transcription': 1,            // 基础视频转写功能：1积分/秒钟
    'transcription:advanced': 2,   // 高级视频转写功能：2积分/秒钟
    'markdown': 5,                 // 基础Markdown功能：5积分/次
    'markdown:column': 5,          // 数据导出功能：5积分/次
    'markdown:advanced': 5,        // 高级Markdown功能：5积分/次
    'extract': 5,                  // 数据导出功能：5积分/次
    'download': 5                  // 下载功能：5积分/次
  };
  
  return pointsMap[featureCode] || 10; // 默认10积分/单位
}

/**
 * 记录功能使用日志
 * @param {Object} user 用户信息
 * @param {string} featureCode 功能代码
 * @param {number} amount 使用数量
 * @param {string} source 额度来源：member/package/points
 * @returns {Promise<Object>} 记录结果
 */
export async function logFeatureUsage(user, featureCode, amount, source) {
  // 记录功能使用日志到后端
  console.log(`用户 ${user.id || user.sub} 使用了 ${featureCode} 功能，数量: ${amount}，来源: ${source}`);
  
  // 调用真实API记录使用日志
  try {
    const response = await fetch('/api/usage/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      },
      body: JSON.stringify({
        userId: user.id || user.sub,
        featureCode,
        amount,
        source
      })
    });
    
    if (response.ok) {
      return {
        success: true,
        message: '记录功能使用成功'
      };
    } else {
      throw new Error('API调用失败');
    }
  } catch (error) {
    console.error('记录功能使用失败:', error);
    return {
      success: false,
      message: '记录功能使用失败'
    };
  }
}

/**
 * 消费用户功能使用额度
 * @param {Object} user 用户信息
 * @param {string} featureCode 功能代码
 * @param {number} amount 使用数量
 * @param {string} source 额度来源：member/package/points
 * @returns {Promise<Object>} 消费结果
 */
export async function consumeQuota(user, featureCode, amount, source) {
  // 调用后端API消费额度
  console.log(`用户 ${user.id || user.sub} 消费了 ${featureCode} 功能额度，数量: ${amount}，来源: ${source}`);
  
  // 调用真实API消费额度
  try {
    const response = await fetch('/api/quota/consume', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      },
      body: JSON.stringify({
        userId: user.id || user.sub,
        featureCode,
        amount,
        source
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: '消费额度成功',
        remainingQuota: data.remainingQuota || {
          memberQuota: 0,
          packageQuota: 0,
          points: 0
        }
      };
    } else {
      throw new Error('API调用失败');
    }
  } catch (error) {
    console.error('消费额度失败:', error);
    return {
      success: false,
      message: '消费额度失败'
    };
  }
} 