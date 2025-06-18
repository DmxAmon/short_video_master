import service from './request'; // 引入封装的axios实例
import axios from 'axios';

// 定义一个类型用于API响应
interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

// 定义登录响应的数据结构
interface LoginResponseData {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: any;
  is_new_user?: boolean;
}

// 定义刷新令牌响应的数据结构
interface RefreshTokenResponseData {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

/**
 * 使用刷新令牌获取新的访问令牌
 */
export async function refreshToken() {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) {
    throw new Error('无刷新令牌');
  }

  try {
    const { data: response } = await service.post('/plugin-auth/refresh', {
      refresh_token: refreshToken
    });

    if (response.code !== 0) {
      throw new Error(response.message || '刷新令牌失败');
    }

    // 更新存储的令牌
    const { access_token, refresh_token } = response.data;
    localStorage.setItem('access_token', access_token);
    
    // 如果返回了新的刷新令牌，也更新它
    if (refresh_token) {
      localStorage.setItem('refresh_token', refresh_token);
    }

    return response.data;
  } catch (error) {
    console.error('刷新令牌失败:', error);
    // 如果刷新失败，清除所有令牌
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_info');
    throw error;
  }
}

/**
 * 调用后端接口获取当前登录用户信息
 */
export async function getCurrentUserInfo() {
  try {
    const { data: response } = await service.get('/plugin-auth/user');

    // 后端返回 code !== 0 表示失败
    if (response.code !== 0) {
       throw new Error(response.message || '获取用户信息失败');
    }

    // 更新本地存储的用户信息
    localStorage.setItem('user_info', JSON.stringify(response.data));
    console.log('获取用户信息成功:', response.data);
    return response.data; // 返回用户信息
  } catch (error) {
     console.error('获取用户信息失败:', error);
     // 如果获取失败且状态码是 401，意味着token无效
     if (axios.isAxiosError(error) && error.response?.status === 401) {
         console.log('Token无效或过期，清除本地存储');
         localStorage.removeItem('access_token');
         localStorage.removeItem('refresh_token');
         localStorage.removeItem('user_info');
     }
     throw error; // 重新抛出错误
  }
}

/**
 * 登出
 */
export async function logout() {
  try {
    // 可选：调用后端登出接口
    await service.post('/plugin-auth/logout');
  } catch (error) {
    console.error('登出接口调用失败:', error);
    // 即使接口调用失败，也继续清理本地存储
  } finally {
    // 清理本地存储
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_info');
  }
}

/**
 * 获取积分余额
 */
export async function getPointsBalance() {
  try {
    const { data: response } = await service.get('/points/balance');
    if (response.code !== 0) {
      throw new Error(response.message || '查询积分余额失败');
    }
    return response.data; // 返回积分数据
  } catch (error) {
    console.error('查询积分余额失败:', error);
    throw error;
  }
}

/**
 * 提交抖音作者视频采集请求
 * @param url 作者主页URL
 * @param fields 需要采集的字段列表
 */
export async function collectAuthorVideos(url: string, fields: string[]) {
  try {
    const { data: response } = await service.post('/douyin/author', { url, fields });
    if (response.code !== 0) {
      throw new Error(response.message || '采集数据失败');
    }
    return response.data; // 返回采集结果
  } catch (error) {
    console.error('采集数据失败:', error);
    throw error;
  }
} 