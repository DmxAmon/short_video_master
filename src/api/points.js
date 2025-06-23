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
    console.error('🔥 积分API请求错误:', error);
    
    // 将401错误信息传递给调用方处理，不在这里直接刷新页面
    // 让会员页面统一处理token过期逻辑
    if (error.response && error.response.status === 401) {
      console.error('🔐 积分API检测到Token过期，传递给上层处理');
      // 不在这里清除token和刷新页面，交给上层统一处理
    }
    
    return Promise.reject(error);
  }
);

/**
 * 获取积分套餐列表
 * @returns {Promise} 积分套餐列表
 */
export const getPointsPackages = async () => {
  try {
    const response = await api.get('/points/packages');
    return response;
  } catch (error) {
    console.error('获取积分套餐列表失败:', error);
    throw error;
  }
};

/**
 * 获取单个积分套餐详情
 * @param {number} packageId 套餐ID
 * @returns {Promise} 套餐详情
 */
export const getPointsPackageDetail = async (packageId) => {
  try {
    const response = await api.get(`/points/packages/${packageId}`);
    return response;
  } catch (error) {
    console.error('获取积分套餐详情失败:', error);
    throw error;
  }
};

/**
 * 创建积分充值订单
 * @param {Object} data 订单数据
 * @param {number} data.package_id 套餐ID
 * @param {string} data.payment_method 支付方式
 * @returns {Promise} 订单信息
 */
export const createPointsOrder = async (data) => {
  try {
    const response = await api.post('/points/purchase', data);
    return response;
  } catch (error) {
    console.error('创建积分充值订单失败:', error);
    throw error;
  }
};

/**
 * 确认支付并完成充值
 * @param {string} orderId 订单号
 * @param {Object} data 支付信息
 * @returns {Promise} 充值结果
 */
export const confirmPointsPayment = async (orderId, data) => {
  try {
    const response = await api.post(`/points/purchase/${orderId}/confirm`, data);
    return response;
  } catch (error) {
    console.error('确认支付失败:', error);
    throw error;
  }
};

/**
 * 取消积分充值订单
 * @param {string} orderId 订单号
 * @param {Object} data 取消原因
 * @returns {Promise} 取消结果
 */
export const cancelPointsOrder = async (orderId, data) => {
  try {
    const response = await api.post(`/points/purchase/${orderId}/cancel`, data);
    return response;
  } catch (error) {
    console.error('取消订单失败:', error);
    throw error;
  }
};

/**
 * 查询订单状态
 * @param {string} orderId 订单号
 * @returns {Promise} 订单状态
 */
export const getOrderStatus = async (orderId) => {
  try {
    const response = await api.get(`/points/purchase/${orderId}/status`);
    return response;
  } catch (error) {
    console.error('查询订单状态失败:', error);
    throw error;
  }
};

/**
 * 获取积分充值历史
 * @param {Object} params 查询参数
 * @param {number} params.page 页码
 * @param {number} params.pageSize 每页数量
 * @returns {Promise} 充值历史
 */
export const getPointsHistory = async (params) => {
  try {
    const response = await api.get('/points/purchase/history', { params });
    return response;
  } catch (error) {
    console.error('获取积分充值历史失败:', error);
    throw error;
  }
}; 