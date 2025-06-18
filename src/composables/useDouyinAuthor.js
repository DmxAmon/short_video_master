import { ref, reactive } from 'vue';
import { collectAuthorVideos, exportToBitable } from '../api/douyin';
import { ElMessage } from 'element-plus';

/**
 * 抖音作者数据采集相关逻辑
 */
export function useDouyinAuthor() {
  // 作者URL
  const authorUrl = ref('');
  
  // 采集字段选项
  const fieldOptions = [
    { label: '标题', value: 'title' },
    { label: '视频ID', value: 'video_id' },
    { label: '封面地址', value: 'cover_url' },
    { label: '播放量', value: 'views' },
    { label: '点赞数', value: 'likes' },
    { label: '评论数', value: 'comments' },
    { label: '分享数', value: 'shares' },
    { label: '发布时间', value: 'publish_time' },
    { label: '视频时长', value: 'duration' },
    { label: '视频地址', value: 'video_url' }
  ];
  
  // 已选中的字段
  const selectedFields = ref(['title', 'views', 'likes', 'comments', 'publish_time']);
  
  // 采集状态
  const collecting = ref(false);
  
  // 采集结果
  const collectionResult = ref(null);
  
  // 错误信息
  const error = ref('');
  
  // 导出状态
  const exporting = ref(false);
  
  /**
   * 开始采集作者视频数据
   */
  const startCollection = async () => {
    if (!authorUrl.value) {
      error.value = '请输入作者主页URL';
      return;
    }
    
    if (selectedFields.value.length === 0) {
      error.value = '请至少选择一个采集字段';
      return;
    }
    
    collecting.value = true;
    error.value = '';
    collectionResult.value = null;
    
    try {
      const result = await collectAuthorVideos(authorUrl.value, selectedFields.value);
      collectionResult.value = result;
      ElMessage.success(`成功采集到 ${result.videos?.length || 0} 条视频数据`);
    } catch (err) {
      error.value = err.message || '采集失败，请稍后重试';
      ElMessage.error(error.value);
    } finally {
      collecting.value = false;
    }
  };
  
  /**
   * 重置采集表单
   */
  const resetCollection = () => {
    authorUrl.value = '';
    selectedFields.value = ['title', 'views', 'likes', 'comments', 'publish_time'];
    collectionResult.value = null;
    error.value = '';
  };
  
  /**
   * 导出到飞书多维表格
   * @param {string} tableId 表格ID 
   */
  const exportToTable = async (tableId) => {
    if (!collectionResult.value || !collectionResult.value.videos || collectionResult.value.videos.length === 0) {
      ElMessage.warning('没有可导出的数据');
      return;
    }
    
    if (!tableId) {
      ElMessage.warning('请选择要导出到的目标表格');
      return;
    }
    
    exporting.value = true;
    
    try {
      const result = await exportToBitable(collectionResult.value.videos, tableId);
      ElMessage.success(`成功导出 ${result.success_count || 0} 条数据`);
      return result;
    } catch (err) {
      ElMessage.error(err.message || '导出失败，请稍后重试');
      throw err;
    } finally {
      exporting.value = false;
    }
  };
  
  return {
    authorUrl,
    fieldOptions,
    selectedFields,
    collecting,
    collectionResult,
    error,
    exporting,
    startCollection,
    resetCollection,
    exportToTable
  };
} 