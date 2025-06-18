<template>
  <div class="membership-debug">
    <el-card header="会员状态调试信息">
      <div class="debug-section">
        <h3>1. 前端存储的用户信息</h3>
        <el-descriptions border :column="2">
          <el-descriptions-item label="会员等级">{{ frontendUserInfo.memberLevel }}</el-descriptions-item>
          <el-descriptions-item label="会员过期时间">{{ frontendUserInfo.memberExpireTime }}</el-descriptions-item>
          <el-descriptions-item label="用户ID">{{ frontendUserInfo.id }}</el-descriptions-item>
          <el-descriptions-item label="用户名">{{ frontendUserInfo.username }}</el-descriptions-item>
        </el-descriptions>
        
        <el-divider />
        
        <h3>2. localStorage原始数据</h3>
        <el-input
          v-model="localStorageUserInfo"
          type="textarea"
          rows="8"
          readonly
          style="font-family: monospace;"
        />
        
        <el-divider />
        
        <h3>3. 后端 /plugin-auth/user 接口数据</h3>
        <el-button @click="fetchUserInfo" :loading="loading" type="primary">
          重新获取用户信息
        </el-button>
        <div v-if="backendUserInfo">
          <el-input
            v-model="backendUserInfoStr"
            type="textarea"
            rows="8"
            readonly
            style="font-family: monospace; margin-top: 10px;"
          />
        </div>
        
        <el-divider />
        
        <h3>4. 会员状态接口 /membership/status</h3>
        <el-button @click="fetchMembershipStatus" :loading="loading2" type="warning">
          获取会员状态
        </el-button>
        <div v-if="membershipStatus">
          <el-input
            v-model="membershipStatusStr"
            type="textarea"
            rows="8"
            readonly
            style="font-family: monospace; margin-top: 10px;"
          />
        </div>
        
        <el-divider />
        
        <h3>5. 问题诊断</h3>
        <div class="diagnosis">
          <el-alert
            v-for="issue in diagnosis"
            :key="issue.type"
            :title="issue.title"
            :description="issue.description"
            :type="issue.level"
            show-icon
            style="margin-bottom: 10px;"
          />
        </div>
        
        <el-divider />
        
        <h3>6. 修复操作</h3>
        <el-button @click="refreshUserData" type="success" :loading="refreshing">
          强制刷新用户数据
        </el-button>
        <el-button @click="clearLocalStorage" type="danger">
          清空本地缓存
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { callApi } from '../services/auth';
import { getMembershipStatus } from '../api/membership';

const props = defineProps({
  user: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['refresh-user-info']);

// 状态
const loading = ref(false);
const loading2 = ref(false);
const refreshing = ref(false);
const backendUserInfo = ref(null);
const membershipStatus = ref(null);

// 前端用户信息
const frontendUserInfo = computed(() => ({
  memberLevel: props.user.memberLevel,
  memberExpireTime: props.user.memberExpireTime ? 
    new Date(props.user.memberExpireTime).toLocaleString() : '无',
  id: props.user.id,
  username: props.user.username
}));

// localStorage原始数据
const localStorageUserInfo = computed(() => {
  const userInfo = localStorage.getItem('user_info');
  return userInfo ? JSON.stringify(JSON.parse(userInfo), null, 2) : '无数据';
});

// 后端用户信息字符串
const backendUserInfoStr = computed(() => {
  return backendUserInfo.value ? JSON.stringify(backendUserInfo.value, null, 2) : '';
});

// 会员状态字符串
const membershipStatusStr = computed(() => {
  return membershipStatus.value ? JSON.stringify(membershipStatus.value, null, 2) : '';
});

// 问题诊断
const diagnosis = computed(() => {
  const issues = [];
  
  // 检查localStorage数据
  try {
    const localData = JSON.parse(localStorage.getItem('user_info') || '{}');
    if (localData.memberLevel) {
      if (localData.memberLevel !== props.user.memberLevel) {
        issues.push({
          type: 'data_mismatch',
          title: 'localStorage与前端数据不一致',
          description: `localStorage: ${localData.memberLevel}, 前端: ${props.user.memberLevel}`,
          level: 'warning'
        });
      }
    }
    
    // 检查membership对象
    if (localData.membership) {
      if (localData.membership.levelCode !== props.user.memberLevel) {
        issues.push({
          type: 'membership_mismatch',
          title: 'membership.levelCode与当前等级不一致',
          description: `membership.levelCode: ${localData.membership.levelCode}, 当前: ${props.user.memberLevel}`,
          level: 'error'
        });
      }
    }
  } catch (e) {
    issues.push({
      type: 'parse_error',
      title: 'localStorage数据解析失败',
      description: e.message,
      level: 'error'
    });
  }
  
  // 检查后端数据
  if (backendUserInfo.value) {
    const backendLevel = backendUserInfo.value.data?.membership?.levelCode || 
                        backendUserInfo.value.data?.memberLevel;
    if (backendLevel && backendLevel !== props.user.memberLevel) {
      issues.push({
        type: 'backend_mismatch',
        title: '后端数据与前端不一致',
        description: `后端: ${backendLevel}, 前端: ${props.user.memberLevel}`,
        level: 'error'
      });
    }
  }
  
  // 检查会员状态接口
  if (membershipStatus.value) {
    const statusLevel = membershipStatus.value.data?.levelCode;
    if (statusLevel && statusLevel !== props.user.memberLevel) {
      issues.push({
        type: 'status_mismatch',
        title: '会员状态接口数据与前端不一致',
        description: `状态接口: ${statusLevel}, 前端: ${props.user.memberLevel}`,
        level: 'error'
      });
    }
  }
  
  if (issues.length === 0) {
    issues.push({
      type: 'no_issues',
      title: '暂未发现明显问题',
      description: '所有检查项目都通过，可能需要检查后端数据库或其他环节',
      level: 'success'
    });
  }
  
  return issues;
});

// 获取用户信息
const fetchUserInfo = async () => {
  loading.value = true;
  try {
    console.log('调试：获取 /plugin-auth/user 数据');
    const response = await callApi('/plugin-auth/user');
    backendUserInfo.value = response;
    console.log('后端用户信息:', response);
    ElMessage.success('获取用户信息成功');
  } catch (error) {
    console.error('获取用户信息失败:', error);
    ElMessage.error('获取用户信息失败: ' + error.message);
  } finally {
    loading.value = false;
  }
};

// 获取会员状态
const fetchMembershipStatus = async () => {
  loading2.value = true;
  try {
    console.log('调试：获取 /membership/status 数据');
    const response = await getMembershipStatus();
    membershipStatus.value = response;
    console.log('会员状态信息:', response);
    ElMessage.success('获取会员状态成功');
  } catch (error) {
    console.error('获取会员状态失败:', error);
    ElMessage.error('获取会员状态失败: ' + error.message);
  } finally {
    loading2.value = false;
  }
};

// 强制刷新用户数据
const refreshUserData = async () => {
  refreshing.value = true;
  try {
    // 重新获取用户信息
    await fetchUserInfo();
    
    // 如果后端数据正常，更新localStorage
    if (backendUserInfo.value && backendUserInfo.value.code === 0) {
      localStorage.setItem('user_info', JSON.stringify(backendUserInfo.value.data));
      console.log('已更新localStorage用户信息');
      
      // 通知父组件刷新
      emit('refresh-user-info');
      ElMessage.success('用户数据已刷新');
    }
  } catch (error) {
    ElMessage.error('刷新用户数据失败: ' + error.message);
  } finally {
    refreshing.value = false;
  }
};

// 清空本地缓存
const clearLocalStorage = () => {
  localStorage.removeItem('user_info');
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  ElMessage.success('本地缓存已清空，请重新刷新页面');
};

onMounted(() => {
  console.log('会员调试页面加载，当前用户信息:', props.user);
});
</script>

<style scoped>
.membership-debug {
  padding: 20px;
}

.debug-section {
  padding: 20px;
}

.diagnosis {
  max-width: 800px;
}
</style> 