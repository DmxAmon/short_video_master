/**
 * @Version    : v1.00
 * @Author     : AI Codex
 * @Date       : 2024-05-15
 * @desc       : 权限检查中间件，用于在路由中验证用户权限
 */
import { checkPermission, logFeatureUsage, consumeQuota } from '../services/permission';
import { envConfig } from '../config/env';

/**
 * 创建权限检查中间件
 * @param {string} featureCode 功能代码
 * @param {Object} options 选项
 * @returns {Function} 中间件函数
 */
export function requirePermission(featureCode, options = {}) {
  const {
    amountParam = null, // 从请求中获取使用数量的参数名
    fixedAmount = 1,    // 固定使用数量
    autoConsume = true, // 自动消费额度
    strictCheck = true  // 严格检查（失败时返回错误）
  } = options;
  
  return async (req, res, next) => {
    try {
      // 获取用户信息
      const user = req.user;
      
      // 如果没有用户信息，直接拒绝
      if (!user) {
        return res.status(401).json({
          code: 401001,
          message: '未登录或登录已过期',
          data: null
        });
      }
      
      // 确定使用数量
      let amount = fixedAmount;
      if (amountParam) {
        // 从请求参数、查询参数或请求体中获取数量
        amount = parseInt(
          req.params[amountParam] || 
          req.query[amountParam] || 
          (req.body && req.body[amountParam]) || 
          fixedAmount
        );
      }
      
      // 检查权限
      const permissionResult = checkPermission(user, featureCode, amount);
      
      // 将权限检查结果添加到请求对象中，方便后续处理
      req.permissionCheck = permissionResult;
      
      // 如果没有权限且是严格检查模式，返回错误
      if (!permissionResult.hasPermission && strictCheck) {
        // 根据不同的失败原因返回不同的错误信息
        switch (permissionResult.reason) {
          case 'user_not_found':
            return res.status(401).json({
              code: 401001,
              message: permissionResult.message || '未登录或登录已过期',
              data: null
            });
            
          case 'insufficient_member_level':
            return res.status(403).json({
              code: 403001,
              message: permissionResult.message || '会员等级不足',
              data: {
                currentLevel: permissionResult.currentLevel,
                requiredLevel: permissionResult.requiredLevel,
                recommendedUpgrade: permissionResult.recommendedUpgrade
              }
            });
            
          case 'feature_not_allowed':
            return res.status(403).json({
              code: 403002,
              message: permissionResult.message || '没有使用该功能的权限',
              data: {
                requiredFeature: permissionResult.requiredFeature,
                recommendedUpgrade: permissionResult.recommendedUpgrade
              }
            });
            
          case 'quota_exceeded':
            return res.status(403).json({
              code: 403003,
              message: permissionResult.message || '使用额度不足',
              data: {
                quotaLeft: permissionResult.quotaLeft,
                recommendedAction: permissionResult.recommendedAction
              }
            });
            
          default:
            return res.status(403).json({
              code: 403000,
              message: '权限验证失败',
              data: permissionResult
            });
        }
      }
      
      // 如果有权限且需要自动消费额度
      if (permissionResult.hasPermission && autoConsume) {
        // 记录功能使用日志
        logFeatureUsage(user, featureCode, amount, permissionResult.source)
          .catch(error => console.error('记录功能使用失败:', error));
        
        // 消费额度
        consumeQuota(user, featureCode, amount, permissionResult.source)
          .catch(error => console.error('消费额度失败:', error));
      }
      
      // 继续处理请求
      next();
    } catch (error) {
      console.error('权限检查中间件错误:', error);
      res.status(500).json({
        code: 500001,
        message: '权限检查过程中发生错误',
        data: null
      });
    }
  };
}

/**
 * 创建会员等级检查中间件
 * @param {string} requiredLevel 所需会员等级
 * @returns {Function} 中间件函数
 */
export function requireMemberLevel(requiredLevel) {
  return (req, res, next) => {
    try {
      // 获取用户信息
      const user = req.user;
      
      // 如果没有用户信息，直接拒绝
      if (!user) {
        return res.status(401).json({
          code: 401001,
          message: '未登录或登录已过期',
          data: null
        });
      }
      
      // 会员等级权重
      const levelWeight = {
        'free': 0,
        'standard': 1,
        'premium': 2,
        'professional': 2 // 专业版与高级版同级
      };
      
      // 获取用户会员等级
      const userLevel = user.memberLevel || 'free';
      
      // 检查会员等级是否满足要求
      if ((levelWeight[userLevel] || 0) >= (levelWeight[requiredLevel] || 0)) {
        // 会员等级满足要求，继续处理请求
        return next();
      }
      
      // 会员等级不满足要求，返回错误
      const levelNames = {
        'free': '免费',
        'standard': '标准',
        'premium': '高级',
        'professional': '专业'
      };
      
      return res.status(403).json({
        code: 403001,
        message: `该功能需要${levelNames[requiredLevel] || requiredLevel}会员`,
        data: {
          currentLevel: userLevel,
          requiredLevel: requiredLevel,
          recommendedUpgrade: {
            level: requiredLevel,
            link: `/membership/buy?level=${requiredLevel}`
          }
        }
      });
    } catch (error) {
      console.error('会员等级检查中间件错误:', error);
      res.status(500).json({
        code: 500001,
        message: '会员等级检查过程中发生错误',
        data: null
      });
    }
  };
} 