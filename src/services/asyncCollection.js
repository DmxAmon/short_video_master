import { createLogger } from '../utils/logger';

// 创建日志记录器
const logger = createLogger('ASYNC_COLLECTION');

/**
 * 异步采集管理器
 */
export class AsyncCollectionManager {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl;
    this.token = token;
    this.pollingInterval = 3000; // 3秒轮询一次
    this.maxPollingTime = 300000; // 最多轮询5分钟
  }

  /**
   * 启动异步采集任务
   * @param {Array} urls - 链接数组
   * @param {Array} fields - 字段数组
   * @param {boolean} withTranscription - 是否转写
   * @param {string} mode - 采集模式 'video' 或 'author'
   * @returns {Promise<string>} 任务ID
   */
  async startCollection(urls, fields, withTranscription = false, mode = 'author') {
    try {
      logger.info('启动异步采集任务', { urls, fields, withTranscription, mode });
      
      // 根据模式选择不同的端点 - 修改为正确的API路径
      let endpoint;
      if (withTranscription) {
        // 转写模式使用专门的转写API
        endpoint = '/collect/transcribe';
      } else {
        // 普通采集模式
        endpoint = mode === 'video' ? '/collect/video' : '/collect/author';
      }
      
      const apiUrl = `${this.baseUrl}${endpoint}`;
      logger.info('API请求URL', { apiUrl });
      
      const requestData = {
        urls,
        fields,
        withTranscription
      };
      
      // 如果是作者模式，添加最大视频数量参数
      if (mode === 'author') {
        requestData.maxVideosPerAuthor = 50; // 可以根据会员等级调整
      }
      
      logger.info('发送请求数据', { requestData });
      
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
        throw new Error(data.message || '启动任务失败');
      }

      // 验证返回的数据结构
      if (!data.data || !data.data.taskId) {
        logger.error('API返回数据格式错误', { data });
        throw new Error('API返回的数据格式不正确，缺少taskId');
      }

      const taskId = data.data.taskId;
      logger.info('任务启动成功', { taskId, fullResponse: data });
      
      return taskId;
    } catch (error) {
      logger.error('启动采集任务失败', error);
      throw error;
    }
  }

  /**
   * 查询任务状态
   * @param {string} taskId - 任务ID
   * @returns {Promise<Object>} 任务状态和结果
   */
  async getTaskStatus(taskId) {
    try {
      // 使用正确的API路径，与示例文档保持一致
      const statusUrl = `${this.baseUrl}/task/${taskId}`;
      logger.info('查询任务状态', { taskId, statusUrl });
      
      const response = await fetch(statusUrl, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      logger.info('状态查询响应', { status: response.status, statusText: response.statusText });

      if (!response.ok) {
        if (response.status === 404) {
          logger.warn('任务不存在', { taskId, statusUrl });
          throw new Error('任务不存在或已过期');
        }
        const errorText = await response.text();
        logger.error('状态查询失败', { status: response.status, statusText: response.statusText, errorText, taskId, statusUrl });
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      logger.info('状态查询结果', { data, taskId });
      
      if (data.code !== 0) {
        logger.error('状态查询API返回错误', { code: data.code, message: data.message, data, taskId });
        throw new Error(data.message || '查询任务状态失败');
      }

      // 验证返回的数据结构
      if (!data.data) {
        logger.error('状态查询返回数据格式错误', { data, taskId });
        throw new Error('状态查询返回的数据格式不正确');
      }

      return data.data;
    } catch (error) {
      logger.error('查询任务状态失败', error);
      throw error;
    }
  }

  /**
   * 轮询等待任务完成
   * @param {string} taskId - 任务ID
   * @param {Function} onProgress - 进度回调函数
   * @returns {Promise<Object>} 最终结果
   */
  async waitForCompletion(taskId, onProgress = null) {
    const startTime = Date.now();
    let pollCount = 0;

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          pollCount++;
          const currentTime = Date.now();
          const elapsedTime = currentTime - startTime;
          
          // 检查是否超时
          if (elapsedTime > this.maxPollingTime) {
            reject(new Error('任务处理超时，请稍后重试'));
            return;
          }

          logger.info(`第${pollCount}次查询任务状态`, { taskId, elapsedTime });
          const result = await this.getTaskStatus(taskId);

          // 调用进度回调
          if (onProgress) {
            onProgress({
              status: result.status,
              pollCount,
              elapsedTime,
              progress: result.progress || 0,
              message: result.message || '处理中...'
            });
          }

          if (result.status === 'completed') {
            logger.info('任务完成', { taskId, totalTime: elapsedTime });
            resolve(result);
          } else if (result.status === 'failed') {
            const errorMsg = result.error || result.message || '任务处理失败';
            logger.error('任务失败', { taskId, error: errorMsg });
            reject(new Error(errorMsg));
          } else if (result.status === 'processing' || result.status === 'pending') {
            // 继续轮询
            setTimeout(poll, this.pollingInterval);
          } else {
            reject(new Error(`未知的任务状态: ${result.status}`));
          }
        } catch (error) {
          logger.error('轮询过程出错', error);
          reject(error);
        }
      };

      // 开始轮询
      poll();
    });
  }

  /**
   * 完整的异步采集流程
   * @param {Array} urls - 链接数组
   * @param {Array} fields - 字段数组
   * @param {boolean} withTranscription - 是否转写
   * @param {string} mode - 采集模式
   * @param {Object} callbacks - 回调函数集合
   * @returns {Promise<Object>} 采集结果
   */
  async collectWithProgress(urls, fields, withTranscription = false, mode = 'author', callbacks = {}) {
    const {
      onStart = () => {},
      onProgress = () => {},
      onComplete = () => {},
      onError = () => {}
    } = callbacks;

    try {
      // 第一步：启动任务
      onStart();
      const taskId = await this.startCollection(urls, fields, withTranscription, mode);

      // 第二步：等待完成
      const result = await this.waitForCompletion(taskId, (progress) => {
        onProgress({
          taskId,
          ...progress
        });
      });

      // 第三步：处理完成
      onComplete(result);
      return result;

    } catch (error) {
      onError(error);
      throw error;
    }
  }
}

// 创建单例实例
let asyncCollectionManager = null;

/**
 * 获取异步采集管理器实例
 * @returns {AsyncCollectionManager}
 */
export function getAsyncCollectionManager() {
  if (!asyncCollectionManager) {
    const backendUrl = localStorage.getItem('api_base_url') || 'https://fsbk.dy2bcsm.cn/api';
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      throw new Error('未找到认证令牌');
    }
    
    asyncCollectionManager = new AsyncCollectionManager(`${backendUrl}/douyin`, token);
  }
  
  return asyncCollectionManager;
}

/**
 * 重置管理器实例（用于token更新等场景）
 */
export function resetAsyncCollectionManager() {
  asyncCollectionManager = null;
} 