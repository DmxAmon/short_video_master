/**
 * 视频转写功能的可复用逻辑钩子
 * 提供视频转写相关的状态管理和API调用功能
 */
import { ref, reactive, computed } from 'vue';
import axios from 'axios';
import { useApiConfig } from './useApiConfig';

export function useTranscription() {
  const { getApiUrl, getHeaders } = useApiConfig();
  
  // 视频URL
  const videoUrl = ref('');
  
  // 转写选项
  const transcriptionOptions = reactive({
    language: 'zh', // 默认中文
    format: 'text', // 默认纯文本
    punctuation: true, // 默认添加标点
    timestamps: false, // 默认不添加时间戳
    paragraphs: true, // 默认自动分段
  });
  
  // 任务状态
  const taskStatus = reactive({
    taskId: '',
    status: '',
    progress: 0,
    error: '',
  });
  
  // 转写结果
  const transcriptionResult = ref(null);
  
  // 提交中状态
  const submitting = ref(false);
  
  // 轮询中状态
  const polling = ref(false);
  
  // 轮询间隔（毫秒）
  const POLLING_INTERVAL = 5000;
  
  // 轮询计时器
  let pollingTimer = null;
  
  /**
   * 提交转写任务
   */
  const submitTask = async () => {
    if (!videoUrl.value) {
      throw new Error('请提供有效的视频URL');
    }
    
    submitting.value = true;
    
    try {
      const response = await axios.post(
        getApiUrl('/api/transcription/submit'),
        {
          video_url: videoUrl.value,
          options: transcriptionOptions
        },
        {
          headers: getHeaders()
        }
      );
      
      if (response.data && response.data.task_id) {
        taskStatus.taskId = response.data.task_id;
        taskStatus.status = 'pending';
        taskStatus.progress = 0;
        taskStatus.error = '';
        
        // 开始轮询任务状态
        startPolling();
      } else {
        throw new Error('服务器未返回有效的任务ID');
      }
      
      return response.data;
    } catch (error) {
      taskStatus.error = error.response?.data?.message || error.message || '提交转写任务失败';
      throw error;
    } finally {
      submitting.value = false;
    }
  };
  
  /**
   * 开始轮询任务状态
   */
  const startPolling = () => {
    polling.value = true;
    
    // 清除可能存在的轮询定时器
    if (pollingTimer) {
      clearInterval(pollingTimer);
    }
    
    // 立即检查一次状态
    checkTaskStatus();
    
    // 设置轮询定时器
    pollingTimer = setInterval(async () => {
      try {
        const completed = await checkTaskStatus();
        
        // 如果任务完成或失败，停止轮询
        if (completed) {
          stopPolling();
          
          // 如果任务成功完成，获取结果
          if (taskStatus.status === 'completed') {
            await fetchResult();
          }
        }
      } catch (error) {
        console.error('轮询任务状态出错:', error);
      }
    }, POLLING_INTERVAL);
  };
  
  /**
   * 停止轮询
   */
  const stopPolling = () => {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
    
    polling.value = false;
  };
  
  /**
   * 检查任务状态
   */
  const checkTaskStatus = async () => {
    if (!taskStatus.taskId) {
      return false;
    }
    
    try {
      const response = await axios.get(
        getApiUrl(`/api/transcription/status/${taskStatus.taskId}`),
        {
          headers: getHeaders()
        }
      );
      
      if (response.data) {
        // 更新任务状态
        taskStatus.status = response.data.status || taskStatus.status;
        taskStatus.progress = response.data.progress || taskStatus.progress;
        taskStatus.error = response.data.error || '';
        
        // 判断任务是否完成或失败
        return ['completed', 'failed'].includes(taskStatus.status);
      }
      
      return false;
    } catch (error) {
      taskStatus.error = error.response?.data?.message || error.message || '检查任务状态失败';
      console.error('检查任务状态出错:', error);
      return false;
    }
  };
  
  /**
   * 获取转写结果
   */
  const fetchResult = async () => {
    if (!taskStatus.taskId || taskStatus.status !== 'completed') {
      return null;
    }
    
    try {
      const response = await axios.get(
        getApiUrl(`/api/transcription/result/${taskStatus.taskId}`),
        {
          headers: getHeaders()
        }
      );
      
      if (response.data && response.data.result) {
        transcriptionResult.value = response.data.result;
        return response.data.result;
      }
      
      return null;
    } catch (error) {
      taskStatus.error = error.response?.data?.message || error.message || '获取转写结果失败';
      console.error('获取转写结果出错:', error);
      return null;
    }
  };
  
  /**
   * 重置转写状态
   */
  const resetTranscription = () => {
    // 停止轮询
    stopPolling();
    
    // 重置状态
    videoUrl.value = '';
    taskStatus.taskId = '';
    taskStatus.status = '';
    taskStatus.progress = 0;
    taskStatus.error = '';
    transcriptionResult.value = null;
  };
  
  /**
   * 格式化转写结果
   */
  const formattedResult = computed(() => {
    if (!transcriptionResult.value) {
      return '';
    }
    
    // 根据不同的格式类型进行处理
    switch (transcriptionOptions.format) {
      case 'text':
        return transcriptionResult.value.text || '';
      
      case 'srt':
      case 'vtt':
        return transcriptionResult.value.subtitle || '';
      
      default:
        return JSON.stringify(transcriptionResult.value, null, 2);
    }
  });
  
  return {
    videoUrl,
    transcriptionOptions,
    taskStatus,
    transcriptionResult,
    submitting,
    polling,
    submitTask,
    checkTaskStatus,
    fetchResult,
    resetTranscription,
    formattedResult
  };
} 