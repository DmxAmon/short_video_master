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

    <!-- 转写统计显示 -->
    <div class="transcription-stats" v-if="showStats && stats">
      <div class="stats-item success">
        ✅ 成功转写: {{ stats.successCount }}
      </div>
      <div class="stats-item error" v-if="stats.failedCount > 0">
        ❌ 转写失败: {{ stats.failedCount }}
      </div>
      <div class="stats-item total">
        📊 总计: {{ stats.processedCount }}
      </div>
    </div>

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

// 暴露方法
defineExpose({
  addRealtimeResult,
  clearResults,
  setUpdatingState,
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

/* 转写统计样式 */
.transcription-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.stats-item {
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
}

.stats-item.success {
  background: #d4edda;
  color: #155724;
}

.stats-item.info {
  background: #d1ecf1;
  color: #0c5460;
}

.stats-item.error {
  background: #f8d7da;
  color: #721c24;
}

.stats-item.total {
  background: #e2e3e5;
  color: #383d41;
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
</style> 