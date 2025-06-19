/**
 * @Version    : v1.00
 * @Author     : Amon
 * @Date       : 20245-05-06
 * @desc       : 会员系统相关的API调用
 */
import axios from 'axios';
import { envConfig } from '../config/env';

// 创建axios实例
const api = axios.create({
  baseURL: envConfig.apiUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
api.interceptors.request.use(
  config => {
    // 从localStorage获取token
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  response => {
    return response.data;
  },
  error => {
    // 统一错误处理
    console.error('会员API请求错误:', error);
    
    // 如果是401错误，清除token并提示刷新页面
    if (error.response && error.response.status === 401) {
      console.error('Token已过期或无效，清除本地认证信息');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_info');
      localStorage.removeItem('token_expires_at');
      
      // 可以在这里触发页面刷新或重新初始化认证
      // 暂时只记录日志，避免影响其他功能
    }
    
    return Promise.reject(error);
  }
);

/**
 * 获取会员等级列表（新版）
 * @returns {Promise<Object>} 会员等级列表和价格信息
 */
export async function getMembershipLevelsNew() {
  try {
    const response = await api.get('/membership/levels/new');
    return response;
  } catch (error) {
    console.error('获取会员等级列表失败:', error);
    throw error;
  }
}

/**
 * 获取会员等级列表
 * @returns {Promise<Object>} 会员等级列表
 */
export async function getMembershipLevels() {
  try {
    const response = await api.get('/membership/levels');
    return response;
  } catch (error) {
    console.error('获取会员等级列表失败:', error);
    throw error;
  }
}

/**
 * 获取当前用户会员状态
 * @returns {Promise<Object>} 会员状态信息
 */
export async function getMembershipStatus() {
  try {
    const response = await api.get('/membership/status');
    return response;
  } catch (error) {
    console.error('获取会员状态失败:', error);
    throw error;
  }
}

/**
 * 创建会员订单
 * @param {Object} orderData 订单数据
 * @returns {Promise<Object>} 订单信息
 */
export async function createMembershipOrder(orderData) {
  try {
    const response = await api.post('/membership/orders', orderData);
    return response;
  } catch (error) {
    console.error('创建会员订单失败:', error);
    throw error;
  }
}

/**
 * 查询会员订单详情
 * @param {String} orderNo 订单号
 * @returns {Promise<Object>} 订单详情
 */
export async function getMembershipOrder(orderNo) {
  try {
    const response = await api.get(`/membership/orders/${orderNo}`);
    return response;
  } catch (error) {
    console.error('查询会员订单详情失败:', error);
    throw error;
  }
}

/**
 * 查询会员订单列表
 * @param {Object} params 查询参数
 * @returns {Promise<Object>} 订单列表
 */
export async function getMembershipOrders(params) {
  try {
    const response = await api.get('/membership/orders', { params });
    return response;
  } catch (error) {
    console.error('查询会员订单列表失败:', error);
    throw error;
  }
}

/**
 * 查询会员权益详情
 * @returns {Promise<Object>} 会员权益详情
 */
export async function getMembershipBenefits() {
  try {
    const response = await api.get('/membership/benefits');
    return response;
  } catch (error) {
    console.error('查询会员权益详情失败:', error);
    throw error;
  }
}

/**
 * 获取功能包列表
 * @param {Object} params 查询参数
 * @returns {Promise<Object>} 功能包列表
 */
export async function getFeaturePackages(params) {
  try {
    const response = await api.get('/packages/list', { params });
    return response;
  } catch (error) {
    console.error('获取功能包列表失败:', error);
    throw error;
  }
}

/**
 * 获取用户功能包列表
 * @returns {Promise<Object>} 用户功能包列表
 */
export async function getUserPackages() {
  try {
    const response = await api.get('/user/packages');
    return response;
  } catch (error) {
    console.error('获取用户功能包列表失败:', error);
    throw error;
  }
}

/**
 * 创建功能包订单
 * @param {Object} orderData 订单数据
 * @returns {Promise<Object>} 订单信息
 */
export async function createPackageOrder(orderData) {
  try {
    const response = await api.post('/packages/orders', orderData);
    return response;
  } catch (error) {
    console.error('创建功能包订单失败:', error);
    throw error;
  }
}

/**
 * 检查功能使用权限
 * @param {Object} params 检查参数
 * @returns {Promise<Object>} 权限检查结果
 */
export async function checkFeaturePermission(params) {
  try {
    const response = await api.post('/permission/check', params);
    return response;
  } catch (error) {
    console.error('检查功能使用权限失败:', error);
    throw error;
  }
}

/**
 * 记录功能使用日志
 * @param {Object} logData 日志数据
 * @returns {Promise<Object>} 记录结果
 */
export async function logFeatureUsage(logData) {
  try {
    const response = await api.post('/feature/log', logData);
    return response;
  } catch (error) {
    console.error('记录功能使用日志失败:', error);
    throw error;
  }
}

/**
 * 查询用户功能额度
 * @param {String} featureCode 功能代码
 * @returns {Promise<Object>} 额度信息
 */
export async function getUserQuota(featureCode) {
  try {
    const response = await api.get(`/user/quota?featureCode=${featureCode}`);
    return response;
  } catch (error) {
    console.error('查询用户功能额度失败:', error);
    throw error;
  }
}

/**
 * 获取积分余额
 * @returns {Promise<Object>} 积分余额信息
 */
export async function getPointsBalance() {
  try {
    const response = await api.get('/points/balance');
    return response;
  } catch (error) {
    console.error('获取积分余额失败:', error);
    throw error;
  }
}

/**
 * 查询积分交易记录
 * @param {Object} params 查询参数
 * @returns {Promise<Object>} 交易记录
 */
export async function getPointsTransactions(params) {
  try {
    const response = await api.get('/points/transactions', { params });
    return response;
  } catch (error) {
    console.error('查询积分交易记录失败:', error);
    throw error;
  }
}

/**
 * 创建积分充值订单
 * @param {Object} orderData 订单数据
 * @returns {Promise<Object>} 订单信息
 */
export async function createPointsPurchaseOrder(orderData) {
  try {
    const response = await api.post('/points/purchase', orderData);
    return response;
  } catch (error) {
    console.error('创建积分充值订单失败:', error);
    throw error;
  }
}

/**
 * 消费积分
 * @param {Object} consumeData 消费数据
 * @returns {Promise<Object>} 消费结果
 */
export async function consumePoints(consumeData) {
  try {
    const response = await api.post('/points/consume', consumeData);
    return response;
  } catch (error) {
    console.error('消费积分失败:', error);
    throw error;
  }
}

/**
 * 创建会员升级订单
 * @param {Object} orderData 订单数据 - 必须包含 level_id 和 payment_method
 * @returns {Promise<Object>} 订单信息
 */
export async function createMembershipUpgradeOrder(orderData) {
  try {
    // 参数验证
    if (!orderData.level_id) {
      throw new Error('缺少必需参数: level_id');
    }
    if (!orderData.payment_method) {
      throw new Error('缺少必需参数: payment_method');
    }
    
    console.log('创建会员升级订单请求参数:', orderData);
    const response = await api.post('/membership/upgrade', orderData);
    console.log('会员升级订单响应:', response);
    return response;
  } catch (error) {
    console.error('创建会员升级订单失败:', error);
    throw error;
  }
}

/**
 * 获取会员套餐列表
 * @returns {Promise<Object>} 会员套餐列表
 */
export async function getMembershipPackages() {
  try {
    console.log('获取会员套餐列表请求');
    const response = await api.get('/membership/packages');
    console.log('会员套餐列表响应:', response);
    return response;
  } catch (error) {
    console.error('获取会员套餐列表失败:', error);
    throw error;
  }
}

/**
 * 查询订单状态
 * @param {String} orderId 订单ID
 * @returns {Promise<Object>} 订单状态信息
 */
export async function getOrderStatus(orderId) {
  try {
    console.log('查询订单状态请求:', orderId);
    const response = await api.get(`/membership/order/${orderId}/status`);
    console.log('订单状态响应:', response);
    return response;
  } catch (error) {
    console.error('查询订单状态失败:', error);
    throw error;
  }
}

/**
 * 获取当前会员信息
 * @returns {Promise<Object>} 当前会员信息
 */
export async function getCurrentMembership() {
  try {
    console.log('获取当前会员信息请求');
    const response = await api.get('/membership/current');
    console.log('当前会员信息响应:', response);
    return response;
  } catch (error) {
    console.error('获取当前会员信息失败:', error);
    throw error;
  }
}

/**
 * 取消会员升级订单
 * @param {String} orderId 订单ID
 * @param {String} reason 取消原因
 * @returns {Promise<Object>} 取消结果
 */
export async function cancelMembershipUpgradeOrder(orderId, reason = '用户主动取消') {
  try {
    console.log('取消会员升级订单请求:', { orderId, reason });
    const response = await api.post(`/membership/order/${orderId}/cancel`, { reason });
    console.log('取消会员升级订单响应:', response);
    return response;
  } catch (error) {
    console.error('取消会员升级订单失败:', error);
    throw error;
  }
}

export default api; 