import service from './request';

// API响应类型
interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

/**
 * 提交抖音作者视频采集请求
 * @param url 作者主页URL
 * @param fields 需要采集的字段列表
 */
export async function collectAuthorVideos(url: string, fields: string[]) {
  try {
    const { data: response } = await service.post<any, ApiResponse>('/api/douyin/collect/author', {
      url,
      fields
    });
    
    if (response.code !== 0) {
      throw new Error(response.message || '采集数据失败');
    }
    
    return response.data;
  } catch (error) {
    console.error('采集作者视频失败:', error);
    throw error;
  }
}

/**
 * 提交单个视频采集请求
 * @param url 视频URL
 * @param fields 需要采集的字段列表
 */
export async function collectSingleVideo(url: string, fields: string[]) {
  try {
    const { data: response } = await service.post<any, ApiResponse>('/api/douyin/collect/video', {
      url,
      fields
    });
    
    if (response.code !== 0) {
      throw new Error(response.message || '采集数据失败');
    }
    
    return response.data;
  } catch (error) {
    console.error('采集单个视频失败:', error);
    throw error;
  }
}

/**
 * 获取采集历史记录
 * @param page 页码
 * @param limit 每页数量
 */
export async function getCollectionHistory(page: number = 1, limit: number = 20) {
  try {
    const { data: response } = await service.get<any, ApiResponse>('/api/douyin/history', {
      params: { page, limit }
    });
    
    if (response.code !== 0) {
      throw new Error(response.message || '获取历史记录失败');
    }
    
    return response.data;
  } catch (error) {
    console.error('获取采集历史失败:', error);
    throw error;
  }
}

/**
 * 导出数据
 * @param data 要导出的数据
 * @param format 导出格式
 */
export async function exportData(data: any, format: string = 'excel') {
  try {
    const { data: response } = await service.post<any, ApiResponse>('/api/douyin/export', {
      data,
      format
    });
    
    if (response.code !== 0) {
      throw new Error(response.message || '导出数据失败');
    }
    
    return response.data;
  } catch (error) {
    console.error('导出数据失败:', error);
    throw error;
  }
} 