<!--
 * @Version    : v1.00
 * @Author     : Amon
 * @Date       : 2024-07-20
 * @desc       : 抖音视频监控组件
-->
<template>
  <div class="monitor-container">
    <h2 class="page-title">视频监控</h2>
    
    <PermissionWrapper 
      required-permission="monitor"
      :user-permissions="user.permissions" 
      upgrade-message="视频监控功能需要基础会员及以上权限"
    >
      <!-- 监控设置区 -->
      <div class="section-container">
        <h3 class="section-title">视频监控设置</h3>
        <div class="monitor-form">
          <!-- 视频链接输入 -->
          <div class="form-item">
            <div class="form-label">抖音视频链接</div>
            <div class="form-control">
              <el-input 
                v-model="monitorForm.videoUrl" 
                placeholder="请输入要监控的抖音视频链接"
                :disabled="monitorStatus.isActive"
              ></el-input>
            </div>
          </div>
          
          <!-- 视频信息预览 -->
          <div v-if="videoPreview" class="video-preview">
            <div class="preview-title">{{ videoPreview.title }}</div>
            <div class="preview-meta">
              <span>作者: {{ videoPreview.authorNickname }}</span>
              <span>发布时间: {{ videoPreview.createTime }}</span>
            </div>
          </div>
          
          <!-- 监控频率选择 -->
          <div class="form-item">
            <div class="form-label">监控频率</div>
            <div class="form-control">
              <el-select 
                v-model="monitorForm.frequency" 
                placeholder="请选择监控频率"
                :disabled="monitorStatus.isActive"
              >
                <el-option label="每24小时" value="24" />
                <el-option label="每12小时" value="12" />
                <el-option 
                  label="每6小时" 
                  value="6" 
                  :disabled="!hasAdvancedMonitoring" 
                />
                <el-option 
                  label="每3小时" 
                  value="3" 
                  :disabled="!hasAdvancedMonitoring" 
                />
                <el-option 
                  label="每1小时" 
                  value="1" 
                  :disabled="!hasPremiumMonitoring" 
                />
              </el-select>
              <div v-if="!hasAdvancedMonitoring" class="permission-hint">
                高频率监控需要高级会员权限
              </div>
            </div>
          </div>
          
          <!-- 监控持续时间 -->
          <div class="form-item">
            <div class="form-label">监控持续时间</div>
            <div class="form-control">
              <el-radio-group 
                v-model="monitorForm.duration" 
                :disabled="monitorStatus.isActive"
              >
                <el-radio :label="1">1天</el-radio>
                <el-radio :label="7">7天</el-radio>
                <el-radio 
                  :label="30" 
                  :disabled="!hasAdvancedMonitoring"
                >
                  <el-tooltip v-if="!hasAdvancedMonitoring" content="需要高级会员权限" placement="top">
                    <div class="locked-option">
                      <!-- <el-icon><Lock /></el-icon> -->
                      30天
                    </div>
                  </el-tooltip>
                  <span v-else>30天</span>
                </el-radio>
                <el-radio 
                  :label="90" 
                  :disabled="!hasPremiumMonitoring"
                >
                  <el-tooltip v-if="!hasPremiumMonitoring" content="需要专业会员权限" placement="top">
                    <div class="locked-option">
                      <!-- <el-icon><Lock /></el-icon> -->
                      90天
                    </div>
                  </el-tooltip>
                  <span v-else>90天</span>
                </el-radio>
              </el-radio-group>
            </div>
          </div>
          
          <!-- 数据保存位置 -->
          <div class="form-item">
            <div class="form-label">数据保存位置</div>
            <div class="form-control">
              <el-select 
                v-model="monitorForm.saveLocation" 
                placeholder="请选择保存位置"
                :disabled="monitorStatus.isActive"
              >
                <el-option label="默认表格" value="default" />
                <el-option label="新建表格" value="new" />
                <el-option 
                  label="自定义位置" 
                  value="custom" 
                  :disabled="!hasPremiumMonitoring" 
                />
              </el-select>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 控制按钮组 -->
      <div class="control-section">
        <div class="button-group">
          <el-button 
            type="success" 
            :icon="CaretRight"
            :disabled="!canStartMonitor || monitorStatus.isActive"
            @click="startMonitoring"
          >
            启动监控
          </el-button>
          
          <el-button 
            :type="monitorStatus.isPaused ? 'primary' : 'info'"
            :icon="monitorStatus.isPaused ? VideoPlay : VideoPause"
            :disabled="!monitorStatus.isActive"
            @click="togglePauseMonitoring"
          >
            {{ monitorStatus.isPaused ? '继续' : '暂停' }}
          </el-button>
          
          <el-button 
            type="danger" 
            :icon="CircleClose"
            :disabled="!monitorStatus.isActive"
            @click="stopMonitoring"
          >
            停止
          </el-button>
        </div>
        
        <div class="monitor-status">
          <div class="status-indicator" :class="statusClass">
            <div class="status-dot"></div>
            <span>{{ statusText }}</span>
          </div>
          
          <div v-if="monitorStatus.isActive" class="next-check">
            下次检查: {{ nextCheckTime }}
          </div>
        </div>
      </div>
      
      <!-- 数据可视化区 -->
      <div class="section-container">
        <h3 class="section-title">数据趋势</h3>
        <div class="data-visualization">
          <div class="chart-container">
            <div class="chart-header">
              <h4>数据趋势图</h4>
              <div class="chart-legend">
                <span class="legend-item like">点赞</span>
                <span class="legend-item comment">评论</span>
                <span class="legend-item share">分享</span>
                <span class="legend-item forward">转发</span>
              </div>
            </div>
            
            <div class="real-chart">
              <!-- 这里应该集成真实的图表组件，如 ECharts 或 Chart.js -->
              <el-empty description="图表功能开发中" :image-size="100">
                <template #description>
                  <p>数据趋势图表正在开发中，敬请期待</p>
                </template>
              </el-empty>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 历史记录表格 -->
      <div class="section-container">
        <h3 class="section-title">历史数据记录</h3>
        <div class="history-table">
          <div class="table-actions">
            <el-select v-model="tableFilter" size="small" placeholder="筛选记录">
              <el-option label="全部记录" value="all" />
              <el-option label="最近24小时" value="day" />
              <el-option label="最近7天" value="week" />
              <el-option label="显著变化" value="changes" />
            </el-select>
            
            <el-button 
              v-if="monitorHistory.length > 0" 
              type="primary" 
              size="small" 
              :disabled="!hasExportPermission"
              @click="exportData"
            >
              导出数据
              <el-icon v-if="!hasExportPermission"><Lock /></el-icon>
            </el-button>
          </div>
          
          <el-table 
            v-if="filteredHistoryData.length > 0"
            :data="filteredHistoryData" 
            style="width: 100%"
            height="300"
            :default-sort="{ prop: 'timestamp', order: 'descending' }"
          >
            <el-table-column prop="timestamp" label="时间" sortable>
              <template #default="scope">
                {{ formatDate(scope.row.timestamp) }}
              </template>
            </el-table-column>
            
            <el-table-column prop="likeCount" label="点赞数" sortable>
              <template #default="scope">
                <span>{{ scope.row.likeCount }}</span>
                <span 
                  v-if="scope.row.likeChange !== 0" 
                  :class="scope.row.likeChange > 0 ? 'increase' : 'decrease'"
                  class="change-value"
                >
                  {{ scope.row.likeChange > 0 ? '+' : '' }}{{ scope.row.likeChange }}
                </span>
              </template>
            </el-table-column>
            
            <el-table-column prop="commentCount" label="评论数" sortable>
              <template #default="scope">
                <span>{{ scope.row.commentCount }}</span>
                <span 
                  v-if="scope.row.commentChange !== 0" 
                  :class="scope.row.commentChange > 0 ? 'increase' : 'decrease'"
                  class="change-value"
                >
                  {{ scope.row.commentChange > 0 ? '+' : '' }}{{ scope.row.commentChange }}
                </span>
              </template>
            </el-table-column>
            
            <el-table-column prop="shareCount" label="分享数" sortable>
              <template #default="scope">
                <span>{{ scope.row.shareCount }}</span>
                <span 
                  v-if="scope.row.shareChange !== 0" 
                  :class="scope.row.shareChange > 0 ? 'increase' : 'decrease'"
                  class="change-value"
                >
                  {{ scope.row.shareChange > 0 ? '+' : '' }}{{ scope.row.shareChange }}
                </span>
              </template>
            </el-table-column>
          </el-table>
          
          <el-empty 
            v-else 
            description="暂无历史数据记录" 
            :image-size="100"
          ></el-empty>
          
          <!-- 移动端卡片式布局 -->
          <div v-if="isMobileView && filteredHistoryData.length > 0" class="mobile-history-cards">
            <div 
              v-for="(record, index) in filteredHistoryData" 
              :key="index"
              class="history-card"
            >
              <div class="card-header">
                <span class="card-time">{{ formatDate(record.timestamp) }}</span>
              </div>
              <div class="card-body">
                <div class="data-row">
                  <span class="data-label">点赞:</span>
                  <span class="data-value">{{ record.likeCount }}</span>
                  <span 
                    v-if="record.likeChange !== 0" 
                    :class="record.likeChange > 0 ? 'increase' : 'decrease'"
                    class="change-value"
                  >
                    {{ record.likeChange > 0 ? '+' : '' }}{{ record.likeChange }}
                  </span>
                </div>
                <div class="data-row">
                  <span class="data-label">评论:</span>
                  <span class="data-value">{{ record.commentCount }}</span>
                  <span 
                    v-if="record.commentChange !== 0" 
                    :class="record.commentChange > 0 ? 'increase' : 'decrease'"
                    class="change-value"
                  >
                    {{ record.commentChange > 0 ? '+' : '' }}{{ record.commentChange }}
                  </span>
                </div>
                <div class="data-row">
                  <span class="data-label">分享:</span>
                  <span class="data-value">{{ record.shareCount }}</span>
                  <span 
                    v-if="record.shareChange !== 0" 
                    :class="record.shareChange > 0 ? 'increase' : 'decrease'"
                    class="change-value"
                  >
                    {{ record.shareChange > 0 ? '+' : '' }}{{ record.shareChange }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 分页器 -->
          <div v-if="filteredHistoryData.length > 0" class="pagination-container">
            <el-pagination
              layout="prev, pager, next"
              :total="filteredHistoryData.length"
              :page-size="10"
              @current-change="handlePageChange"
            />
          </div>
        </div>
      </div>
    </PermissionWrapper>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { CaretRight, VideoPause, VideoPlay, CircleClose, ArrowDown, Lock } from '@element-plus/icons-vue';
import InfoCard from '../components/common/InfoCard.vue';
import PermissionWrapper from '../components/common/PermissionWrapper.vue';

const props = defineProps({
  user: {
    type: Object,
    required: true
  }
});

// 不使用模拟数据，强制使用真实API
const useMockData = ref(false);

// 监控表单
const monitorForm = reactive({
  videoUrl: '',
  frequency: '24',  // 默认每24小时
  duration: 7,      // 默认7天
  saveLocation: 'default'
});

// 监控状态
const monitorStatus = reactive({
  isActive: false,
  isPaused: false,
  startTime: null,
  endTime: null,
  nextCheckTime: null,
  checkCount: 0,
  lastCheckTime: null
});

// 视频预览信息
const videoPreview = ref(null);

// 图表数据
const chartData = ref([]);
const chartTimeRangeValue = ref('week');

// 历史数据
const historyData = ref([]);
const tableFilter = ref('all');
const monitorHistory = ref([]);

// 移动端视图标志
const isMobileView = ref(false);

// 定时器ID
const monitorTimerId = ref(null);

// 计算属性：权限检查
const hasAdvancedMonitoring = computed(() => {
  return props.user.memberLevel === 'pro' || props.user.memberLevel === 'enterprise';
});

const hasPremiumMonitoring = computed(() => {
  return props.user.memberLevel === 'enterprise';
});

const hasExportPermission = computed(() => {
  return props.user.permissions.includes('export');
});

// 计算属性：是否可以开始监控
const canStartMonitor = computed(() => {
  return monitorForm.videoUrl.trim() !== '';
});

// 计算属性：状态样式和文本
const statusClass = computed(() => {
  if (!monitorStatus.isActive) return 'status-inactive';
  if (monitorStatus.isPaused) return 'status-paused';
  return 'status-active';
});

const statusText = computed(() => {
  if (!monitorStatus.isActive) return '未启动';
  if (monitorStatus.isPaused) return '已暂停';
  return '监控中';
});

// 计算属性：下次检查时间
const nextCheckTime = computed(() => {
  if (!monitorStatus.nextCheckTime) return '--';
  
  const nextTime = new Date(monitorStatus.nextCheckTime);
  
  return `${nextTime.getFullYear()}-${String(nextTime.getMonth() + 1).padStart(2, '0')}-${String(nextTime.getDate()).padStart(2, '0')} ${String(nextTime.getHours()).padStart(2, '0')}:${String(nextTime.getMinutes()).padStart(2, '0')}`;
});

// 计算属性：图表时间范围显示
const chartTimeRange = computed(() => {
  const ranges = {
    'day': '24小时',
    'week': '7天',
    'month': '30天',
    'all': '全部'
  };
  return ranges[chartTimeRangeValue.value] || '7天';
});

// 计算属性：筛选后的历史数据
const filteredHistoryData = computed(() => {
  if (historyData.value.length === 0) return [];
  
  let filtered = [...historyData.value];
  
  // 根据筛选条件过滤
  if (tableFilter.value === 'changes') {
    filtered = filtered.filter(item => 
      item.likeChange !== 0 || 
      item.commentChange !== 0 || 
      item.shareChange !== 0 || 
      item.forwardChange !== 0
    );
  } else if (tableFilter.value === 'day') {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    filtered = filtered.filter(item => new Date(item.time) >= oneDayAgo);
  } else if (tableFilter.value === 'week') {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    filtered = filtered.filter(item => new Date(item.time) >= oneWeekAgo);
  }
  
  // 按时间倒序排序
  return filtered.sort((a, b) => new Date(b.time) - new Date(a.time));
});

// 方法：解析视频信息
const parseVideoInfo = async () => {
  if (!monitorForm.videoUrl) return;
  
  try {
    // 实际API调用
    /* 
    const response = await axios.post('/api/douyin/video/info', {
      url: monitorForm.videoUrl
    });
    
    if (response.data.code === 0) {
      videoPreview.value = response.data.data;
      ElMessage.success('已获取视频信息');
    } else {
      throw new Error(response.data.message || '获取视频信息失败');
    }
    */
  } catch (err) {
    console.error('获取视频信息失败:', err);
    ElMessage.error('获取视频信息失败: ' + (err.message || '未知错误'));
    videoPreview.value = null;
  }
};

// 方法：开始监控
const startMonitoring = async () => {
  if (!canStartMonitor.value) {
    ElMessage.warning('请输入有效的视频链接');
    return;
  }
  
  // 如果没有视频预览信息，先获取
  if (!videoPreview.value) {
    await parseVideoInfo();
    if (!videoPreview.value) return; // 如果获取失败，终止
  }
  
  // 设置监控状态
  monitorStatus.isActive = true;
  monitorStatus.isPaused = false;
  monitorStatus.startTime = new Date();
  monitorStatus.checkCount = 0;
  
  // 计算结束时间
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + monitorForm.duration);
  monitorStatus.endTime = endDate;
  
  // 清空之前的数据
  chartData.value = [];
  historyData.value = [];
  
  // 立即进行第一次检查
  performCheck();
  
  // 设置定时检查
  scheduleNextCheck();
  
  ElMessage.success('监控已启动');
};

// 方法：执行检查
const performCheck = () => {
  if (!monitorStatus.isActive || monitorStatus.isPaused) return;
  
  // 增加检查计数
  monitorStatus.checkCount++;
  monitorStatus.lastCheckTime = new Date();
  
  // 实际API调用
  /*
  axios.post('/api/douyin/video/check', {
    videoId: videoPreview.value.videoId
  })
  .then(response => {
    if (response.data.code === 0) {
      const data = response.data.data;
      
      // 计算变化
      const lastRecord = historyData.value.length > 0 
        ? historyData.value[0] 
        : {
          likes: videoPreview.value.likes,
          comments: videoPreview.value.comments,
          shares: videoPreview.value.shares,
          forwards: videoPreview.value.forwards
        };
      
      const newRecord = {
        time: new Date().toISOString(),
        likes: data.likes,
        comments: data.comments,
        shares: data.shares,
        forwards: data.forwards,
        likeChange: data.likes - lastRecord.likes,
        commentChange: data.comments - lastRecord.comments,
        shareChange: data.shares - lastRecord.shares,
        forwardChange: data.forwards - lastRecord.forwards
      };
      
      // 添加到历史记录
      historyData.value.unshift(newRecord);
      
      // 添加到图表数据
      chartData.value.push(newRecord);
    } else {
      throw new Error(response.data.message || '检查失败');
    }
  })
  .catch(err => {
    console.error('检查失败:', err);
    ElMessage.warning('本次检查失败: ' + (err.message || '未知错误'));
  });
  */
};

// 方法：安排下一次检查
const scheduleNextCheck = () => {
  if (monitorTimerId.value) {
    clearTimeout(monitorTimerId.value);
  }
  
  if (!monitorStatus.isActive || monitorStatus.isPaused) return;
  
  // 计算下次检查时间
  const interval = parseInt(monitorForm.frequency) * 60 * 60 * 1000; // 小时转毫秒
  const now = new Date();
  const nextTime = new Date(now.getTime() + interval);
  monitorStatus.nextCheckTime = nextTime;
  
  // 检查是否超过结束时间
  if (monitorStatus.endTime && nextTime > monitorStatus.endTime) {
    // 监控周期结束
    stopMonitoring();
    ElMessage.info('监控周期已结束');
    return;
  }
  
  // 设置定时器
  monitorTimerId.value = setTimeout(() => {
    performCheck();
    scheduleNextCheck();
  }, interval);
};

// 方法：暂停/继续监控
const togglePauseMonitoring = () => {
  if (!monitorStatus.isActive) return;
  
  monitorStatus.isPaused = !monitorStatus.isPaused;
  
  if (monitorStatus.isPaused) {
    // 暂停时清除定时器
    if (monitorTimerId.value) {
      clearTimeout(monitorTimerId.value);
      monitorTimerId.value = null;
    }
    ElMessage.info('监控已暂停');
  } else {
    // 继续时重新安排检查
    scheduleNextCheck();
    ElMessage.success('监控已继续');
  }
};

// 方法：停止监控
const stopMonitoring = () => {
  if (!monitorStatus.isActive) return;
  
  ElMessageBox.confirm(
    '确定要停止监控吗？停止后将无法恢复当前监控任务。',
    '停止确认',
    {
      confirmButtonText: '确定停止',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
  .then(() => {
    // 清除定时器
    if (monitorTimerId.value) {
      clearTimeout(monitorTimerId.value);
      monitorTimerId.value = null;
    }
    
    // 重置状态
    monitorStatus.isActive = false;
    monitorStatus.isPaused = false;
    monitorStatus.nextCheckTime = null;
    
    ElMessage.success('监控已停止');
  })
  .catch(() => {
    // 用户取消
  });
};

// 方法：设置图表时间范围
const setChartTimeRange = (range) => {
  chartTimeRangeValue.value = range;
};

// 方法：导出数据
const exportData = () => {
  if (historyData.value.length === 0) {
    ElMessage.warning('没有可导出的数据');
    return;
  }
  
  try {
    // 转换为CSV格式
    const headers = ['时间', '点赞数', '点赞变化', '评论数', '评论变化', '分享数', '分享变化', '转发数', '转发变化'];
    
    let csvContent = headers.join(',') + '\n';
    
    filteredHistoryData.value.forEach(record => {
      const row = [
        record.time,
        record.likes,
        record.likeChange || 0,
        record.comments,
        record.commentChange || 0,
        record.shares,
        record.shareChange || 0,
        record.forwards,
        record.forwardChange || 0
      ];
      csvContent += row.join(',') + '\n';
    });
    
    // 创建Blob对象
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    
    // 创建下载链接
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `视频监控数据_${new Date().toISOString().slice(0,10)}.csv`;
    
    // 触发下载
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    ElMessage.success('数据导出成功');
  } catch (err) {
    console.error('导出失败:', err);
    ElMessage.error('导出失败: ' + (err.message || '未知错误'));
  }
};

// 格式化工具方法
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

// 获取变化样式
const getChangeClass = (change) => {
  if (change > 0) return 'change-up';
  if (change < 0) return 'change-down';
  return '';
};

// 格式化变化数字
const formatChange = (change) => {
  if (change > 0) return `+${change}`;
  return `${change}`;
};

// 监听视频URL变化，自动获取视频信息
watch(() => monitorForm.videoUrl, (newUrl, oldUrl) => {
  if (newUrl && newUrl !== oldUrl) {
    // 添加防抖，避免频繁请求
    const debounce = setTimeout(() => {
      parseVideoInfo();
    }, 800);
    
    return () => clearTimeout(debounce);
  }
});

// 组件挂载时的处理
onMounted(() => {
  // 检测是否为移动端视图
  isMobileView.value = window.innerWidth <= 600;
  
  // 添加窗口大小变化监听器
  window.addEventListener('resize', () => {
    isMobileView.value = window.innerWidth <= 600;
  });
});

// 组件卸载前清理
onBeforeUnmount(() => {
  if (monitorTimerId.value) {
    clearTimeout(monitorTimerId.value);
  }
  
  // 移除窗口大小变化监听器
  window.removeEventListener('resize', () => {
    isMobileView.value = window.innerWidth <= 600;
  });
});

// 添加分页处理方法
const handlePageChange = (page) => {
  console.log('切换到页码:', page);
  // 在这里可以添加分页逻辑，如果需要的话
};
</script>

<style scoped>
.monitor-container {
  padding: 20px;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 20px;
}

.section-container {
  margin-bottom: 24px;
  border: 1px solid var(--border-color-light, #ebeef5);
  border-radius: 4px;
  padding: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: var(--text-primary, #303133);
}

.monitor-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 13px;
  color: var(--text-primary, #303133);
}

.form-control {
  width: 100%;
}

.permission-hint {
  font-size: 12px;
  color: var(--text-secondary, #909399);
  margin-top: 4px;
}

.video-preview {
  background-color: var(--bg-light, #f5f7fa);
  padding: 12px;
  border-radius: 4px;
  margin-top: 8px;
}

.preview-title {
  font-weight: 500;
  margin-bottom: 8px;
}

.preview-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 12px;
  color: var(--text-secondary, #909399);
}

.locked-option {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-disabled, #c0c4cc);
}

.control-section {
  margin-bottom: 24px;
  border: 1px solid var(--border-color-light, #ebeef5);
  border-radius: 4px;
  padding: 16px;
}

.button-group {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.monitor-status {
  font-size: 12px;
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--color-info, #909399);
}

.status-active .status-dot {
  background-color: var(--color-success, #67C23A);
}

.status-paused .status-dot {
  background-color: var(--color-warning, #e6a23c);
}

.status-stopped .status-dot {
  background-color: var(--color-danger, #f56c6c);
}

.next-check {
  color: var(--text-secondary, #909399);
}

.data-visualization {
  position: relative;
}

.chart-container {
  border: 1px solid var(--border-color-light, #ebeef5);
  border-radius: 4px;
  height: 200px;
  position: relative;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid var(--border-color-light, #ebeef5);
}

.chart-legend {
  display: flex;
  gap: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.like-color {
  background-color: #409EFF;
}

.comment-color {
  background-color: #67C23A;
}

.share-color {
  background-color: #E6A23C;
}

.forward-color {
  background-color: #8B5CF6;
}

.real-chart {
  padding: 16px;
  height: calc(100% - 40px);
  position: relative;
}

.table-actions {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}

.change-value {
  margin-left: 4px;
  font-size: 12px;
}

.increase {
  color: var(--color-success, #67C23A);
}

.decrease {
  color: var(--color-danger, #F56C6C);
}

.pagination-container {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

.mobile-history-cards {
  display: none;
}

/* 响应式布局 */
@media (max-width: 600px) {
  .button-group {
    flex-direction: column;
  }
  
  .chart-legend {
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .mobile-history-cards {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  .history-card {
    border: 1px solid var(--border-color-light, #ebeef5);
    border-radius: 4px;
    overflow: hidden;
  }
  
  .card-header {
    background-color: var(--bg-light, #f5f7fa);
    padding: 8px 12px;
    font-weight: 500;
  }
  
  .card-body {
    padding: 12px;
  }
  
  .data-row {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
  }
  
  .data-label {
    width: 50px;
    color: var(--text-secondary, #909399);
  }
  
  .data-value {
    font-weight: 500;
  }
  
  /* 隐藏表格，显示卡片式布局 */
  .el-table {
    display: none;
  }
}

@media (max-width: 358px) {
  .monitor-container {
    padding: 16px;
  }
  
  .section-container,
  .control-section {
    padding: 12px;
  }
}
</style> 