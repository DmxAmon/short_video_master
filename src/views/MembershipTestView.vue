<!--
 * @Version    : v1.00
 * @Author     : AI Codex
 * @Date       : 2024-05-15
 * @desc       : 会员系统测试页面，用于测试会员权限功能
-->
<script setup>
import { ref, onMounted } from 'vue';
import { ElButton, ElSelect, ElOption, ElInput, ElInputNumber, ElDivider, ElMessage, ElCard, ElTag } from 'element-plus';
import MemberInfo from '../components/membership/MemberInfo.vue';
import PermissionDenied from '../components/membership/PermissionDenied.vue';
import * as membershipApi from '../api/membershipApi';

// 定义状态
const memberLevels = ref([
  { value: 'free', label: '免费用户' },
  { value: 'standard', label: '标准会员' },
  { value: 'premium', label: '高级会员' },
  { value: 'professional', label: '专业会员' }
]);

const features = ref([
  { value: 'single_collect', label: '单视频采集' },
  { value: 'batch_collect', label: '批量视频采集' },
  { value: 'transcription', label: '视频转写' },
  { value: 'markdown', label: '基础Markdown' },
  { value: 'markdown:column', label: '列式Markdown' },
  { value: 'markdown:advanced', label: '高级Markdown' },
  { value: 'extract', label: '内容提取' },
  { value: 'download', label: '下载功能' }
]);

const selectedLevel = ref('free');
const selectedFeature = ref('single_collect');
const useAmount = ref(1);
const points = ref(100);
const loading = ref(false);
const permissionResult = ref(null);
const permissionDialogVisible = ref(false);

// 切换会员等级
const switchMemberLevel = async () => {
  try {
    loading.value = true;
    
    // 创建自定义用户数据
    const customUserData = {
      memberLevel: selectedLevel.value,
      points: points.value
    };
    
    // 使用API切换会员等级
    const result = await membershipApi.updateMemberLevel(customUserData);
    
    if (result && result.code === 0) {
      ElMessage.success(`已切换为${memberLevels.value.find(level => level.value === selectedLevel.value)?.label || selectedLevel.value}`);
      
      // 刷新页面
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      ElMessage.error('切换会员等级失败');
    }
  } catch (error) {
    console.error('切换会员等级出错:', error);
    ElMessage.error('切换会员等级出错: ' + (error.message || '未知错误'));
  } finally {
    loading.value = false;
  }
};

// 检查功能权限
const checkFeaturePermission = async () => {
  try {
    loading.value = true;
    permissionResult.value = null;
    
    // 调用API检查权限
    const result = await membershipApi.checkFeaturePermission(selectedFeature.value, useAmount.value);
    
    permissionResult.value = result;
    
    // 如果没有权限，显示权限不足对话框
    if (result.code !== 0 || (result.data && !result.data.hasPermission)) {
      permissionDialogVisible.value = true;
    } else {
      ElMessage.success('权限检查通过');
    }
  } catch (error) {
    console.error('检查功能权限出错:', error);
    ElMessage.error('检查功能权限出错: ' + (error.message || '未知错误'));
  } finally {
    loading.value = false;
  }
};

// 获取功能配额
const getFeatureQuota = async () => {
  try {
    loading.value = true;
    permissionResult.value = null;
    
    // 调用API获取功能配额
    const result = await membershipApi.getFeatureQuota(selectedFeature.value);
    
    permissionResult.value = result;
    ElMessage.success('获取功能配额成功');
  } catch (error) {
    console.error('获取功能配额出错:', error);
    ElMessage.error('获取功能配额出错: ' + (error.message || '未知错误'));
  } finally {
    loading.value = false;
  }
};

// 获取会员等级列表
const getMemberLevels = async () => {
  try {
    loading.value = true;
    permissionResult.value = null;
    
    // 调用API获取会员等级列表
    const result = await membershipApi.getMemberLevels();
    
    permissionResult.value = result;
    ElMessage.success('获取会员等级列表成功');
  } catch (error) {
    console.error('获取会员等级列表出错:', error);
    ElMessage.error('获取会员等级列表出错: ' + (error.message || '未知错误'));
  } finally {
    loading.value = false;
  }
};

// 获取当前会员信息
const getMemberInfo = async () => {
  try {
    loading.value = true;
    permissionResult.value = null;
    
    // 调用API获取会员信息
    const result = await membershipApi.getMemberInfo();
    
    permissionResult.value = result;
    ElMessage.success('获取会员信息成功');
  } catch (error) {
    console.error('获取会员信息出错:', error);
    ElMessage.error('获取会员信息出错: ' + (error.message || '未知错误'));
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="membership-test-container">
    <h1>会员系统测试</h1>
    
    <!-- 会员信息卡片 -->
    <div class="member-info-section">
      <MemberInfo />
    </div>
    
    <el-divider>会员等级切换</el-divider>
    
    <!-- 会员等级切换 -->
    <div class="level-switch-section">
      <div class="form-item">
        <div class="form-label">会员等级:</div>
        <div class="form-control">
          <el-select v-model="selectedLevel" placeholder="选择会员等级">
            <el-option
              v-for="item in memberLevels"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </div>
      </div>
      
      <div class="form-item">
        <div class="form-label">积分:</div>
        <div class="form-control">
          <el-input-number v-model="points" :min="0" :max="10000" />
        </div>
      </div>
      
      <div class="form-actions">
        <el-button type="primary" :loading="loading" @click="switchMemberLevel">
          切换会员等级
        </el-button>
      </div>
    </div>
    
    <el-divider>功能权限测试</el-divider>
    
    <!-- 功能权限测试 -->
    <div class="permission-test-section">
      <div class="form-item">
        <div class="form-label">功能:</div>
        <div class="form-control">
          <el-select v-model="selectedFeature" placeholder="选择功能">
            <el-option
              v-for="item in features"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </div>
      </div>
      
      <div class="form-item">
        <div class="form-label">使用数量:</div>
        <div class="form-control">
          <el-input-number v-model="useAmount" :min="1" :max="1000" />
        </div>
      </div>
      
      <div class="form-actions">
        <el-button type="primary" :loading="loading" @click="checkFeaturePermission">
          检查权限
        </el-button>
        <el-button type="info" :loading="loading" @click="getFeatureQuota">
          获取配额
        </el-button>
      </div>
    </div>
    
    <el-divider>API测试</el-divider>
    
    <!-- API测试 -->
    <div class="api-test-section">
      <div class="form-actions">
        <el-button type="success" :loading="loading" @click="getMemberInfo">
          获取会员信息
        </el-button>
        <el-button type="warning" :loading="loading" @click="getMemberLevels">
          获取会员等级列表
        </el-button>
      </div>
    </div>
    
    <!-- 结果展示 -->
    <div v-if="permissionResult" class="result-section">
      <el-divider>结果</el-divider>
      
      <el-card shadow="hover">
        <template #header>
          <div class="card-header">
            <span>API响应结果</span>
            <el-tag :type="permissionResult.code === 0 ? 'success' : 'danger'">
              {{ permissionResult.code === 0 ? '成功' : '失败' }}
            </el-tag>
          </div>
        </template>
        
        <div class="result-content">
          <pre>{{ JSON.stringify(permissionResult, null, 2) }}</pre>
        </div>
      </el-card>
    </div>
    
    <!-- 权限不足对话框 -->
    <PermissionDenied
      v-model:visible="permissionDialogVisible"
      :permission-data="permissionResult?.data"
      :feature-name="features.find(f => f.value === selectedFeature)?.label || selectedFeature"
    />
  </div>
</template>

<style scoped>
.membership-test-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.member-info-section {
  margin-bottom: 20px;
}

.level-switch-section,
.permission-test-section,
.api-test-section {
  margin-bottom: 20px;
}

.form-item {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.form-label {
  width: 80px;
  text-align: right;
  margin-right: 10px;
  color: #606266;
}

.form-control {
  flex: 1;
}

.form-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 20px;
}

.result-section {
  margin-top: 30px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.result-content {
  max-height: 400px;
  overflow-y: auto;
  background-color: #f5f7fa;
  padding: 10px;
  border-radius: 4px;
}

pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}
</style> 