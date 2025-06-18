<!--
 * @Version    : v1.00
 * @Author     : AI Codex
 * @Date       : 2024-05-15
 * @desc       : 会员信息组件，显示用户的会员信息
-->
<script setup>
import { ref, onMounted, computed } from 'vue';
import { ElCard, ElTag, ElProgress, ElButton, ElIcon } from 'element-plus';
import { Calendar, Medal, Coin, Star } from '@element-plus/icons-vue';
import * as membershipApi from '../../api/membershipApi';

// 定义props
const props = defineProps({
  simple: {
    type: Boolean,
    default: false
  }
});

// 定义状态
const loading = ref(false);
const memberInfo = ref(null);
const error = ref(null);

// 计算会员等级显示名称
const memberLevelName = computed(() => {
  if (!memberInfo.value) return '未知';
  
  const levelMap = {
    'free': '免费用户',
    'standard': '标准会员',
    'premium': '高级会员',
    'professional': '专业会员'
  };
  
  return levelMap[memberInfo.value.memberLevel] || memberInfo.value.memberLevel;
});

// 计算会员等级对应的标签类型
const memberLevelType = computed(() => {
  if (!memberInfo.value) return '';
  
  const typeMap = {
    'free': '',
    'standard': 'success',
    'premium': 'warning',
    'professional': 'danger'
  };
  
  return typeMap[memberInfo.value.memberLevel] || '';
});

// 计算会员到期剩余天数
const daysLeft = computed(() => {
  if (!memberInfo.value || !memberInfo.value.memberExpiry) return 0;
  
  const expiry = new Date(memberInfo.value.memberExpiry);
  const now = new Date();
  const diffTime = expiry - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : 0;
});

// 获取会员信息
const fetchMemberInfo = async () => {
  try {
    loading.value = true;
    error.value = null;
    
    const response = await membershipApi.getMemberInfo();
    if (response.code === 0) {
      memberInfo.value = response.data;
    } else {
      error.value = response.message || '获取会员信息失败';
    }
  } catch (err) {
    console.error('获取会员信息出错:', err);
    error.value = err.message || '获取会员信息出错';
  } finally {
    loading.value = false;
  }
};

// 组件挂载时获取会员信息
onMounted(() => {
  fetchMemberInfo();
});
</script>

<template>
  <div class="member-info-container">
    <el-card v-loading="loading" shadow="hover" class="member-info-card">
      <template #header>
        <div class="card-header">
          <span>会员信息</span>
          <el-button v-if="!simple" type="text" @click="fetchMemberInfo">刷新</el-button>
        </div>
      </template>
      
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
      
      <div v-else-if="memberInfo" class="member-info">
        <!-- 简洁模式 -->
        <div v-if="simple" class="simple-info">
          <div class="member-level">
            <el-tag :type="memberLevelType" effect="dark">{{ memberLevelName }}</el-tag>
            <span v-if="memberInfo.memberLevel !== 'free'" class="days-left">
              剩余 {{ daysLeft }} 天
            </span>
          </div>
          <div class="points">
            <el-icon><Coin /></el-icon>
            <span>{{ memberInfo.points }} 积分</span>
          </div>
        </div>
        
        <!-- 详细模式 -->
        <div v-else class="detailed-info">
          <div class="info-row">
            <div class="info-label">会员等级:</div>
            <div class="info-value">
              <el-tag :type="memberLevelType" effect="dark">{{ memberLevelName }}</el-tag>
            </div>
          </div>
          
          <div v-if="memberInfo.memberLevel !== 'free'" class="info-row">
            <div class="info-label">到期时间:</div>
            <div class="info-value">
              <el-icon><Calendar /></el-icon>
              <span>{{ new Date(memberInfo.memberExpiry).toLocaleDateString() }}</span>
              <span class="days-left">(剩余 {{ daysLeft }} 天)</span>
            </div>
          </div>
          
          <div class="info-row">
            <div class="info-label">积分余额:</div>
            <div class="info-value">
              <el-icon><Coin /></el-icon>
              <span>{{ memberInfo.points }} 积分</span>
            </div>
          </div>
          
          <div v-if="!simple && memberInfo.features && memberInfo.features.length > 0" class="info-row">
            <div class="info-label">可用功能:</div>
            <div class="info-value features-list">
              <el-tag 
                v-for="(feature, index) in memberInfo.features" 
                :key="index"
                size="small"
                class="feature-tag"
              >
                {{ feature }}
              </el-tag>
            </div>
          </div>
          
          <div v-if="!simple" class="quota-section">
            <h4>功能使用额度</h4>
            <div v-if="memberInfo.quotaLimits" class="quota-list">
              <div v-if="memberInfo.quotaLimits.single_video_collect_limit" class="quota-item">
                <div class="quota-label">单视频采集:</div>
                <div class="quota-value">
                  <el-progress 
                    :percentage="0" 
                    :format="() => `${memberInfo.quotaLimits.single_video_collect_limit}条`" 
                    :stroke-width="10"
                  />
                </div>
              </div>
              
              <div v-if="memberInfo.quotaLimits.batch_video_collect_limit" class="quota-item">
                <div class="quota-label">批量采集:</div>
                <div class="quota-value">
                  <el-progress 
                    :percentage="0" 
                    :format="() => `${memberInfo.quotaLimits.batch_video_collect_limit}次`" 
                    :stroke-width="10"
                  />
                </div>
              </div>
              
              <div v-if="memberInfo.quotaLimits.transcription_minutes" class="quota-item">
                <div class="quota-label">视频转写:</div>
                <div class="quota-value">
                  <el-progress 
                    :percentage="0" 
                    :format="() => `${memberInfo.quotaLimits.transcription_minutes}分钟`" 
                    :stroke-width="10"
                  />
                </div>
              </div>
              
              <div v-if="memberInfo.quotaLimits.markdown_limit" class="quota-item">
                <div class="quota-label">Markdown:</div>
                <div class="quota-value">
                  <el-progress 
                    :percentage="0" 
                    :format="() => `${memberInfo.quotaLimits.markdown_limit}次`" 
                    :stroke-width="10"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div v-if="memberInfo.memberLevel === 'free'" class="upgrade-section">
            <el-button type="primary" @click="$router.push('/membership')">
              升级会员
            </el-button>
          </div>
        </div>
      </div>
      
      <div v-else class="empty-info">
        暂无会员信息
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.member-info-container {
  width: 100%;
}

.member-info-card {
  width: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.error-message {
  color: #f56c6c;
  text-align: center;
  padding: 10px 0;
}

.empty-info {
  color: #909399;
  text-align: center;
  padding: 20px 0;
}

/* 简洁模式样式 */
.simple-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.member-level {
  display: flex;
  align-items: center;
}

.days-left {
  margin-left: 10px;
  font-size: 12px;
  color: #909399;
}

.points {
  display: flex;
  align-items: center;
}

.points .el-icon {
  margin-right: 5px;
  color: #e6a23c;
}

/* 详细模式样式 */
.detailed-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-row {
  display: flex;
  align-items: flex-start;
}

.info-label {
  width: 80px;
  color: #606266;
}

.info-value {
  flex: 1;
  display: flex;
  align-items: center;
}

.info-value .el-icon {
  margin-right: 5px;
}

.features-list {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.feature-tag {
  margin-right: 5px;
  margin-bottom: 5px;
}

.quota-section {
  margin-top: 10px;
}

.quota-section h4 {
  margin: 10px 0;
  font-size: 14px;
  color: #606266;
}

.quota-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quota-item {
  display: flex;
  align-items: center;
}

.quota-label {
  width: 80px;
  color: #606266;
}

.quota-value {
  flex: 1;
}

.upgrade-section {
  margin-top: 15px;
  text-align: center;
}
</style> 