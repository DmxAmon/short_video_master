<template>
  <div class="bitable-manager">
    <el-tabs v-model="activeTab" class="tabs-container">
      <el-tab-pane label="飞书授权" name="auth">
        <feishu-auth @auth-status-changed="handleAuthStatusChange" ref="feishuAuthRef"/>
      </el-tab-pane>
      
      <el-tab-pane label="Token管理" name="tokens" :disabled="!isAuthorized">
        <bitable-token-manager v-if="isAuthorized" ref="tokenManagerRef"/>
        
        <div v-else class="unauthorized-message">
          <el-empty description="请先完成飞书授权">
            <template #description>
              <p>请先在"飞书授权"标签页中完成授权，才能管理多维表格Token</p>
            </template>
            <el-button type="primary" @click="activeTab = 'auth'">前往授权</el-button>
          </el-empty>
        </div>
      </el-tab-pane>
    </el-tabs>
    
    <div class="helpful-info">
      <el-collapse>
        <el-collapse-item title="如何使用飞书多维表格功能？" name="1">
          <div class="help-content">
            <p><strong>步骤 1:</strong> 在"飞书授权"标签页中完成授权，允许我们访问您的飞书多维表格</p>
            <p><strong>步骤 2:</strong> 在"Token管理"标签页中，获取或添加您要操作的多维表格Token</p>
            <p><strong>步骤 3:</strong> 设置一个默认的多维表格，系统将自动将数据同步到此表格</p>
          </div>
          <div class="tip-box">
            <p><strong>提示：</strong> 请在飞书多维表格中打开本应用，可以自动获取当前表格的Token</p>
          </div>
        </el-collapse-item>
        
        <el-collapse-item title="什么是多维表格Token？" name="2">
          <div class="help-content">
            <p>多维表格Token是飞书多维表格的唯一标识符，格式通常为"bascnXXXXXXXX"</p>
            <p>系统需要这个Token来识别要将数据同步到哪个多维表格</p>
          </div>
        </el-collapse-item>
        
        <el-collapse-item title="遇到问题怎么办？" name="3">
          <div class="help-content">
            <p>如果授权过程中遇到问题：</p>
            <ul>
              <li>请确保您已登录飞书并有相应的访问权限</li>
              <li>尝试刷新页面或重新授权</li>
              <li>如果问题持续存在，请联系客服支持</li>
            </ul>
          </div>
        </el-collapse-item>
      </el-collapse>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import FeishuAuth from './FeishuAuth.vue';
import BitableTokenManager from './BitableTokenManager.vue';

// 标签页控制
const activeTab = ref('auth');
const isAuthorized = ref(false);

// 组件引用
const feishuAuthRef = ref(null);
const tokenManagerRef = ref(null);

// 处理授权状态变化
const handleAuthStatusChange = (status) => {
  isAuthorized.value = status.isAuthorized;
  
  // 如果授权成功且正在Token管理标签页，刷新Token列表
  if (status.isAuthorized && activeTab.value === 'tokens' && tokenManagerRef.value) {
    tokenManagerRef.value.refreshTokenList();
  }
};

// 暴露方法给父组件
defineExpose({
  refreshAuthStatus: () => {
    if (feishuAuthRef.value) {
      return feishuAuthRef.value.checkAuthStatus();
    }
  },
  refreshTokenList: () => {
    if (tokenManagerRef.value) {
      return tokenManagerRef.value.refreshTokenList();
    }
  }
});
</script>

<style scoped>
.bitable-manager {
  padding: 15px;
}

.tabs-container {
  margin-bottom: 20px;
}

.unauthorized-message {
  padding: 30px 0;
  text-align: center;
}

.helpful-info {
  margin-top: 30px;
}

.help-content {
  padding: 0 15px;
  font-size: 14px;
  line-height: 1.6;
}

.help-content ul {
  padding-left: 20px;
}

.tip-box {
  margin-top: 15px;
  padding: 10px 15px;
  background-color: #f0f9eb;
  border-radius: 4px;
  border-left: 3px solid #67c23a;
}

.tip-box p {
  margin: 0;
  color: #67c23a;
}
</style> 