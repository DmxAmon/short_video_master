<!--
 * @Version    : v1.00
 * @Author     : Amon
 * @Date       : 2025-01-02
 * @desc       : 会员升级功能测试页面
-->
<template>
  <div class="upgrade-test-container">
    <div class="page-header">
      <h2 class="page-title">会员升级功能测试</h2>
      <el-button @click="goBack" class="back-button">返回</el-button>
    </div>

    <!-- 测试参数设置 -->
    <el-card class="test-config" shadow="hover">
      <template #header>
        <span>测试参数设置</span>
      </template>
      
      <div class="config-section">
        <h4>当前用户状态模拟</h4>
        <el-form :model="testUserData" label-width="120px">
          <el-form-item label="当前会员等级:">
            <el-select v-model="testUserData.memberLevel" placeholder="选择会员等级">
              <el-option label="普通会员" value="normal" />
              <el-option label="高级会员" value="advanced" />
              <el-option label="专业会员" value="professional" />
            </el-select>
          </el-form-item>
          
          <el-form-item label="会员过期时间:">
            <el-date-picker
              v-model="testUserData.memberExpireTime"
              type="date"
              placeholder="选择过期时间"
              :disabled="testUserData.memberLevel === 'normal'"
            />
          </el-form-item>
          
          <el-form-item label="用户积分:">
            <el-input-number 
              v-model="testUserData.points" 
              :min="0" 
              :max="1000000"
              :step="1000"
            />
          </el-form-item>
        </el-form>
      </div>

      <div class="config-section">
        <h4>升级目标设置</h4>
        <el-radio-group v-model="targetLevel">
          <el-radio value="advanced">升级到高级会员</el-radio>
          <el-radio value="professional">升级到专业会员</el-radio>
        </el-radio-group>
      </div>
    </el-card>

    <!-- 当前状态显示 -->
    <el-card class="current-status" shadow="hover">
      <template #header>
        <span>当前状态</span>
      </template>
      
      <div class="status-info">
        <div class="status-item">
          <span class="label">会员等级:</span>
          <span class="value">
            <el-tag :type="getMemberTagType(testUserData.memberLevel)">
              {{ getMemberLevelName(testUserData.memberLevel) }}
            </el-tag>
          </span>
        </div>
        
        <div class="status-item" v-if="testUserData.memberLevel !== 'normal'">
          <span class="label">过期时间:</span>
          <span class="value">{{ formatDate(testUserData.memberExpireTime) }}</span>
        </div>
        
        <div class="status-item">
          <span class="label">用户积分:</span>
          <span class="value points">{{ testUserData.points.toLocaleString() }}</span>
        </div>
        
        <div class="status-item">
          <span class="label">升级目标:</span>
          <span class="value">{{ getMemberLevelName(targetLevel) }}</span>
        </div>
      </div>
    </el-card>

    <!-- 操作按钮 -->
    <el-card class="test-actions" shadow="hover">
      <template #header>
        <span>测试操作</span>
      </template>
      
      <div class="action-buttons">
        <el-button 
          type="primary" 
          size="large" 
          @click="openUpgradeModal"
          :disabled="testUserData.memberLevel === targetLevel"
        >
          测试会员升级功能
        </el-button>
        
        <el-button 
          type="success" 
          size="large" 
          @click="simulateCurrentMember"
        >
          模拟已是专业会员
        </el-button>
        
        <el-button 
          type="warning" 
          size="large" 
          @click="resetToNormal"
        >
          重置为普通用户
        </el-button>
      </div>
    </el-card>

    <!-- 测试日志 -->
    <el-card class="test-logs" shadow="hover">
      <template #header>
        <div class="log-header">
          <span>测试日志</span>
          <el-button size="small" @click="clearLogs">清空日志</el-button>
        </div>
      </template>
      
      <div class="logs-content">
        <div 
          v-for="(log, index) in testLogs" 
          :key="index" 
          class="log-item"
          :class="log.type"
        >
          <span class="log-time">{{ log.time }}</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
        
        <div v-if="testLogs.length === 0" class="no-logs">
          暂无测试日志
        </div>
      </div>
    </el-card>

    <!-- 会员升级模态框 -->
    <MembershipUpgradeModal
      v-model="showUpgradeModal"
      :current-member-level="testUserData.memberLevel"
      :member-expire-time="testUserData.memberExpireTime"
      :target-level="targetLevel"
      @upgrade-success="handleUpgradeSuccess"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import MembershipUpgradeModal from '../components/membership/MembershipUpgradeModal.vue';

const router = useRouter();

// 测试用户数据
const testUserData = ref({
  memberLevel: 'normal',
  memberExpireTime: null,
  points: 5000
});

// 升级目标
const targetLevel = ref('professional');

// 模态框状态
const showUpgradeModal = ref(false);

// 测试日志
const testLogs = ref([]);

// 会员等级名称映射
const levelNames = {
  'normal': '普通会员',
  'advanced': '高级会员', 
  'professional': '专业会员'
};

// 获取会员等级名称
const getMemberLevelName = (level) => {
  return levelNames[level] || '未知等级';
};

// 获取会员标签类型
const getMemberTagType = (level) => {
  switch (level) {
    case 'normal': return '';
    case 'advanced': return 'warning';
    case 'professional': return 'success';
    default: return '';
  }
};

// 格式化日期
const formatDate = (date) => {
  if (!date) return '无';
  return new Date(date).toLocaleDateString('zh-CN');
};

// 添加测试日志
const addLog = (message, type = 'info') => {
  const time = new Date().toLocaleTimeString();
  testLogs.value.unshift({
    time,
    message,
    type
  });
  
  // 限制日志数量
  if (testLogs.value.length > 50) {
    testLogs.value.pop();
  }
};

// 清空日志
const clearLogs = () => {
  testLogs.value = [];
  addLog('日志已清空', 'info');
};

// 打开升级模态框
const openUpgradeModal = () => {
  if (testUserData.value.memberLevel === targetLevel.value) {
    ElMessage.warning('当前已是目标等级，无需升级');
    return;
  }
  
  addLog(`开始测试会员升级：${getMemberLevelName(testUserData.value.memberLevel)} → ${getMemberLevelName(targetLevel.value)}`, 'info');
  showUpgradeModal.value = true;
};

// 模拟已是专业会员
const simulateCurrentMember = () => {
  testUserData.value.memberLevel = 'professional';
  testUserData.value.memberExpireTime = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  testUserData.value.points = 150000;
  
  addLog('已模拟为专业会员状态', 'success');
  ElMessage.success('已切换为专业会员状态');
};

// 重置为普通用户
const resetToNormal = () => {
  testUserData.value.memberLevel = 'normal';
  testUserData.value.memberExpireTime = null;
  testUserData.value.points = 5000;
  
  addLog('已重置为普通用户状态', 'warning');
  ElMessage.warning('已重置为普通用户状态');
};

// 处理升级成功
const handleUpgradeSuccess = (result) => {
  addLog(`会员升级成功！升级到：${result.package.name}`, 'success');
  
  // 更新测试用户数据（模拟升级后的状态）
  testUserData.value.memberLevel = result.newLevel;
  testUserData.value.memberExpireTime = new Date(Date.now() + (result.package.duration_days || 365) * 24 * 60 * 60 * 1000);
  
  ElMessage.success('测试升级成功！用户状态已更新');
};

// 返回上一页
const goBack = () => {
  router.back();
};

// 初始化日志
addLog('会员升级测试页面已加载', 'info');
</script>

<style scoped>
.upgrade-test-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  margin: 0;
  color: #333;
}

.back-button {
  margin-left: auto;
}

.test-config,
.current-status,
.test-actions,
.test-logs {
  margin-bottom: 20px;
}

.config-section {
  margin-bottom: 30px;
}

.config-section h4 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 16px;
}

.status-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-item .label {
  color: #666;
  font-weight: 500;
}

.status-item .value {
  font-weight: bold;
}

.status-item .points {
  color: #e6a23c;
}

.action-buttons {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logs-content {
  max-height: 300px;
  overflow-y: auto;
  background: #f5f7fa;
  border-radius: 4px;
  padding: 10px;
}

.log-item {
  display: flex;
  gap: 10px;
  margin-bottom: 5px;
  padding: 5px;
  border-radius: 4px;
  font-size: 14px;
}

.log-item.info {
  background: #f0f9ff;
  color: #0969da;
}

.log-item.success {
  background: #f0f9eb;
  color: #1a7f37;
}

.log-item.warning {
  background: #fff8e1;
  color: #bf8700;
}

.log-item.error {
  background: #fef2f2;
  color: #cf222e;
}

.log-time {
  color: #666;
  font-size: 12px;
  white-space: nowrap;
}

.log-message {
  flex: 1;
}

.no-logs {
  text-align: center;
  color: #999;
  padding: 20px;
}

@media (max-width: 768px) {
  .status-info {
    grid-template-columns: 1fr;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .action-buttons .el-button {
    width: 100%;
  }
}
</style> 