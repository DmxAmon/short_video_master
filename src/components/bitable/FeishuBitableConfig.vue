<template>
  <div class="feishu-bitable-config">
    <div class="config-header">
      <h3>飞书多维表格配置</h3>
    </div>
    
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="3" animated />
    </div>
    
    <div v-else-if="!isAuthorized" class="unauthorized-container">
      <el-alert
        type="warning"
        title="您尚未授权飞书多维表格"
        description="请先完成飞书授权，以便将数据导出到您的多维表格"
        :closable="false"
        show-icon
      />
      <div class="action-button">
        <el-button type="primary" @click="goToConfig">前往授权管理</el-button>
      </div>
    </div>
    
    <div v-else-if="!hasDefaultToken" class="no-token-container">
      <el-alert
        type="warning"
        title="未设置默认多维表格"
        description="您已完成飞书授权，但还未设置默认多维表格"
        :closable="false"
        show-icon
      />
      <div class="action-button">
        <el-button type="primary" @click="goToConfig">设置默认多维表格</el-button>
      </div>
    </div>
    
    <div v-else class="token-configured">
      <el-result
        icon="success"
        title="多维表格配置完成"
        :sub-title="`默认多维表格: ${defaultToken.app_name}`"
        class="token-result"
      >
        <template #extra>
          <el-button type="primary" @click="goToConfig">修改配置</el-button>
        </template>
      </el-result>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { checkFeishuAuthStatus, getDefaultBitableAppToken } from '../../api/bitable';

const router = useRouter();

// 状态变量
const loading = ref(true);
const isAuthorized = ref(false);
const hasDefaultToken = ref(false);
const defaultToken = ref(null);

// 检查飞书授权状态
const checkAuthStatus = async () => {
  try {
    loading.value = true;
    const response = await checkFeishuAuthStatus();
    isAuthorized.value = response.is_authorized;
    
    // 如果已授权，检查是否有默认表格
    if (isAuthorized.value) {
      await checkDefaultToken();
    }
  } catch (error) {
    console.error('检查飞书授权状态失败:', error);
    isAuthorized.value = false;
  } finally {
    loading.value = false;
  }
};

// 检查是否有默认多维表格
const checkDefaultToken = async () => {
  try {
    const token = await getDefaultBitableAppToken();
    hasDefaultToken.value = !!token;
    defaultToken.value = token;
  } catch (error) {
    console.error('获取默认多维表格Token失败:', error);
    hasDefaultToken.value = false;
    defaultToken.value = null;
  }
};

// 前往配置页面
const goToConfig = () => {
  router.push('/bitable');
};

// 组件挂载时检查状态
onMounted(async () => {
  await checkAuthStatus();
});

// 暴露方法给父组件
defineExpose({
  checkAuthStatus,
  isAuthorized,
  hasDefaultToken,
  defaultToken
});
</script>

<style scoped>
.feishu-bitable-config {
  padding: 15px;
  border-radius: 8px;
  background-color: #f9f9f9;
  box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.05);
  margin-bottom: 20px;
}

.config-header {
  text-align: center;
  margin-bottom: 15px;
}

.config-header h3 {
  margin: 0;
  color: #333;
  font-size: 16px;
}

.loading-container {
  padding: 10px 0;
}

.action-button {
  margin-top: 15px;
  display: flex;
  justify-content: center;
}

.token-result {
  padding: 0;
}
</style> 