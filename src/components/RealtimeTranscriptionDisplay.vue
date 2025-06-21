<template>
  <div class="realtime-transcription-display">
    <!-- 实时通知容器 -->
    <div class="realtime-notifications" v-if="showNotifications">
      <transition-group name="notification" tag="div">
        <div 
          v-for="notification in notifications" 
          :key="notification.id"
          :class="['realtime-notification', notification.type]"
        >
          {{ notification.message }}
        </div>
      </transition-group>
    </div>

    <!-- 转写状态显示 -->
    <div class="transcription-status" v-if="showStats && isTranscribing">
      <div class="status-item transcribing">
        <span class="transcribing-icon">🎙️</span>
        <span class="transcribing-text">正在批量转写中，请不要切换页面</span>
        <span class="transcribing-dots">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </span>
      </div>
    </div>

    <!-- 🚀 新增：批次进度显示 -->
    <div class="batch-progress" v-if="showStats && batchInfo">
      <div class="batch-info">
        <span class="batch-text">批次进度: {{ batchInfo.current_batch }}/{{ batchInfo.total_batches }}</span>
        <div class="batch-progress-bar">
          <div class="batch-progress-fill" 
               :style="{ width: (batchInfo.current_batch / batchInfo.total_batches) * 100 + '%' }">
          </div>
        </div>
      </div>
    </div>

    <!-- 🚀 新增：积分统计显示 
    <div class="points-statistics" v-if="showStats && pointsStatistics">
      <div class="points-info">
        <span class="points-item">💰 已使用积分: {{ pointsStatistics.total_deducted }}</span>
        <span class="points-item">✅ 完成条数: {{ pointsStatistics.completed_items }}</span>
      </div>
    </div>
-->
    <!-- 移除实时结果列表显示 -->
    <!-- 移除批量更新确认弹窗 -->
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { createLogger } from '../utils/logger';

// 创建日志记录器
const logger = createLogger('REALTIME_DISPLAY');

// Props
const props = defineProps({
  showNotifications: {
    type: Boolean,
    default: true
  },
  showStats: {
    type: Boolean,
    default: true
  },
  autoUpdateToTable: {
    type: Boolean,
    default: true
  },
  maxNotifications: {
    type: Number,
    default: 5
  }
});

// Emits
const emit = defineEmits(['update-to-table', 'result-added']);

// 响应式数据
const notifications = ref([]);
const results = ref([]);
const stats = ref({
  processedCount: 0,
  successCount: 0,
  failedCount: 0
});
const isUpdatingTable = ref(false);
const isTranscribing = ref(false);
const batchInfo = ref(null);
const pointsStatistics = ref(null);

// 通知ID计数器
let notificationId = 0;

// 添加实时结果
const addRealtimeResult = (realtimeData) => {
  const { result, progress, isFinal } = realtimeData;
  
  // 过滤掉智能分析结果，只处理真正的转写成功和失败
  if (result.is_fallback) {
    logger.info('跳过智能分析结果', { recordId: result.record_id });
    return;
  }
  
  // 添加时间戳
  result.timestamp = Date.now();
  
  // 检查是否已存在（避免重复）
  const existingIndex = results.value.findIndex(r => r.record_id === result.record_id);
  if (existingIndex !== -1) {
    // 更新现有结果
    results.value[existingIndex] = result;
  } else {
    // 添加新结果
    results.value.unshift(result);
  }
  
  // 更新统计
  updateStats();
  
  // 显示通知（只显示成功转写的通知）
  if (result.status === 'completed' && !result.is_fallback) {
    showRealtimeNotification(result);
  } else if (result.status === 'failed') {
    showRealtimeNotification(result);
  }
  
  // 发送事件
  emit('result-added', { result, progress, isFinal });
  
  // 🚀 自动更新到表格
  if (props.autoUpdateToTable && (result.status === 'completed' && !result.is_fallback)) {
    autoUpdateSingleResult(result);
  }
  
  logger.info('📝 添加实时转写结果', {
    recordId: result.record_id,
    status: result.status,
    isFallback: result.is_fallback,
    textLength: result.transcription_text?.length || 0,
    autoUpdated: props.autoUpdateToTable && result.status === 'completed' && !result.is_fallback
  });
};

// 🚀 自动更新单个结果到表格
const autoUpdateSingleResult = async (result) => {
  try {
    // 发送单个结果更新事件
    emit('update-to-table', [result]);
    
    logger.info('🔄 自动更新单个结果到表格', {
      recordId: result.record_id,
      textLength: result.transcription_text?.length || 0
    });
    
  } catch (error) {
    logger.error('自动更新单个结果失败', error);
  }
};

// 显示实时通知
const showRealtimeNotification = (result) => {
  if (!props.showNotifications) return;
  
  let message, type;
  
  if (result.status === 'failed') {
    message = `❌ ${result.record_id}: 转写失败`;
    type = 'error';
  } else if (result.status === 'completed' && !result.is_fallback) {
    message = `✅ ${result.record_id}: 转写完成 (${result.word_count || 0}字)`;
    type = 'success';
  } else {
    // 跳过智能分析的通知
    return;
  }
  
  const notification = {
    id: ++notificationId,
    message,
    type
  };
  
  notifications.value.push(notification);
  
  // 限制通知数量
  if (notifications.value.length > props.maxNotifications) {
    notifications.value.shift();
  }
  
  // 自动移除通知
  setTimeout(() => {
    const index = notifications.value.findIndex(n => n.id === notification.id);
    if (index !== -1) {
      notifications.value.splice(index, 1);
    }
  }, 3000);
};

// 更新统计（不包括智能分析）
const updateStats = () => {
  const validResults = results.value.filter(r => !r.is_fallback);
  stats.value = {
    processedCount: validResults.length,
    successCount: validResults.filter(r => r.status === 'completed').length,
    failedCount: validResults.filter(r => r.status === 'failed').length
  };
};

// 清空结果
const clearResults = () => {
  results.value = [];
  notifications.value = [];
  updateStats();
};

// 设置更新状态
const setUpdatingState = (state) => {
  isUpdatingTable.value = state;
};

// 开始转写
const startTranscribing = () => {
  isTranscribing.value = true;
  logger.info('🎙️ 开始转写');
};

// 停止转写
const stopTranscribing = () => {
  isTranscribing.value = false;
  logger.info('⏹️ 停止转写');
};

// 🚀 新增：更新批次信息
const updateBatchInfo = (newBatchInfo) => {
  batchInfo.value = newBatchInfo;
  logger.info('📊 更新批次信息', newBatchInfo);
};

// 🚀 新增：更新积分统计
const updatePointsStatistics = (newPointsStats) => {
  pointsStatistics.value = newPointsStats;
  logger.info('💰 更新积分统计', newPointsStats);
};

// 🚀 新增：清除批次和积分信息
const clearBatchAndPointsInfo = () => {
  batchInfo.value = null;
  pointsStatistics.value = null;
  logger.info('🧹 清除批次和积分信息');
};

// 暴露方法
defineExpose({
  addRealtimeResult,
  clearResults,
  setUpdatingState,
  startTranscribing,
  stopTranscribing,
  updateBatchInfo,
  updatePointsStatistics,
  clearBatchAndPointsInfo,
  results: computed(() => results.value),
  stats: computed(() => stats.value)
});
</script>

<style scoped>
.realtime-transcription-display {
  position: relative;
}

/* 实时通知样式 */
.realtime-notifications {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  max-width: 400px;
}

.realtime-notification {
  background: #fff;
  border-left: 4px solid #007bff;
  padding: 12px 16px;
  margin-bottom: 8px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  font-size: 14px;
}

.realtime-notification.success {
  border-left-color: #28a745;
}

.realtime-notification.info {
  border-left-color: #17a2b8;
}

.realtime-notification.error {
  border-left-color: #dc3545;
}

/* 转写状态样式 */
.transcription-status {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.status-item {
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-item.transcribing {
  background: linear-gradient(135deg, #d4edda, #c3e6cb);
  color: #155724;
  border: 2px solid #b3d7c1;
  box-shadow: 0 2px 8px rgba(21, 87, 36, 0.1);
  animation: transcribing-pulse 2s ease-in-out infinite;
}

/* 🚀 转写图标动画 */
.transcribing-icon {
  font-size: 16px;
  animation: icon-bounce 1.5s ease-in-out infinite;
}

/* 🚀 转写文本样式 */
.transcribing-text {
  font-weight: 600;
  letter-spacing: 0.5px;
}

/* 🚀 动态点点点效果 */
.transcribing-dots {
  display: flex;
  gap: 2px;
  align-items: center;
}

.transcribing-dots .dot {
  width: 4px;
  height: 4px;
  background-color: #155724;
  border-radius: 50%;
  animation: dot-bounce 1.4s ease-in-out infinite both;
}

.transcribing-dots .dot:nth-child(1) {
  animation-delay: -0.32s;
}

.transcribing-dots .dot:nth-child(2) {
  animation-delay: -0.16s;
}

.transcribing-dots .dot:nth-child(3) {
  animation-delay: 0s;
}

/* 🚀 动画关键帧 */
@keyframes transcribing-pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 2px 8px rgba(21, 87, 36, 0.1);
  }
  50% {
    transform: scale(1.02);
    box-shadow: 0 4px 16px rgba(21, 87, 36, 0.2);
  }
}

@keyframes icon-bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-3px);
  }
  60% {
    transform: translateY(-1px);
  }
}

@keyframes dot-bounce {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 动画效果 */
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.notification-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

/* 🚀 新增：批次进度显示样式 */
.batch-progress {
  margin-bottom: 16px;
}

.batch-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.batch-text {
  font-size: 14px;
  font-weight: 500;
}

.batch-progress-bar {
  width: 200px;
  height: 16px;
  background-color: #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
}

.batch-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #007bff, #0056b3, #007bff);
  background-size: 200% 100%;
  animation: progress-flow 2s linear infinite;
  transition: width 0.5s ease-out;
}

/* 🚀 进度条流动动画 */
@keyframes progress-flow {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* 🚀 新增：积分统计显示样式 */
.points-statistics {
  margin-bottom: 16px;
}

.points-info {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 12px;
  background: linear-gradient(135deg, #fff3cd, #ffeeba);
  border-radius: 6px;
  border: 1px solid #ffeaa7;
}

.points-item {
  font-size: 14px;
  font-weight: 500;
  color: #856404;
  animation: points-glow 3s ease-in-out infinite;
}

/* 🚀 积分统计发光效果 */
@keyframes points-glow {
  0%, 100% {
    text-shadow: 0 0 2px rgba(133, 100, 4, 0.3);
  }
  50% {
    text-shadow: 0 0 8px rgba(133, 100, 4, 0.6);
  }
}
</style> 