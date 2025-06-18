<!--
 * 功能卡片组件
 * 显示功能信息及其限制状态
-->
<script setup>
import { computed } from 'vue';
import { ElProgress } from 'element-plus';

const props = defineProps({
  // 功能数据
  feature: {
    type: Object,
    required: true
  },
  // 是否以卡片形式显示
  asCard: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['try-use', 'upgrade']);

// 功能是否可用
const isAvailable = computed(() => {
  return props.feature.isAvailable;
});

// 使用限制显示
const usageDisplay = computed(() => {
  const { usageInfo } = props.feature;
  if (!usageInfo) return '';
  
  if (usageInfo.unlimited) {
    return `${usageInfo.used} / 无限制`;
  }
  
  return `${usageInfo.used} / ${usageInfo.limit}`;
});

// 进度条状态
const progressStatus = computed(() => {
  const { usageInfo } = props.feature;
  if (!usageInfo || usageInfo.unlimited) return 'success';
  
  const percentage = usageInfo.percentage;
  if (percentage >= 90) return 'exception';
  if (percentage >= 70) return 'warning';
  return 'success';
});

// 处理使用功能点击
const handleUseClick = () => {
  if (isAvailable.value) {
    emit('try-use', props.feature.id);
  } else {
    emit('upgrade', props.feature.id);
  }
};
</script>

<template>
  <div 
    class="feature-card" 
    :class="{ 
      'as-card': asCard,
      'disabled': !isAvailable 
    }"
  >
    <div class="feature-header">
      <div class="feature-title">{{ feature.name }}</div>
      <div class="feature-status">
        <span 
          class="status-dot" 
          :class="{ 'available': isAvailable }"
        ></span>
        <span v-if="isAvailable">可用</span>
        <span v-else class="disabled-text">受限</span>
      </div>
    </div>
    
    <div class="feature-description">
      {{ feature.description }}
    </div>
    
    <div class="feature-usage" v-if="feature.usageInfo">
      <div class="usage-label">
        <span>今日已使用: </span>
        <span class="usage-count">{{ usageDisplay }}</span>
      </div>
      <el-progress 
        v-if="!feature.usageInfo.unlimited" 
        :percentage="feature.usageInfo.percentage"
        :status="progressStatus"
        :stroke-width="4"
      />
    </div>
    
    <div class="feature-action">
      <el-button 
        v-if="isAvailable" 
        type="primary" 
        size="small"
        @click="handleUseClick"
      >
        使用功能
      </el-button>
      <el-button 
        v-else 
        type="danger" 
        size="small"
        @click="handleUseClick"
      >
        升级会员
      </el-button>
      
      <div v-if="!isAvailable" class="disabled-reason">
        {{ feature.disabledReason }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.feature-card {
  background-color: #fff;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.3s;
}

.feature-card.as-card {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  margin-bottom: 16px;
}

.feature-card.disabled {
  background-color: #f8f8f8;
}

.feature-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.feature-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.feature-status {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #606266;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 4px;
  background-color: #909399;
}

.status-dot.available {
  background-color: #67c23a;
}

.disabled-text {
  color: #f56c6c;
}

.feature-description {
  font-size: 14px;
  color: #606266;
  margin-bottom: 12px;
  line-height: 1.4;
}

.feature-usage {
  margin-bottom: 12px;
}

.usage-label {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #606266;
  margin-bottom: 4px;
}

.usage-count {
  font-weight: 600;
}

.feature-action {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.disabled-reason {
  margin-top: 8px;
  font-size: 12px;
  color: #f56c6c;
}
</style> 