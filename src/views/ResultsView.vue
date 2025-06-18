<!--
 * @Version    : v1.00
 * @Author     : Amon
 * @Date       : 2024-07-10
 * @desc       : 视频转写结果预览组件
-->
<template>
  <div class="results-container">
    <h2 class="page-title">转写结果</h2>
    
    <PermissionWrapper 
      required-permission="transcribe"
      :user-permissions="user.permissions" 
      upgrade-message="查看转写结果需要基础会员及以上权限"
    >
      <!-- 搜索和筛选区域 -->
      <div class="search-filter-container">
        <el-input
          v-model="searchQuery"
          placeholder="搜索视频标题或作者"
          clearable
          class="search-input"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        
        <div class="filter-actions">
          <el-select
            v-model="filterOptions.status"
            placeholder="状态筛选"
            clearable
            class="filter-select"
          >
            <el-option label="全部" value="" />
            <el-option label="已完成" value="completed" />
            <el-option label="处理中" value="processing" />
            <el-option label="失败" value="failed" />
          </el-select>
          
          <el-select
            v-model="filterOptions.date"
            placeholder="时间筛选"
            clearable
            class="filter-select"
          >
            <el-option label="全部时间" value="" />
            <el-option label="今天" value="today" />
            <el-option label="本周" value="week" />
            <el-option label="本月" value="month" />
          </el-select>
        </div>
      </div>
      
      <!-- 转写历史列表 -->
      <div v-if="filteredResults.length > 0" class="results-list">
        <InfoCard 
          v-for="result in filteredResults" 
          :key="result.id"
          :title="result.title || '未命名视频'"
          class="result-card"
        >
          <div class="result-content">
            <div class="result-info">
              <div class="result-meta">
                <span class="result-author" v-if="result.authorNickname">
                  <el-icon><User /></el-icon> {{ result.authorNickname }}
                </span>
                <span class="result-date" v-if="result.transcribeDate">
                  <el-icon><Calendar /></el-icon> {{ formatDate(result.transcribeDate) }}
                </span>
                <span class="result-format" v-if="result.transcript && result.transcript.format">
                  <el-icon><Document /></el-icon> {{ formatLabels[result.transcript.format] || result.transcript.format }}
                </span>
              </div>
              
              <div class="result-status">
                <el-tag 
                  :type="getStatusType(result)" 
                  size="small"
                >
                  {{ getStatusText(result) }}
                </el-tag>
              </div>
            </div>
            
            <div v-if="result.transcript" class="result-preview">
              <div class="preview-header">
                <span>转写预览</span>
                <el-button 
                  type="text" 
                  @click="expandResult(result)"
                  size="small"
                >
                  {{ expandedResults.includes(result.id) ? '收起' : '展开' }}
                </el-button>
              </div>
              
              <div 
                v-show="expandedResults.includes(result.id)" 
                class="preview-content"
              >
                <pre>{{ getPreviewText(result) }}</pre>
              </div>
            </div>
            
            <div class="result-actions">
              <el-button 
                v-if="result.transcript"
                type="primary" 
                size="small"
                @click="downloadTranscript(result)"
              >
                下载结果
              </el-button>
              
              <el-button 
                v-if="result.transcript"
                size="small"
                @click="copyTranscript(result)"
              >
                复制文本
              </el-button>
              
              <el-button 
                v-if="result.error"
                type="warning"
                size="small"
                @click="retryTranscribe(result)"
              >
                重新转写
              </el-button>
              
              <el-button 
                type="danger" 
                size="small"
                @click="confirmDelete(result)"
              >
                删除
              </el-button>
            </div>
          </div>
        </InfoCard>
      </div>
      
      <!-- 空状态 -->
      <el-empty 
        v-else 
        description="暂无转写结果" 
        :image-size="200"
      >
        <el-button type="primary" @click="goToTranscribePage">开始转写</el-button>
      </el-empty>
    </PermissionWrapper>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, User, Calendar, Document } from '@element-plus/icons-vue';
import InfoCard from '../components/common/InfoCard.vue';
import PermissionWrapper from '../components/common/PermissionWrapper.vue';

const props = defineProps({
  user: {
    type: Object,
    required: true
  }
});

const router = useRouter();

// 搜索和筛选
const searchQuery = ref('');
const filterOptions = reactive({
  status: '',
  date: ''
});

// 转写结果
const transcribeResults = ref([]);
const expandedResults = ref([]);

// 格式标签
const formatLabels = {
  'txt': '纯文本',
  'txt-timestamp': '文本+时间戳',
  'srt': 'SRT字幕',
  'vtt': 'VTT字幕'
};

// 过滤后的结果列表
const filteredResults = computed(() => {
  let results = [...transcribeResults.value];
  
  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    results = results.filter(result => 
      (result.title && result.title.toLowerCase().includes(query)) ||
      (result.authorNickname && result.authorNickname.toLowerCase().includes(query))
    );
  }
  
  // 状态过滤
  if (filterOptions.status) {
    switch (filterOptions.status) {
      case 'completed':
        results = results.filter(result => result.transcript && !result.isProcessing);
        break;
      case 'processing':
        results = results.filter(result => result.isProcessing);
        break;
      case 'failed':
        results = results.filter(result => result.error);
        break;
    }
  }
  
  // 日期过滤
  if (filterOptions.date) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    results = results.filter(result => {
      if (!result.transcribeDate) return false;
      
      const resultDate = new Date(result.transcribeDate);
      
      switch (filterOptions.date) {
        case 'today':
          return resultDate >= today;
        case 'week':
          return resultDate >= startOfWeek;
        case 'month':
          return resultDate >= startOfMonth;
        default:
          return true;
      }
    });
  }
  
  // 按日期排序，最新的在前面
  return results.sort((a, b) => {
    if (!a.transcribeDate) return 1;
    if (!b.transcribeDate) return -1;
    return new Date(b.transcribeDate) - new Date(a.transcribeDate);
  });
});

// 获取状态类型
const getStatusType = (result) => {
  if (result.error) return 'danger';
  if (result.isProcessing) return 'warning';
  if (result.transcript) return 'success';
  return 'info';
};

// 获取状态文本
const getStatusText = (result) => {
  if (result.error) return '失败';
  if (result.isProcessing) return '处理中';
  if (result.transcript) return '已完成';
  return '待处理';
};

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  
  try {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  } catch (e) {
    return dateStr;
  }
};

// 展开/收起结果详情
const expandResult = (result) => {
  const index = expandedResults.value.indexOf(result.id);
  if (index === -1) {
    expandedResults.value.push(result.id);
  } else {
    expandedResults.value.splice(index, 1);
  }
};

// 获取预览文本（仅显示前200个字符）
const getPreviewText = (result) => {
  if (!result.transcript || !result.transcript.text) return '';
  
  const maxLength = 200;
  const text = result.transcript.text;
  
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength) + '...';
};

// 下载转写结果
const downloadTranscript = (result) => {
  if (!result.transcript) return;
  
  try {
    // 根据格式选择默认的文件扩展名
    let extension = '.txt';
    if (result.transcript.format === 'srt') extension = '.srt';
    if (result.transcript.format === 'vtt') extension = '.vtt';
    
    // 创建文件名
    const fileName = `${result.title || '视频转写'}_${new Date().toISOString().slice(0,10)}${extension}`;
    
    // 创建Blob对象
    const blob = new Blob([result.transcript.text], { type: 'text/plain;charset=utf-8' });
    
    // 创建下载链接
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    
    // 触发下载
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    ElMessage.success('下载成功');
  } catch (err) {
    console.error('下载失败:', err);
    ElMessage.error('下载失败: ' + (err.message || '未知错误'));
  }
};

// 复制转写文本
const copyTranscript = async (result) => {
  if (!result.transcript || !result.transcript.text) return;
  
  try {
    await navigator.clipboard.writeText(result.transcript.text);
    ElMessage.success('已复制到剪贴板');
  } catch (err) {
    console.error('复制失败:', err);
    ElMessage.error('复制失败: ' + (err.message || '未知错误'));
  }
};

// 重新转写
const retryTranscribe = (result) => {
  router.push({ 
    name: 'transcribe', 
    params: { 
      retry: true 
    },
    query: {
      videoId: result.id,
      videoUrl: result.videoUrl
    }
  });
};

// 确认删除
const confirmDelete = (result) => {
  ElMessageBox.confirm(
    '确定要删除此转写结果吗？此操作不可恢复。',
    '删除确认',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
  .then(() => {
    deleteResult(result);
  })
  .catch(() => {
    // 用户取消删除
  });
};

// 删除结果
const deleteResult = (result) => {
  const index = transcribeResults.value.findIndex(r => r.id === result.id);
  if (index !== -1) {
    transcribeResults.value.splice(index, 1);
    
    // 如果该结果已展开，从展开列表中移除
    const expandIndex = expandedResults.value.indexOf(result.id);
    if (expandIndex !== -1) {
      expandedResults.value.splice(expandIndex, 1);
    }
    
    // 移除本地存储中的结果
    saveResultsToLocalStorage();
    
    ElMessage.success('已删除转写结果');
  }
};

// 前往转写页面
const goToTranscribePage = () => {
  router.push({ name: 'transcribe' });
};

// 保存结果到本地存储
const saveResultsToLocalStorage = () => {
  localStorage.setItem('transcribe_results', JSON.stringify(transcribeResults.value));
};

// 从本地存储加载结果
const loadResultsFromLocalStorage = () => {
  const savedResults = localStorage.getItem('transcribe_results');
  if (savedResults) {
    try {
      transcribeResults.value = JSON.parse(savedResults);
    } catch (e) {
      console.error('加载转写结果失败:', e);
    }
  }
};

// 生成模拟数据（仅开发环境使用）
const generateMockData = () => {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const lastWeek = new Date(now);
  lastWeek.setDate(now.getDate() - 7);
  
  transcribeResults.value = [
    {
      id: 'result_1',
      title: '抖音热门视频解析',
      authorNickname: '短视频专家',
      videoUrl: 'https://www.douyin.com/video/7123456789',
      transcribeDate: now.toISOString(),
      isProcessing: false,
      error: null,
      transcript: {
        format: 'txt',
        language: 'zh',
        text: '大家好，今天我们来讲解如何制作爆款短视频。首先要明确目标受众，其次是制作高质量内容，最后要掌握平台推荐机制。希望对大家有所帮助！'
      }
    },
    {
      id: 'result_2',
      title: '运营技巧分享',
      authorNickname: '新媒体讲师',
      videoUrl: 'https://www.douyin.com/video/7123456790',
      transcribeDate: yesterday.toISOString(),
      isProcessing: false,
      error: null,
      transcript: {
        format: 'srt',
        language: 'zh',
        text: '1\n00:00:01,000 --> 00:00:04,999\n今天我们来分享短视频账号运营技巧\n\n2\n00:00:05,000 --> 00:00:09,999\n第一点是内容定位\n\n3\n00:00:10,000 --> 00:00:14,999\n第二点是发布频率\n\n4\n00:00:15,000 --> 00:00:19,999\n最后是互动策略'
      }
    },
    {
      id: 'result_3',
      title: '产品推广视频',
      authorNickname: '电商达人',
      videoUrl: 'https://www.douyin.com/video/7123456791',
      transcribeDate: lastWeek.toISOString(),
      isProcessing: true,
      error: null,
      transcript: null
    },
    {
      id: 'result_4',
      title: '创作者访谈',
      authorNickname: '媒体工作室',
      videoUrl: 'https://www.douyin.com/video/7123456792',
      transcribeDate: lastWeek.toISOString(),
      isProcessing: false,
      error: '网络连接失败',
      transcript: null
    }
  ];
  
  saveResultsToLocalStorage();
};

// 组件挂载时的操作
onMounted(() => {
  loadResultsFromLocalStorage();
  
  // 如果没有数据且在开发环境，生成模拟数据
  if (transcribeResults.value.length === 0 && import.meta.env.DEV) {
    generateMockData();
  }
});
</script>

<style scoped>
.results-container {
  padding: 20px;
}

.search-filter-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.search-input {
  width: 100%;
}

.filter-actions {
  display: flex;
  gap: var(--spacing-md);
}

.filter-select {
  flex: 1;
  min-width: 0;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.result-card {
  margin-bottom: 0;
}

.result-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.result-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.result-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.result-author,
.result-date,
.result-format {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.result-preview {
  background-color: var(--bg-light);
  border-radius: var(--border-radius-sm);
  overflow: hidden;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: rgba(0, 0, 0, 0.03);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  font-weight: var(--font-weight-bold);
}

.preview-content {
  padding: var(--spacing-md);
  max-height: 300px;
  overflow-y: auto;
}

.preview-content pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: var(--font-size-sm);
  line-height: 1.5;
}

.result-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

@media (min-width: 600px) {
  .search-filter-container {
    flex-direction: row;
    align-items: center;
  }
  
  .search-input {
    width: 240px;
    flex-shrink: 0;
  }
  
  .filter-actions {
    margin-left: auto;
  }
}

@media (max-width: 358px) {
  .filter-actions {
    flex-direction: column;
    gap: var(--spacing-sm);
  }
  
  .result-actions {
    justify-content: center;
  }
}
</style> 