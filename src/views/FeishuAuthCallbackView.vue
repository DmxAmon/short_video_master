<template>
  <div class="auth-callback-container">
    <div v-if="processing" class="loading-container">
      <el-result icon="loading" title="处理中">
        <template #sub-title>
          <span>正在处理飞书授权回调，请稍候...</span>
        </template>
      </el-result>
    </div>
    
    <div v-else-if="success" class="success-container">
      <el-result
        icon="success"
        title="授权成功"
        sub-title="已成功授权系统访问您的飞书多维表格"
      >
        <template #extra>
          <el-button type="primary" @click="goToApp">返回应用</el-button>
        </template>
      </el-result>
    </div>
    
    <div v-else class="error-container">
      <el-result
        icon="error"
        title="授权失败"
        :sub-title="errorMessage"
      >
        <template #extra>
          <el-button type="primary" @click="retry">重试</el-button>
          <el-button @click="goToApp">返回应用</el-button>
        </template>
      </el-result>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

const router = useRouter();

// 状态管理
const processing = ref(true);
const success = ref(false);
const errorMessage = ref('授权过程中发生错误');
const errorCode = ref('');

// 处理授权回调逻辑
const handleCallback = () => {
  // 获取URL中的参数
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const state = urlParams.get('state');
  const error = urlParams.get('error');
  
  // 获取之前保存的state
  const savedState = localStorage.getItem('feishu_auth_state');
  
  // 处理完成后清理state
  localStorage.removeItem('feishu_auth_state');
  
  // 如果有错误参数，表示授权失败
  if (error) {
    processing.value = false;
    success.value = false;
    errorMessage.value = `授权失败: ${error}`;
    errorCode.value = error;
    return;
  }
  
  // 如果没有code，表示授权流程被中断
  if (!code) {
    processing.value = false;
    success.value = false;
    errorMessage.value = '未收到授权码，授权流程可能被中断';
    return;
  }
  
  // 验证state参数，防止CSRF攻击
  if (state !== savedState) {
    processing.value = false;
    success.value = false;
    errorMessage.value = '安全验证失败，请重新授权';
    return;
  }
  
  // 模拟向后端发送授权码的过程
  // 在实际环境中，这里应该调用后端API处理授权码
  setTimeout(() => {
    processing.value = false;
    success.value = true;
    
    // 将授权结果保存到本地存储，供其他页面使用
    localStorage.setItem('feishu_auth_callback_success', 'true');
    localStorage.setItem('feishu_auth_callback_time', Date.now().toString());
  }, 1500);
};

// 重试授权
const retry = () => {
  router.push('/bitable');
};

// 返回应用
const goToApp = () => {
  router.push('/');
};

// 组件挂载时处理回调
onMounted(() => {
  handleCallback();
});
</script>

<style scoped>
.auth-callback-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  padding: 20px;
}

.loading-container, .success-container, .error-container {
  width: 100%;
  max-width: 600px;
}
</style> 