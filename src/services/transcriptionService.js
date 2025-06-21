import { createLogger } from '../utils/logger';
import axios from 'axios';

// 创建日志记录器
const logger = createLogger('TRANSCRIPTION_SERVICE');

/**
 * 转写服务类
 * 按照转写结果前端交互文档实现
 */
export class TranscriptionService {
  constructor() {
    this.baseUrl = localStorage.getItem('api_base_url') || 'https://fsbk.dy2bcsm.cn';
    this.pollingInterval = 3000; // 3秒轮询间隔
    this.maxPollingTime = 10 * 60 * 1000; // 10分钟最大轮询时间
    this.currentTaskId = null; // 🚀 当前正在处理的任务ID
  }

  /**
   * 获取认证头
   */
  getAuthHeaders() {
    const token = localStorage.getItem('access_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * 启动转写任务
   * @param {Array} videoRecords - 视频记录数组
   * @param {string} strategy - 处理策略：batch | sequential
   * @param {number} maxConcurrent - 最大并发数
   * @returns {Promise<Object>} 任务信息
   */
  async startTranscription(videoRecords, strategy = 'batch', maxConcurrent = 10) {
    try {
      logger.info('启动转写任务', { 
        recordCount: videoRecords.length, 
        strategy, 
        maxConcurrent 
      });

      const requestData = {
        video_records: videoRecords,
        strategy,
        max_concurrent: maxConcurrent
      };

      // 🔍 添加详细调试日志
      logger.info('🌐 发送转写请求', {
        url: `${this.baseUrl}/api/transcription/start-by-video-ids`,
        requestData
      });

      const response = await axios.post(
        `${this.baseUrl}/api/transcription/start-by-video-ids`,
        requestData,
        { headers: this.getAuthHeaders() }
      );

      // 🔍 打印完整响应数据
      logger.info('📦 后端返回的完整数据', {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        dataType: typeof response.data
      });

      // ✅ 正确的解析逻辑
      if (response.data.code === 0 && response.data.data && response.data.data.task_id) {
        const taskId = response.data.data.task_id;
        this.currentTaskId = taskId; // 🚀 保存当前任务ID
        logger.info('✅ 成功获取任务ID', { taskId });
        
        // 返回正确的数据结构
        return {
          task_id: taskId,
          status: response.data.data.status,
          total_records: response.data.data.total_records,
          estimated_time: response.data.data.estimated_time
        };
      } else {
        logger.error('❌ 无法获取任务ID', {
          code: response.data.code,
          message: response.data.message,
          data: response.data.data,
          hasTaskId: !!(response.data.data && response.data.data.task_id)
        });
        throw new Error(response.data.message || '启动转写任务失败');
      }

    } catch (error) {
      logger.error('🚨 启动转写任务异常', error);
      throw error;
    }
  }

  /**
   * 检查转写状态
   * @param {string} taskId - 任务ID
   * @returns {Promise<Object>} 状态信息
   */
  async checkStatus(taskId) {
    try {
      logger.info('🔍 检查转写状态', { taskId });

      const response = await axios.get(
        `${this.baseUrl}/api/transcription/status/${taskId}`,
        { headers: this.getAuthHeaders() }
      );

      // 🔍 打印状态响应数据
      logger.info('📦 状态查询响应', {
        taskId,
        status: response.status,
        data: response.data
      });

      // ✅ 正确解析状态数据
      if (response.data.code === 0 && response.data.data) {
        return response.data.data;
      } else {
        logger.error('❌ 状态查询失败', {
          taskId,
          code: response.data.code,
          message: response.data.message
        });
        throw new Error(response.data.message || '查询转写状态失败');
      }
    } catch (error) {
      logger.error('🚨 检查转写状态异常', { taskId, error });
      throw error;
    }
  }

  /**
   * 获取转写结果
   * @param {string} taskId - 任务ID
   * @returns {Promise<Array>} 转写结果数组
   */
  async getResults(taskId) {
    try {
      logger.info('🔍 获取转写结果', { taskId });

      const response = await axios.get(
        `${this.baseUrl}/api/transcription/result/${taskId}`,
        { headers: this.getAuthHeaders() }
      );

      // 🔍 打印结果响应数据
      logger.info('📦 结果查询响应', {
        taskId,
        status: response.status,
        data: response.data,
        resultsCount: response.data.data?.results?.length || 0
      });

      // ✅ 正确解析结果数据
      if (response.data.code === 0 && response.data.data) {
        const results = response.data.data.results || [];
        logger.info('✅ 获取转写结果成功', { 
          taskId, 
          resultsCount: results.length
        });
        return results;
      } else {
        logger.error('❌ 结果查询失败', {
          taskId,
          code: response.data.code,
          message: response.data.message
        });
        throw new Error(response.data.message || '获取转写结果失败');
      }
    } catch (error) {
      logger.error('🚨 获取转写结果异常', { taskId, error });
      throw error;
    }
  }

  /**
   * 轮询转写进度（支持实时显示和分批推送）
   * @param {string} taskId - 任务ID
   * @param {Function} progressCallback - 进度回调函数
   * @param {Function} realtimeCallback - 实时结果回调函数
   * @returns {Promise<Array>} 最终转写结果
   */
  async pollProgress(taskId, progressCallback, realtimeCallback) {
    const startTime = Date.now();
    
    // 用于跟踪已处理的结果，避免重复处理
    let lastResultCount = 0;
    const allResults = [];
    
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          // 检查超时
          if (Date.now() - startTime > this.maxPollingTime) {
            reject(new Error('转写任务超时'));
            return;
          }

          const status = await this.checkStatus(taskId);
          
          // 🚀 处理实时结果（新的分批推送格式）
          if (status.results && status.results.length > lastResultCount) {
            const newResults = status.results.slice(lastResultCount);
            
            logger.info('📝 收到新的转写结果', {
              taskId,
              newCount: newResults.length,
              totalCount: status.results.length,
              lastResultCount
            });
            
            // 处理新结果
            newResults.forEach(result => {
              allResults.push(result);
              
              // 调用实时回调显示新结果
              if (realtimeCallback) {
                realtimeCallback({
                  type: 'transcription_item_complete',
                  result: result,
                  progress: {
                    completed: status.completed_count || 0,
                    total: status.total_count || 0
                  },
                  isFinal: false
                });
              }
            });
            
            lastResultCount = status.results.length;
          }
          
          // 🚀 处理传统的实时结果（兼容性）
          if (status.realtime_results && status.realtime_results.length > 0) {
            status.realtime_results.forEach(item => {
              if (item.type === 'transcription_item_complete') {
                const result = item.result;
                
                // 检查是否已存在（避免重复）
                const existingIndex = allResults.findIndex(r => r.record_id === result.record_id);
                if (existingIndex === -1) {
                  allResults.push(result);
                  
                  if (realtimeCallback) {
                    realtimeCallback({
                      type: 'transcription_item_complete',
                      result: result,
                      progress: item.progress,
                      isFinal: false
                    });
                  }
                }
              }
            });
          }
          
          // 调用进度回调（支持新的批次信息）
          if (progressCallback) {
            let progressMessage = status.message || `正在转写 ${status.completed_count || 0}/${status.total_count || 0} 个视频...`;
            
            // 🚀 支持批次进度信息
            if (status.batch_info) {
              progressMessage = `正在转写第${status.batch_info.current_batch}/${status.batch_info.total_batches}批 (${status.completed_count || 0}/${status.total_count || 0}) - ${status.progress || 0}%`;
            }
            
            progressCallback({
              stage: 'processing',
              progress: status.progress || 0,
              message: progressMessage,
              completedCount: status.completed_count || 0,
              totalCount: status.total_count || 0,
              failedCount: status.failed_count || 0,
              fallbackCount: status.fallback_count || 0,
              // 🚀 新增：批次信息
              batchInfo: status.batch_info,
              // 🚀 新增：积分统计
              pointsStatistics: status.points_statistics,
              // 🚀 实时统计信息（基于当前已收到的结果）
              realtimeStats: {
                processedCount: allResults.length,
                successCount: allResults.filter(r => r.status === 'completed' && !r.is_fallback).length,
                fallbackCount: allResults.filter(r => r.is_fallback).length,
                failedCount: allResults.filter(r => r.status === 'failed').length
              }
            });
          }

          if (status.status === 'completed') {
            // 转写完成，确保获取所有结果
            this.currentTaskId = null; // 🚀 清空当前任务ID
            logger.info('🎉 转写任务完成', { 
              taskId, 
              currentResultsCount: allResults.length,
              expectedCount: status.total_count,
              statusResultsCount: status.results?.length || 0
            });
            
            // 如果状态中的结果比当前收集的多，补充遗漏的结果
            if (status.results && status.results.length > allResults.length) {
              const missingResults = status.results.slice(allResults.length);
              missingResults.forEach(result => {
                allResults.push(result);
                if (realtimeCallback) {
                  realtimeCallback({
                    type: 'transcription_item_complete',
                    result: result,
                    progress: {
                      completed: status.completed_count,
                      total: status.total_count
                    },
                    isFinal: true
                  });
                }
              });
            }
            
            // 如果还是缺少结果，尝试从结果接口获取
            if (allResults.length < status.total_count) {
              try {
              const finalResults = await this.getResults(taskId);
              
                // 补充遗漏的结果
              finalResults.forEach(result => {
                  const existingIndex = allResults.findIndex(r => r.record_id === result.record_id);
                  if (existingIndex === -1) {
                    logger.info('📝 补充遗漏的最终结果', { recordId: result.record_id });
                  allResults.push(result);
                  
                  if (realtimeCallback) {
                    realtimeCallback({
                      type: 'transcription_item_complete',
                      result: result,
                      progress: {
                        completed: status.completed_count,
                        total: status.total_count
                      },
                      isFinal: true
                    });
                  }
                }
              });
              } catch (error) {
                logger.warn('⚠️ 获取最终结果失败，使用当前结果', { error: error.message });
              }
            }
            
            resolve(allResults);
          } else if (status.status === 'failed') {
            this.currentTaskId = null; // 🚀 清空当前任务ID
            reject(new Error(status.error || status.message || '转写任务失败'));
          } else if (status.status === 'insufficient_points') {
            // 积分不足，返回已完成的部分结果
            this.currentTaskId = null; // 🚀 清空当前任务ID
            logger.warn('💰 积分不足，转写任务中断', { 
              taskId, 
              completedResults: allResults.length 
            });
            resolve(allResults);
          } else {
            // 继续轮询
            setTimeout(poll, this.pollingInterval);
          }
        } catch (error) {
          this.currentTaskId = null; // 🚀 清空当前任务ID
          logger.error('🚨 轮询转写进度失败', { taskId, error });
          reject(error);
        }
      };

      // 开始轮询
      poll();
    });
  }

  /**
   * 执行完整的转写流程（支持实时显示）
   * @param {Array} videoRecords - 视频记录数组
   * @param {Object} options - 转写选项
   * @param {Function} progressCallback - 进度回调函数
   * @param {Function} realtimeCallback - 实时结果回调函数
   * @returns {Promise<Object>} { taskId, results } - 任务ID和转写结果
   */
  async performTranscription(videoRecords, options = {}, progressCallback, realtimeCallback) {
    try {
      const { strategy = 'batch', maxConcurrent = 10 } = options;
      
      logger.info('🚀 开始执行转写流程', { 
        recordCount: videoRecords.length,
        strategy,
        maxConcurrent,
        enableRealtime: !!realtimeCallback
      });

      // 启动转写任务
      const taskInfo = await this.startTranscription(videoRecords, strategy, maxConcurrent);
      
      // 轮询进度并获取结果（支持实时回调）
      const results = await this.pollProgress(taskInfo.task_id, progressCallback, realtimeCallback);
      
      logger.info('🎉 转写流程完成', { 
        taskId: taskInfo.task_id,
        resultsCount: results.length,
        successCount: results.filter(r => r.status === 'completed' && !r.is_fallback).length,
        fallbackCount: results.filter(r => r.is_fallback).length,
        failedCount: results.filter(r => r.status === 'failed').length
      });

      // 🚀 返回任务ID和结果
      return {
        taskId: taskInfo.task_id,
        results: results
      };
    } catch (error) {
      logger.error('🚨 转写流程失败', error);
      throw error;
    }
  }
}

// 创建单例实例
export const transcriptionService = new TranscriptionService(); 