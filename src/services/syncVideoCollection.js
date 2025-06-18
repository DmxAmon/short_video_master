import { createLogger } from '../utils/logger';

// 创建模块日志记录器
const logger = createLogger('SYNC_VIDEO_COLLECTION');

/**
 * 同步视频采集服务
 * 用于单视频采集，直接返回结果，无需轮询
 */
export class SyncVideoCollectionService {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  /**
   * 同步采集视频数据
   * @param {Array<string>} urls - 视频链接数组
   * @param {Array<string>} fields - 需要的额外字段
   * @param {boolean} withTranscription - 是否启用转写
   * @returns {Promise<Object>} 采集结果
   */
  async collectVideos(urls, fields = [], withTranscription = false) {
    try {
      logger.info('开始同步采集视频', { urls, fields, withTranscription });
      
      // 构建API URL
      const apiUrl = `${this.baseUrl}/douyin/collect/video`;
      logger.info('API请求URL', { apiUrl });
      
      // 准备请求数据
      const requestData = {
        urls,
        fields,
        withTranscription
      };
      
      logger.info('发送请求数据', { requestData });
      
      // 发送请求
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      logger.info('收到响应', { status: response.status, statusText: response.statusText });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('HTTP请求失败', { status: response.status, statusText: response.statusText, errorText });
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      logger.info('解析响应数据', { data });
      
      if (data.code !== 0) {
        logger.error('API返回错误', { code: data.code, message: data.message, data });
        throw new Error(data.message || '采集失败');
      }

      // 验证返回的数据结构
      if (!data.data) {
        logger.error('API返回数据格式错误', { data });
        throw new Error('API返回的数据格式不正确');
      }

      const result = data.data;
      logger.info('同步采集成功', { 
        total: result.total, 
        videoCount: result.videos?.length || 0 
      });
      
      return result;
      
    } catch (error) {
      logger.error('同步采集失败', error);
      throw error;
    }
  }

  /**
   * 带进度回调的采集方法
   * @param {Array<string>} urls - 视频链接数组
   * @param {Array<string>} fields - 需要的额外字段
   * @param {boolean} withTranscription - 是否启用转写
   * @param {Object} callbacks - 回调函数集合
   * @returns {Promise<Object>} 采集结果
   */
  async collectWithProgress(urls, fields = [], withTranscription = false, callbacks = {}) {
    const {
      onStart = () => {},
      onProgress = () => {},
      onComplete = () => {},
      onError = () => {}
    } = callbacks;

    try {
      // 开始采集
      onStart();
      onProgress({ stage: 'preparing', progress: 10, message: '正在准备采集...' });

      // 执行同步采集
      onProgress({ stage: 'processing', progress: 30, message: '正在采集视频数据...' });
      const result = await this.collectVideos(urls, fields, withTranscription);

      // 采集完成
      onProgress({ stage: 'processing', progress: 90, message: '采集完成，正在处理数据...' });
      onComplete(result);
      
      return result;

    } catch (error) {
      onError(error);
      throw error;
    }
  }
}

// 创建单例实例
let syncVideoCollectionService = null;

/**
 * 获取同步视频采集服务实例
 * @returns {SyncVideoCollectionService}
 */
export function getSyncVideoCollectionService() {
  if (!syncVideoCollectionService) {
    const backendUrl = localStorage.getItem('api_base_url') || 'https://fsbk.dy2bcsm.cn/api';
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      throw new Error('未找到认证令牌');
    }
    
    syncVideoCollectionService = new SyncVideoCollectionService(`${backendUrl}`, token);
  }
  
  return syncVideoCollectionService;
}

/**
 * 重置服务实例（用于token更新等场景）
 */
export function resetSyncVideoCollectionService() {
  syncVideoCollectionService = null;
} 