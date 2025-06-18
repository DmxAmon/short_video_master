<!--
 * @Version    : v1.00
 * @Author     : Amon
 * @Date       : 20245-05-06
 * @desc       : 用户使用统计面板组件，展示用户各功能的使用情况
-->
<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';

const props = defineProps({
  usageStats: {
    type: Object,
    default: () => ({})
  },
  memberInfo: {
    type: Object,
    default: () => ({})
  }
});

// 加载状态
const loading = ref(false);

// 统计数据
const statsData = ref([
  {
    id: 'videoExtract',
    name: '视频数据采集',
    icon: 'DataAnalysis',
    color: '#409eff',
    used: 0,
    limit: 0,
    unit: '次'
  },
  {
    id: 'videoBatch',
    name: '批量采集',
    icon: 'Collection',
    color: '#67c23a',
    used: 0,
    limit: 0,
    unit: '次'
  },
  {
    id: 'videoTranscribe',
    name: '视频转写',
    icon: 'Document',
    color: '#e6a23c',
    used: 0,
    limit: 0,
    unit: '分钟'
  },
  {
    id: 'markdownConvert',
    name: 'Markdown处理',
    icon: 'Edit',
    color: '#f56c6c',
    used: 0,
    limit: 0,
    unit: '次'
  }
]);

// 使用情况摘要
const usageSummary = computed(() => {
  const totalUsed = statsData.value.reduce((sum, item) => sum + item.used, 0);
  const totalLimit = statsData.value.reduce((sum, item) => {
    // 无限额度不计入总额
    return sum + (item.limit === -1 || item.limit === Infinity ? 0 : item.limit);
  }, 0);
  
  const percentUsed = totalLimit > 0 ? Math.round((totalUsed / totalLimit) * 100) : 0;
  
  return {
    totalUsed,
    totalLimit,
    percentUsed
  };
});

// 计算进度条颜色
const getProgressColor = (percent) => {
  if (percent >= 90) return '#f56c6c';
  if (percent >= 70) return '#e6a23c';
  return '#67c23a';
};

// 格式化使用限制数量
const formatLimit = (limit) => {
  if (limit === -1 || limit === Infinity) return '不限';
  return limit.toString();
};

// 计算使用比例
const getUsagePercent = (used, limit) => {
  if (limit === -1 || limit === Infinity) return 0;
  if (limit === 0) return 100;
  return Math.min(100, Math.round((used / limit) * 100));
};

// 获取使用状态
const getUsageStatus = (used, limit) => {
  if (limit === -1 || limit === Infinity) return '';
  
  const percent = getUsagePercent(used, limit);
  if (percent >= 90) return 'danger';
  if (percent >= 70) return 'warning';
  return 'success';
};

// 刷新使用统计数据
const refreshStats = async () => {
  loading.value = true;
  
  try {
    // 调用真实API获取使用统计
    const response = await getUserQuota('all');
    if (response && response.code === 0) {
      statsData.value = response.data || [];
    } else {
      throw new Error(response?.message || '获取使用统计失败');
    }
  } catch (error) {
    console.error('获取使用统计失败:', error);
    ElMessage.error('获取使用统计失败');
  } finally {
    loading.value = false;
  }
};

// 获取当前会员级别和重置日期
const memberLevel = computed(() => {
  return props.memberInfo.levelName || '免费用户';
});

// 下个周期重置日期
const nextResetDate = computed(() => {
  // 获取当前月的最后一天
  const today = new Date();
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  return `${lastDayOfMonth.getFullYear()}-${String(lastDayOfMonth.getMonth() + 1).padStart(2, '0')}-${String(lastDayOfMonth.getDate()).padStart(2, '0')}`;
});

// 初始化
onMounted(() => {
  refreshStats();
});
</script>

<template>
  <div class="usage-stats-panel">
    <div class="panel-header">
      <h3 class="panel-title">功能使用统计</h3>
      <el-button type="primary" size="small" @click="refreshStats" :loading="loading">刷新</el-button>
    </div>
    
    <div class="stats-overview">
      <div class="overview-item member-info">
        <div class="overview-label">当前会员</div>
        <div class="overview-value">{{ memberLevel }}</div>
      </div>
      
      <div class="overview-item quota-info">
        <div class="overview-label">总体使用情况</div>
        <div class="overview-value">
          {{ usageSummary.totalUsed }} / {{ usageSummary.totalLimit === 0 ? '不限' : usageSummary.totalLimit }}
        </div>
        <el-progress 
          :percentage="usageSummary.percentUsed" 
          :color="getProgressColor(usageSummary.percentUsed)"
          :stroke-width="10"
        />
      </div>
      
      <div class="overview-item reset-info">
        <div class="overview-label">下次重置日期</div>
        <div class="overview-value">{{ nextResetDate }}</div>
      </div>
    </div>
    
    <div class="stats-detail" v-loading="loading">
      <div 
        v-for="item in statsData" 
        :key="item.id"
        class="stat-card"
      >
        <div class="stat-icon" :style="{ backgroundColor: item.color + '20', color: item.color }">
          <el-icon :size="20"><component :is="item.icon" /></el-icon>
        </div>
        
        <div class="stat-info">
          <div class="stat-name">{{ item.name }}</div>
          <div class="stat-usage">
            已用 <span class="used-value">{{ item.used }}</span> 
            / 
            总共 <span class="limit-value">{{ formatLimit(item.limit) }}</span> {{ item.unit }}
          </div>
          
          <el-progress 
            v-if="item.limit !== -1 && item.limit !== Infinity"
            :percentage="getUsagePercent(item.used, item.limit)" 
            :status="getUsageStatus(item.used, item.limit)" 
          />
          
          <div v-else class="unlimited-badge">
            无限制使用
          </div>
        </div>
      </div>
    </div>
    
    <div class="reset-notice">
      <el-alert
        title="配额说明"
        type="info"
        :closable="false"
        description="各功能的使用配额将在每月最后一天24点重置。未使用的配额不会累计到下个月。"
      />
    </div>
  </div>
</template>

<style scoped>
.usage-stats-panel {
  margin-top: 20px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 20px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.panel-title {
  font-size: 18px;
  font-weight: 500;
  color: #303133;
  margin: 0;
}

.stats-overview {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 20px;
}

.overview-item {
  flex: 1;
  min-width: 180px;
  background-color: #f5f7fa;
  border-radius: 8px;
  padding: 15px;
}

.overview-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 10px;
}

.overview-value {
  font-size: 20px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 10px;
}

.stats-detail {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.stat-card {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 15px;
  display: flex;
  align-items: flex-start;
  transition: all 0.3s;
}

.stat-card:hover {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  transform: translateY(-3px);
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
}

.stat-info {
  flex: 1;
}

.stat-name {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 8px;
}

.stat-usage {
  font-size: 13px;
  color: #606266;
  margin-bottom: 10px;
}

.used-value {
  font-weight: 500;
  color: #303133;
}

.limit-value {
  font-weight: 500;
  color: #303133;
}

.unlimited-badge {
  display: inline-block;
  padding: 4px 8px;
  font-size: 12px;
  border-radius: 4px;
  background-color: #f0f9eb;
  color: #67c23a;
}

.reset-notice {
  margin-top: 20px;
}
</style> 