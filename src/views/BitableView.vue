<template>
  <div class="bitable-view">
    <div class="page-header">
      <h2>飞书多维表格管理</h2>
      <p class="subtitle">授权管理并获取您的飞书多维表格Token</p>
    </div>
    
    <bitable-manager ref="bitableManagerRef" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import BitableManager from '../components/bitable/BitableManager.vue';

// 组件引用
const bitableManagerRef = ref(null);

// 组件挂载时检查授权回调结果
onMounted(() => {
  // 检查是否有授权回调成功的标记
  const callbackSuccess = localStorage.getItem('feishu_auth_callback_success');
  const callbackTime = localStorage.getItem('feishu_auth_callback_time');
  
  // 如果存在回调成功标记，且时间在30分钟内，刷新授权状态
  if (callbackSuccess === 'true' && callbackTime) {
    const now = Date.now();
    const time = parseInt(callbackTime, 10);
    
    // 30分钟内的回调视为有效
    if (now - time < 30 * 60 * 1000) {
      // 刷新授权状态
      if (bitableManagerRef.value) {
        bitableManagerRef.value.refreshAuthStatus();
      }
      
      // 清除回调标记
      localStorage.removeItem('feishu_auth_callback_success');
      localStorage.removeItem('feishu_auth_callback_time');
    }
  }
});
</script>

<style scoped>
.bitable-view {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: 30px;
}

.page-header h2 {
  margin: 0 0 10px;
  color: #333;
  font-size: 24px;
}

.subtitle {
  margin: 0;
  color: #666;
  font-size: 16px;
}
</style> 