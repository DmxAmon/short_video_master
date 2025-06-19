import axios from 'axios';
import { ElMessage } from 'element-plus';
import { envConfig } from '../config/env';
import { createLogger } from '../utils/logger';

// 创建API模块的日志记录器
const logger = createLogger('API');

// !! 确认后端API基础路径 !!
// 使用envConfig中的API地址配置，确保与环境配置一致
const API_BASE_URL = envConfig.apiUrl;

// 记录当前环境信息，便于问题排查
logger.info('API服务初始化', {
  environment: envConfig.isDevelopment ? '开发环境' : '生产环境',
  hostname: window.location.hostname,
  baseURL: API_BASE_URL,
  isGitHubPages: envConfig.currentDomain.isGitHubPages
});

const service = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 设置请求超时时间
  withCredentials: false, // 跨域请求不发送cookie
});

// 用于防止多个请求同时刷新令牌
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

// 处理队列中的请求
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  
  failedQueue = [];
};

// 刷新令牌函数
const refreshToken = async () => {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) {
    throw new Error('无刷新令牌');
  }

  try {
    logger.authEvent('开始刷新令牌');
    
    const response = await axios.post(`${API_BASE_URL}/plugin-auth/refresh`, {
      refresh_token: refreshToken
    });

    if (response.data.code !== 0) {
      throw new Error(response.data.message || '刷新令牌失败');
    }

    // 更新存储的令牌
    const { access_token, refresh_token: newRefreshToken } = response.data.data;
    localStorage.setItem('access_token', access_token);
    
    // 如果返回了新的刷新令牌，也更新它
    if (newRefreshToken) {
      localStorage.setItem('refresh_token', newRefreshToken);
    }

    logger.authEvent('令牌刷新成功');
    return access_token;
  } catch (error) {
    logger.error('刷新令牌失败', error);
    // 如果刷新失败，清除所有令牌
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_info');
    throw error;
  }
};

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    // 在发送请求之前做些什么
    const token = localStorage.getItem('access_token');
    
    logger.apiRequest(config.method || 'unknown', config.url || '', {
      params: config.params,
      data: config.data,
      hasToken: !!token
    });
    
    if (token) {
      // 让每个请求携带自定义token 请根据实际情况自行修改
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    // 确保请求头为 JSON
    config.headers['Content-Type'] = 'application/json';
    
    // 如果是直接请求到fsbk.dy2bcsm.cn，添加正确的Host头
    if (API_BASE_URL.includes('fsbk.dy2bcsm.cn')) {
      config.headers['Host'] = 'fsbk.dy2bcsm.cn';
    }
    
    return config;
  },
  (error) => {
    // 对请求错误做些什么
    logger.error('请求配置错误', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
service.interceptors.response.use(
  /**
   * 如果你想获取 http 响应头信息或状态码
   * 请 return response => response
   */
  (response) => {
    logger.apiResponse(
      response.config.method || 'unknown',
      response.config.url || '',
      response.status,
      { code: response.data?.code, message: response.data?.message }
    );
    
    const res = response.data;

    // 根据后端接口文档，code为0表示业务成功
    if (res.code !== 0) {
      // 检查是否为令牌过期错误码 401002
      if (res.code === 401002) {
        logger.authEvent('检测到令牌过期错误码401002，需要刷新令牌');
        
        // 对于401002错误码，返回Promise.reject，让响应拦截器的401处理逻辑来处理令牌刷新
        // 模拟401状态码错误，触发下方的令牌刷新逻辑
        const error = new Error('Token expired (401002)');
        (error as any).response = { 
          status: 401, 
          data: res,
          config: response.config 
        };
        (error as any).config = response.config;
        return Promise.reject(error);
      }
      
      // 其他业务错误处理
      ElMessage({
        message: res.message || '操作失败',
        type: 'error',
        duration: 5 * 1000,
      });

      // 如果是其他401相关错误或HTTP 401，特殊处理
      if (response.status === 401 || res.code === 401 || res.code === 401001 || res.code === 401003) {
        logger.authEvent('认证失效，需要刷新插件页面');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_info');
        // 触发全局事件或状态，通知应用需要重新认证
        window.location.reload(); // 简单粗暴的方式
      }

      // 将业务错误视为 Promise reject，以便调用方 catch
      return Promise.reject(new Error(res.message || 'Error'));
    } else {
      // 业务成功，直接返回后端响应的完整数据体
      // 让调用方根据需要解构 res.data
      return res;
    }
  },
  async (error) => {
    const originalRequest = error.config;
    
    logger.apiResponse(
      originalRequest?.method || 'unknown',
      originalRequest?.url || '',
      error.response?.status || 0,
      {
        error: error.message,
        responseData: error.response?.data
      }
    );
    
    // 处理401错误 - 尝试刷新令牌
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // 如果正在刷新，将请求加入队列
        logger.debug('令牌正在刷新中，请求加入队列', { url: originalRequest.url });
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return service(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshToken();
        processQueue(null, newToken);
        
        // 重试原请求
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        logger.debug('使用新令牌重试请求', { url: originalRequest.url });
        return service(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        
        // 刷新失败，清除令牌并重载页面
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_info');
        
        ElMessage({
          message: '登录已过期，请刷新插件页面',
          type: 'warning',
          duration: 3000,
        });
        
        logger.authEvent('令牌刷新失败，即将重载页面');
        
        // 延迟重载，让用户看到提示信息
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    let message = error.message;

    if (error.response) {
      // 请求已发出，但服务器响应的状态码不在 2xx 范围
      switch (error.response.status) {
        case 401:
          message = '认证已过期或未授权，正在尝试刷新...';
          break;
        case 403:
          message = '禁止访问，您可能没有足够权限';
          break;
        case 404:
          message = `请求资源未找到: ${error.config.url}`;
          break;
        case 500:
          message = '服务器内部错误，请联系管理员';
          break;
        case 502:
          message = '网关错误，可能是后端服务未启动或被拦截';
          break;
        case 503:
          message = '服务不可用，请稍后再试';
          break;
        case 504:
          message = '网关超时，请检查网络连接';
          break;
        default:
          message = `网络错误 (${error.response.status})`;
      }
      // 如果后端在 HTTP 错误时也返回了 JSON 消息体
      if (error.response.data && error.response.data.message) {
          message = error.response.data.message;
      }
    } else if (error.request) {
      // 请求已发出，但没有收到响应 (例如网络超时)
      message = '网络连接超时，请检查网络连接';
    } else {
      // 在设置请求时触发了一个错误
      message = '请求发送失败，请检查配置';
    }

    // 对于401错误，不显示错误消息，因为会自动处理
    if (error.response?.status !== 401) {
      ElMessage({
        message: message,
        type: 'error',
        duration: 5 * 1000,
      });
    }
    
    return Promise.reject(error); // 返回原始错误对象，或包装后的错误
  }
);

export default service; 