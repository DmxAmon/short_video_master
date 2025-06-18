/*
 * @Version    : v1.00
 * @Author     : Amon
 * @Date       : 20245-05-06
 * @desc       : 认证相关的API调用
 */
import axios from 'axios';
import { envConfig } from '../config/env';

// 创建axios实例
const api = axios.create({
  baseURL: envConfig.apiBaseUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
api.interceptors.request.use(
  config => {
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
    return response;
  },
  error => {
    if (error.response && error.response.status === 401) {
      // token过期或无效，清除本地存储
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_info');
    }
    return Promise.reject(error);
  }
);

// 刷新token
export async function refreshToken() {
  try {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('无刷新令牌');
    }

    const response = await api.post('/auth/refresh', {
      refresh_token: refreshToken
    });

    if (response.data && response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);
    }

    return response.data;
  } catch (error) {
    console.error('刷新令牌失败:', error);
    throw error;
  }
}

// 获取用户信息
export async function getUserInfo() {
  try {
    const response = await api.get('/auth/user');
    return response.data;
  } catch (error) {
    console.error('获取用户信息失败:', error);
    throw error;
  }
}

// 登出
export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch (error) {
    console.error('登出失败:', error);
  } finally {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_info');
  }
}

export default api; 