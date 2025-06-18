import axios from 'axios';
import { envConfig } from '../config/env';

// 创建axios实例
const api = axios.create({
  baseURL: envConfig.apiUrl,
  timeout: 30000, // 支付相关接口需要更长的超时时间
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
    
    console.log(`[支付API] 请求: ${config.method?.toUpperCase()} ${config.url}`, config.data);
    return config;
  },
  error => {
    console.error('[支付API] 请求错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  response => {
    console.log(`[支付API] 响应:`, response.data);
    return response.data;
  },
  error => {
    console.error('[支付API] 响应错误:', error);
    
    // 统一处理认证错误
    if (error.response && error.response.status === 401) {
      console.error('Token已过期或无效，清除本地认证信息');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_info');
      localStorage.removeItem('token_expires_at');
      
      // 跳转到登录页面
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

/**
 * 获取支付方式列表
 * @returns {Promise} 支付方式列表
 */
export const getPaymentMethods = async () => {
  try {
    const response = await api.get('/payment/methods');
    return response;
  } catch (error) {
    console.error('获取支付方式列表失败:', error);
    throw error;
  }
};

/**
 * 创建支付订单
 * @param {Object} data 订单数据
 * @param {number} data.package_id 积分套餐ID
 * @param {string} data.payment_type 支付方式 alipay/wxpay
 * @returns {Promise} 支付订单信息（包含二维码）
 */
export const createPaymentOrder = async (data) => {
  try {
    console.log('[支付API] 创建支付订单:', data);
    const response = await api.post('/payment/create', data);
    return response;
  } catch (error) {
    console.error('创建支付订单失败:', error);
    throw error;
  }
};

/**
 * 查询支付状态
 * @param {string} orderNo 订单号
 * @returns {Promise} 支付状态信息
 */
export const getPaymentStatus = async (orderNo) => {
  try {
    const response = await api.get(`/payment/status/${orderNo}`);
    return response;
  } catch (error) {
    console.error('查询支付状态失败:', error);
    throw error;
  }
};

/**
 * 取消支付订单
 * @param {string} orderNo 订单号
 * @param {string} reason 取消原因
 * @returns {Promise} 取消结果
 */
export const cancelPaymentOrder = async (orderNo, reason = '用户主动取消') => {
  try {
    const response = await api.post(`/payment/cancel/${orderNo}`, { reason });
    return response;
  } catch (error) {
    console.error('取消支付订单失败:', error);
    throw error;
  }
};

/**
 * 获取订单详情
 * @param {string} orderNo 订单号
 * @returns {Promise} 订单详情
 */
export const getOrderDetail = async (orderNo) => {
  try {
    const response = await api.get(`/payment/order/${orderNo}`);
    return response;
  } catch (error) {
    console.error('获取订单详情失败:', error);
    throw error;
  }
}; 