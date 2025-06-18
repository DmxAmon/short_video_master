import service from './request';

// API响应类型
interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

/**
 * 提交视频转写任务
 * @param videoUrl 视频URL
 * @param options 转写选项
 */
export async function submitTranscriptTask(videoUrl: string, options: any = {}) {
  try {
    const { data: response } = await service.post<any, ApiResponse>('/api/transcript/submit', {
      video_url: videoUrl,
      ...options
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
export async function getTranscriptStatus(taskId: string) {
  try {
    const { data: response } = await service.get<any, ApiResponse>(`/api/transcript/status/${taskId}`);
    
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
export async function getTranscriptResult(taskId: string) {
  try {
    const { data: response } = await service.get<any, ApiResponse>(`/api/transcript/result/${taskId}`);
    
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
 * 获取转写历史记录
 * @param page 页码
 * @param limit 每页数量
 */
export async function getTranscriptHistory(page: number = 1, limit: number = 20) {
  try {
    const { data: response } = await service.get<any, ApiResponse>('/api/transcript/history', {
      params: { page, limit }
    });
    
    if (response.code !== 0) {
      throw new Error(response.message || '获取历史记录失败');
    }
    
    return response.data;
  } catch (error) {
    console.error('获取转写历史失败:', error);
    throw error;
  }
} 