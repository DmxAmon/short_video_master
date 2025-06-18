<template>
  <div class="feishu-auth-container">
    <!-- 授权状态显示 -->
    <div class="auth-status" v-if="loading">
      <el-skeleton :rows="3" animated />
    </div>
    
    <div v-else class="auth-status">
      <div class="auth-status-header">
        <h3>飞书多维表格授权状态</h3>
      </div>
      
      <div class="auth-status-content" v-if="isAuthorized">
        <el-result
          icon="success"
          title="已授权"
          sub-title="您已成功授权我们访问您的飞书多维表格"
        >
          <template #extra>
            <div class="user-info" v-if="userInfo">
              <el-avatar :src="userInfo.avatar" v-if="userInfo.avatar">{{ userInfo.name ? userInfo.name[0] : 'U' }}</el-avatar>
              <span class="user-name">{{ userInfo.name || '飞书用户' }}</span>
            </div>
            <div class="expire-info" v-if="expireTime">
              <span>授权有效期至: {{ formatDate(expireTime) }}</span>
              <span v-if="isExpiringSoon" class="expire-soon">(即将到期)</span>
            </div>
            <div class="auth-actions">
              <el-button type="primary" @click="refreshAuth" :loading="refreshing">刷新授权</el-button>
              <el-button type="danger" @click="confirmRevoke">解除授权</el-button>
            </div>
          </template>
        </el-result>
      </div>
      
      <div class="auth-status-content" v-else>
        <el-result
          icon="warning"
          title="未授权"
          sub-title="您需要授权我们访问您的飞书多维表格才能使用相关功能"
        >
          <template #extra>
            <el-button type="primary" @click="startAuth" :loading="authorizing">授权飞书</el-button>
          </template>
        </el-result>
      </div>
    </div>
    
    <!-- 飞书授权回调处理 -->
    <div v-if="isCallbackProcessing" class="callback-processing">
      <el-result icon="loading" title="处理中">
        <template #sub-title>
          <span>正在处理飞书授权，请稍候...</span>
        </template>
      </el-result>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getFeishuAuthUrl, checkFeishuAuthStatus, refreshFeishuAuth, revokeFeishuAuth } from '../../api/bitable';

// 定义props
const props = defineProps({
  // 是否自动检查授权状态
  autoCheck: {
    type: Boolean,
    default: true
  }
});

// 定义emit
const emit = defineEmits(['auth-status-changed', 'auth-success', 'auth-error', 'auth-revoked']);

// 组件状态
const loading = ref(true);
const isAuthorized = ref(false);
const authorizing = ref(false);
const refreshing = ref(false);
const userInfo = ref(null);
const expireTime = ref(null);
const isCallbackProcessing = ref(false);
const pollingTimerId = ref(null); // 存储轮询定时器ID

// 计算属性：是否即将到期（7天内）
const isExpiringSoon = computed(() => {
  if (!expireTime.value) return false;
  const expireDate = new Date(expireTime.value);
  const now = new Date();
  const diffDays = Math.floor((expireDate - now) / (24 * 60 * 60 * 1000));
  return diffDays >= 0 && diffDays <= 7;
});

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

// 检查飞书授权状态
const checkAuthStatus = async () => {
  try {
    loading.value = true;
    const response = await checkFeishuAuthStatus();
    isAuthorized.value = response.is_authorized;
    userInfo.value = response.user_info;
    expireTime.value = response.expired_at;
    
    emit('auth-status-changed', {
      isAuthorized: isAuthorized.value,
      userInfo: userInfo.value,
      expireTime: expireTime.value
    });
    
    return response;
  } catch (error) {
    console.error('检查飞书授权状态失败:', error);
    ElMessage.error(`检查授权状态失败: ${error.message}`);
    isAuthorized.value = false;
    userInfo.value = null;
    expireTime.value = null;
    
    emit('auth-status-changed', {
      isAuthorized: false,
      error: error.message
    });
    
    return { is_authorized: false };
  } finally {
    loading.value = false;
  }
};

// 开始轮询检查授权状态
const startPollingAuthStatus = () => {
  try {
    // 先清除可能存在的旧定时器
    stopPollingAuthStatus();
    
    // 定义轮询次数和间隔
    let pollCount = 0;
    const maxPolls = 10; // 最多轮询10次
    const pollInterval = 5000; // 每5秒轮询一次
    
    console.log('开始轮询检查飞书授权状态');
    
    // 创建新的定时器
    pollingTimerId.value = setInterval(async () => {
      pollCount++;
      console.log(`第${pollCount}次轮询检查授权状态`);
      
      try {
        const status = await checkAuthStatus();
        if (status.is_authorized) {
          console.log('检测到授权成功，停止轮询');
          ElMessage.success('飞书授权成功！');
          stopPollingAuthStatus();
        } else if (pollCount >= maxPolls) {
          console.log('达到最大轮询次数，停止轮询');
          stopPollingAuthStatus();
        }
      } catch (error) {
        console.error('轮询检查授权状态出错:', error);
        if (pollCount >= maxPolls) {
          stopPollingAuthStatus();
        }
      }
    }, pollInterval);
  } catch (error) {
    console.error('设置轮询定时器失败:', error);
    // 出错时确保不会有残留的定时器
    if (pollingTimerId.value) {
      clearInterval(pollingTimerId.value);
      pollingTimerId.value = null;
    }
  }
};

// 停止轮询
const stopPollingAuthStatus = () => {
  try {
    if (pollingTimerId.value) {
      clearInterval(pollingTimerId.value);
      pollingTimerId.value = null;
      console.log('已停止轮询检查授权状态');
    }
  } catch (error) {
    console.error('停止轮询出错:', error);
    // 确保重置定时器ID
    pollingTimerId.value = null;
  }
};

// 开始飞书授权流程
const startAuth = async () => {
  try {
    authorizing.value = true;
    console.log('开始获取飞书授权URL...');
    
    // 获取授权URL
    const data = await getFeishuAuthUrl();
    console.log('FeishuAuth组件获取到的授权数据:', data);
    
    // 检查数据完整性
    if (!data || !data.auth_url || !data.state) {
      console.error('获取到的授权数据不完整:', data);
      throw new Error('获取授权URL失败: 数据不完整');
    }
    
    // 将state保存到localStorage，回调时用于验证
    localStorage.setItem('feishu_auth_state', data.state);
    console.log('已保存state到localStorage:', data.state);
    
    // 使用新窗口打开飞书授权页面
    console.log('准备在新窗口打开授权页面:', data.auth_url);
    window.open(data.auth_url, '_blank', 'noopener,noreferrer');
    
    // 显示提示信息
    ElMessage.success('飞书授权页面已在新窗口打开，请在完成授权后返回本页面');
    
    // 开始轮询检查授权状态
    authorizing.value = false;
    startPollingAuthStatus();
  } catch (error) {
    console.error('获取飞书授权URL失败:', error);
    ElMessage.error(`获取授权URL失败: ${error.message || '未知错误'}`);
    authorizing.value = false;
  }
};

// 刷新飞书授权
const refreshAuth = async () => {
  try {
    refreshing.value = true;
    await refreshFeishuAuth();
    ElMessage.success('飞书授权已刷新');
    await checkAuthStatus();
    emit('auth-success', { refreshed: true });
  } catch (error) {
    console.error('刷新飞书授权失败:', error);
    ElMessage.error(`刷新授权失败: ${error.message}`);
    emit('auth-error', { error: error.message });
  } finally {
    refreshing.value = false;
  }
};

// 确认解除授权
const confirmRevoke = () => {
  ElMessageBox.confirm(
    '确定要解除飞书授权吗？解除后将无法访问您的飞书多维表格。',
    '解除授权',
    {
      confirmButtonText: '确定解除',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
    .then(() => {
      revokeAuth();
    })
    .catch(() => {
      // 取消操作
    });
};

// 解除飞书授权
const revokeAuth = async () => {
  try {
    loading.value = true;
    await revokeFeishuAuth();
    ElMessage.success('已成功解除飞书授权');
    isAuthorized.value = false;
    userInfo.value = null;
    expireTime.value = null;
    emit('auth-revoked');
  } catch (error) {
    console.error('解除飞书授权失败:', error);
    ElMessage.error(`解除授权失败: ${error.message}`);
  } finally {
    loading.value = false;
  }
};

// 处理授权回调
const handleAuthCallback = () => {
  // 获取URL中的参数
  const urlParams = new URLSearchParams(window.location.search);
  const status = urlParams.get('status');
  const errorCode = urlParams.get('error_code');
  const errorMessage = urlParams.get('error_message');
  
  // 清理URL参数
  const cleanUrl = window.location.href.split('?')[0];
  window.history.replaceState({}, document.title, cleanUrl);
  
  // 获取之前保存的state
  const savedState = localStorage.getItem('feishu_auth_state');
  localStorage.removeItem('feishu_auth_state');
  
  // 检查回调状态
  if (status === 'success') {
    // 授权成功
    ElMessage.success('飞书授权成功');
    checkAuthStatus();
    emit('auth-success');
    return true;
  } else if (status === 'error') {
    // 授权失败
    ElMessage.error(`飞书授权失败: ${errorMessage || '未知错误'} (${errorCode || 'unknown'})`);
    emit('auth-error', { errorCode, errorMessage });
    return false;
  } else {
    // 非授权回调，直接返回
    return false;
  }
};

// 检查是否为授权回调页面
const checkIfAuthCallback = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.has('status');
};

// 组件卸载前清除轮询定时器
onBeforeUnmount(() => {
  stopPollingAuthStatus();
});

// 组件挂载后自动检查授权状态
onMounted(async () => {
  try {
    // 检查是否是授权回调
    if (checkIfAuthCallback()) {
      isCallbackProcessing.value = true;
      handleAuthCallback();
      isCallbackProcessing.value = false;
    }
    
    // 如果设置了自动检查，则检查授权状态
    if (props.autoCheck) {
      await checkAuthStatus();
    }
  } catch (error) {
    console.error('组件挂载时出错:', error);
  }
});

// 暴露方法给父组件使用
defineExpose({
  checkAuthStatus,
  startAuth,
  refreshAuth,
  revokeAuth
});
</script>

<style scoped>
.feishu-auth-container {
  padding: 15px;
  border-radius: 8px;
  background-color: #f9f9f9;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.auth-status-header {
  text-align: center;
  margin-bottom: 20px;
}

.auth-status-header h3 {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.user-info {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
}

.user-name {
  margin-left: 10px;
  font-size: 16px;
  font-weight: 500;
}

.expire-info {
  margin-bottom: 15px;
  color: #606266;
  font-size: 14px;
}

.expire-soon {
  color: #e6a23c;
  margin-left: 5px;
  font-weight: bold;
}

.auth-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.callback-processing {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}
</style> 