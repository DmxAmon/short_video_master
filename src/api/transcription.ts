import service from './request';

// API响应类型
interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

/**
 * 批量提交视频转写任务
 * @param videoRecords 视频记录数组，包含record_id和aweme_id
 * @param strategy 转写策略，batch或sequential
 * @param maxConcurrent 最大并发数
 */
export async function startTranscriptionByVideoIds(videoRecords: any[], strategy: string = 'batch', maxConcurrent: number = 10) {
  try {
    const { data: response } = await service.post<any, ApiResponse>('/api/transcription/start-by-video-ids', {
      video_records: videoRecords,
      strategy,
      max_concurrent: maxConcurrent
    });
    
    if (response.code !== 0) {
      throw new Error(response.message || '提交转写任务失败');
    }
    
    return response.data;
  } catch (error) {
    console.error('提交转写任务失败:', error);
    throw error;
  }
}

/**
 * 查询转写任务状态
 * @param taskId 任务ID
 */
export async function getTranscriptionStatus(taskId: string) {
  try {
    const { data: response } = await service.get<any, ApiResponse>(`/api/transcription/status/${taskId}`);
    
    if (response.code !== 0) {
      throw new Error(response.message || '查询任务状态失败');
    }
    
    return response.data;
  } catch (error) {
    console.error('查询转写状态失败:', error);
    throw error;
  }
}

/**
 * 获取转写结果
 * @param taskId 任务ID
 */
export async function getTranscriptionResult(taskId: string) {
  try {
    const { data: response } = await service.get<any, ApiResponse>(`/api/transcription/result/${taskId}`);
    
    if (response.code !== 0) {
      throw new Error(response.message || '获取转写结果失败');
    }
    
    return response.data;
  } catch (error) {
    console.error('获取转写结果失败:', error);
    throw error;
  }
}

/**
 * 检查用户积分是否足够
 * @param requiredPoints 所需积分
 * @param operationType 操作类型
 */
export async function checkPoints(requiredPoints: number, operationType: string = 'transcription') {
  try {
    const { data: response } = await service.post<any, ApiResponse>('/api/transcription/check-points', {
      required_points: requiredPoints,
      operation_type: operationType
    });
    
    if (response.code !== 0) {
      throw new Error(response.message || '检查积分失败');
    }
    
    return response.data;
  } catch (error) {
    console.error('检查积分失败:', error);
    throw error;
  }
}

/**
 * 扣除用户积分
 * @param points 扣除积分数量
 * @param operationType 操作类型
 * @param recordId 记录ID
 * @param duration 视频时长
 */
export async function deductPoints(points: number, operationType: string = 'transcription', recordId?: string, duration?: number) {
  try {
    const { data: response } = await service.post<any, ApiResponse>('/api/transcription/deduct-points', {
      points,
      operation_type: operationType,
      record_id: recordId,
      duration
    });
    
    if (response.code !== 0) {
      throw new Error(response.message || '扣除积分失败');
    }
    
    return response.data;
  } catch (error) {
    console.error('扣除积分失败:', error);
    throw error;
  }
}

/**
 * 最终确认积分扣除
 * @param taskId 任务ID
 */
export async function finalizePointsDeduction(taskId: string) {
  try {
    const { data: response } = await service.post<any, ApiResponse>(`/api/transcription/finalize-points/${taskId}`, {});
    
    if (response.code !== 0) {
      throw new Error(response.message || '确认积分扣除失败');
    }
    
    return response.data;
  } catch (error) {
    console.error('确认积分扣除失败:', error);
    throw error;
  }
}