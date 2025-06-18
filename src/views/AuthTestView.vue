<!--
 * @Version    : v1.00
 * @Author     : AI Codex
 * @Date       : 2024-05-10
 * @desc       : 登录鉴权测试视图组件
-->
<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElCard, ElButton, ElDivider, ElTag } from 'element-plus';
import { authenticate, isAuthenticated, getCurrentUser, callApi } from '../services/auth';
import { envConfig } from '../config/env';

// 状态
const loading = ref(false);
const userInfo = ref(null);
const tokenInfo = ref(null);
const apiResponse = ref(null);
const testStatus = reactive({
  auth: false,
  token: false,
  api: false
});

// 获取当前认证状态
const checkAuthStatus = () => {
  const isAuth = isAuthenticated();
  testStatus.auth = isAuth;
  
  if (isAuth) {
    userInfo.value = getCurrentUser();
    
    // 获取令牌信息
    const token = localStorage.getItem('auth_token');
    if (token) {
      tokenInfo.value = {
        token: token.substring(0, 20) + '...',
        fullLength: token.length,
        type: 'JWT令牌'
      };
      testStatus.token = true;
    } else {
      tokenInfo.value = null;
      testStatus.token = false;
    }
  } else {
    userInfo.value = null;
    tokenInfo.value = null;
    testStatus.token = false;
  }
};

// 执行登录
const performLogin = async () => {
  try {
    loading.value = true;
    const result = await authenticate();
    ElMessage.success('登录成功');
    checkAuthStatus();
  } catch (error) {
    ElMessage.error(`登录失败: ${error.message}`);
  } finally {
    loading.value = false;
  }
};

// 登出
const logout = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_info');
  ElMessage.success('已登出');
  checkAuthStatus();
  apiResponse.value = null;
  testStatus.api = false;
};

// 测试API调用
const testApiCall = async () => {
  try {
    loading.value = true;
    const response = await callApi('/auth/user');
    apiResponse.value = response;
    testStatus.api = true;
    ElMessage.success('API调用成功');
  } catch (error) {
    apiResponse.value = { error: error.message };
    testStatus.api = false;
    ElMessage.error(`API调用失败: ${error.message}`);
  } finally {
    loading.value = false;
  }
};

// 组件挂载时检查认证状态
onMounted(() => {
  checkAuthStatus();
});
</script>

<template>
  <div class="auth-test-container">
    <h2>登录鉴权功能测试</h2>
    
    <el-divider>认证状态</el-divider>
    
    <el-card class="status-card">
      <div class="status-item">
        <span class="label">认证状态:</span>
        <el-tag :type="testStatus.auth ? 'success' : 'danger'">
          {{ testStatus.auth ? '已认证' : '未认证' }}
        </el-tag>
      </div>
      
      <div v-if="testStatus.auth" class="status-item">
        <span class="label">令牌状态:</span>
        <el-tag :type="testStatus.token ? 'success' : 'warning'">
          {{ testStatus.token ? '有效' : '无效' }}
        </el-tag>
      </div>
      
      <div v-if="testStatus.auth" class="status-item">
        <span class="label">API调用:</span>
        <el-tag :type="testStatus.api ? 'success' : 'info'">
          {{ testStatus.api ? '成功' : '未测试' }}
        </el-tag>
      </div>
    </el-card>
    
    <el-divider>用户信息</el-divider>
    
    <el-card v-if="userInfo" class="info-card">
      <div class="user-info">
        <div><strong>用户ID:</strong> {{ userInfo.id }}</div>
        <div><strong>用户名:</strong> {{ userInfo.username || userInfo.name }}</div>
        <div><strong>邮箱:</strong> {{ userInfo.email }}</div>
        <div><strong>角色:</strong> {{ userInfo.role }}</div>
        <div><strong>会员等级:</strong> {{ userInfo.memberLevel }}</div>
        <div><strong>积分:</strong> {{ userInfo.points }}</div>
        <div>
          <strong>权限:</strong>
          <div class="permissions-list">
            <el-tag 
              v-for="(perm, index) in userInfo.permissions" 
              :key="index"
              size="small"
              class="permission-tag"
            >
              {{ perm }}
            </el-tag>
          </div>
        </div>
      </div>
    </el-card>
    
    <el-card v-else class="info-card">
      <div class="empty-info">未登录或无法获取用户信息</div>
    </el-card>
    
    <el-divider>令牌信息</el-divider>
    
    <el-card v-if="tokenInfo" class="info-card">
      <div class="token-info">
        <div><strong>令牌类型:</strong> {{ tokenInfo.type }}</div>
        <div><strong>令牌预览:</strong> {{ tokenInfo.token }}</div>
        <div><strong>令牌长度:</strong> {{ tokenInfo.fullLength }} 字符</div>
      </div>
    </el-card>
    
    <el-card v-else class="info-card">
      <div class="empty-info">无令牌信息</div>
    </el-card>
    
    <el-divider>操作</el-divider>
    
    <div class="actions">
      <el-button 
        type="primary" 
        @click="performLogin" 
        :loading="loading"
        :disabled="testStatus.auth"
      >
        登录
      </el-button>
      
      <el-button 
        type="danger" 
        @click="logout" 
        :disabled="!testStatus.auth"
      >
        登出
      </el-button>
      
      <el-button 
        type="success" 
        @click="testApiCall" 
        :loading="loading"
        :disabled="!testStatus.auth"
      >
        测试API调用
      </el-button>
    </div>
    
    <el-divider>API响应</el-divider>
    
    <el-card v-if="apiResponse" class="response-card">
      <pre class="api-response">{{ JSON.stringify(apiResponse, null, 2) }}</pre>
    </el-card>
    
    <el-card v-else class="response-card">
      <div class="empty-info">未进行API调用</div>
    </el-card>
  </div>
</template>

<style scoped>
.auth-test-container {
  padding: 16px;
  max-width: 100%;
}

h2 {
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 20px;
  text-align: center;
}

.status-card,
.info-card,
.response-card {
  margin-bottom: 16px;
}

.status-item {
  margin-bottom: 8px;
  display: flex;
  align-items: center;
}

.status-item .label {
  margin-right: 8px;
  min-width: 80px;
}

.user-info,
.token-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.permissions-list {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.permission-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.empty-info {
  color: #909399;
  text-align: center;
  padding: 16px;
}

.actions,
.mock-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.api-response {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: monospace;
  font-size: 14px;
  line-height: 1.5;
  overflow-x: auto;
  background-color: #f8f8f8;
  padding: 12px;
  border-radius: 4px;
}
</style> 