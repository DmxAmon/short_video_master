<!--
 * @Version    : v1.00
 * @Author     : AI Codex
 * @Date       : 2024-11-15
 * @desc       : API调试面板
-->
<script setup>
import { ref, reactive, computed } from 'vue';
import { ElMessage } from 'element-plus';
import axios from 'axios';
import { envConfig } from '../../config/env';

const apiEndpoint = ref('');
const method = ref('GET');
const requestBody = ref('{}');
const headers = ref('{}');
const response = ref(null);
const loading = ref(false);
const error = ref(null);

// 是否显示
const isVisible = ref(false);

// 显示/隐藏面板
const togglePanel = () => {
  isVisible.value = !isVisible.value;
};

// 使用当前令牌
const useAuthToken = ref(true);

// API方法选项
const methodOptions = [
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' },
  { label: 'PUT', value: 'PUT' },
  { label: 'DELETE', value: 'DELETE' }
];

// 预设API端点
const apiPresets = [
  { label: '获取用户信息', value: '/api/auth/user', method: 'GET' },
  { label: '获取积分余额', value: '/api/user/points', method: 'GET' },
  { label: '提交抖音视频', value: '/api/douyin/collect/video', method: 'POST', body: JSON.stringify({ url: 'https://www.douyin.com/video/123456' }, null, 2) },
  { label: '提交转写任务', value: '/api/transcript/submit', method: 'POST', body: JSON.stringify({ url: 'https://www.douyin.com/video/123456' }, null, 2) }
];

// 发送请求
const sendRequest = async () => {
  loading.value = true;
  error.value = null;
  response.value = null;
  
  // 记录完整URL
  const fullUrl = (apiEndpoint.value.startsWith('http') ? 
    apiEndpoint.value : 
    `${envConfig.backendUrl}${apiEndpoint.value.startsWith('/') ? '' : '/'}${apiEndpoint.value}`);
  
  console.log(`发送API请求到: ${fullUrl}`);
  
  try {
    // 准备请求配置
    let requestConfig = {
      method: method.value,
      url: fullUrl, // 使用完整URL
      headers: {},
      timeout: 10000, // 10秒超时
      withCredentials: true // 携带cookie
    };
    
    // 添加请求头
    try {
      const parsedHeaders = JSON.parse(headers.value);
      requestConfig.headers = parsedHeaders;
    } catch (e) {
      ElMessage.warning('请求头格式错误，将使用默认头');
    }
    
    // 添加授权头
    if (useAuthToken.value) {
      const token = localStorage.getItem('access_token');
      if (token) {
        requestConfig.headers['Authorization'] = `Bearer ${token}`;
      } else {
        ElMessage.warning('未找到授权令牌，请先登录');
      }
    }
    
    // 添加请求体（对于非GET请求）
    if (method.value !== 'GET') {
      try {
        requestConfig.data = JSON.parse(requestBody.value);
      } catch (e) {
        ElMessage.warning('请求体格式错误，将作为纯文本发送');
        requestConfig.data = requestBody.value;
      }
    }
    
    console.log('发送API请求:', requestConfig);
    
    // 发送请求
    const res = await axios(requestConfig);
    
    // 保存响应
    response.value = {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
      data: res.data
    };
    
    ElMessage.success(`请求成功 (${res.status})`);
  } catch (err) {
    console.error('API请求失败:', err);
    error.value = {
      message: err.message,
      response: err.response ? {
        status: err.response.status,
        statusText: err.response.statusText,
        data: err.response.data
      } : null
    };
    
    ElMessage.error(`请求失败: ${err.message}`);
  } finally {
    loading.value = false;
  }
};

// 选择预设API
const selectPreset = (preset) => {
  apiEndpoint.value = preset.value;
  method.value = preset.method;
  if (preset.body) {
    requestBody.value = preset.body;
  }
};

// 格式化JSON显示
const formatJSON = (json) => {
  try {
    return JSON.stringify(json, null, 2);
  } catch (e) {
    return json;
  }
};

// 清空响应
const clearResponse = () => {
  response.value = null;
  error.value = null;
};
</script>

<template>
  <div class="api-debug">
    <el-button 
      class="toggle-button" 
      type="primary" 
      size="small"
      @click="togglePanel"
    >
      API调试 {{ isVisible ? '▼' : '▲' }}
    </el-button>
    
    <el-drawer
      v-model="isVisible"
      title="API 调试面板"
      direction="btt"
      size="75%"
    >
      <div class="panel-content">
        <el-row :gutter="20">
          <!-- 请求配置区域 -->
          <el-col :span="12">
            <div class="api-config">
              <h3>请求配置</h3>
              
              <el-form label-position="top">
                <!-- API预设 -->
                <el-form-item label="预设API">
                  <el-select 
                    placeholder="选择预设API"
                    @change="selectPreset"
                    style="width: 100%"
                  >
                    <el-option
                      v-for="preset in apiPresets"
                      :key="preset.value"
                      :label="preset.label"
                      :value="preset"
                    />
                  </el-select>
                </el-form-item>
                
                <!-- API端点 -->
                <el-form-item label="API端点">
                  <el-input v-model="apiEndpoint" placeholder="输入API端点，如 /api/user"></el-input>
                </el-form-item>
                
                <!-- 请求方法 -->
                <el-form-item label="请求方法">
                  <el-radio-group v-model="method">
                    <el-radio 
                      v-for="option in methodOptions" 
                      :key="option.value" 
                      :label="option.value"
                    >
                      {{ option.label }}
                    </el-radio>
                  </el-radio-group>
                </el-form-item>
                
                <!-- 授权令牌 -->
                <el-form-item>
                  <el-checkbox v-model="useAuthToken">使用当前授权令牌</el-checkbox>
                </el-form-item>
                
                <!-- 请求头 -->
                <el-form-item label="请求头 (JSON)">
                  <el-input 
                    v-model="headers" 
                    type="textarea" 
                    :rows="3"
                    placeholder='{"Content-Type": "application/json"}'
                  ></el-input>
                </el-form-item>
                
                <!-- 请求体 -->
                <el-form-item label="请求体 (JSON)" v-if="method !== 'GET'">
                  <el-input 
                    v-model="requestBody" 
                    type="textarea" 
                    :rows="5"
                    placeholder='{"key": "value"}'
                  ></el-input>
                </el-form-item>
                
                <!-- 发送按钮 -->
                <el-form-item>
                  <el-button 
                    type="primary" 
                    @click="sendRequest" 
                    :loading="loading"
                    :disabled="!apiEndpoint"
                  >
                    发送请求
                  </el-button>
                  
                  <el-button 
                    @click="clearResponse" 
                    :disabled="!response && !error"
                  >
                    清空响应
                  </el-button>
                </el-form-item>
              </el-form>
            </div>
          </el-col>
          
          <!-- 响应区域 -->
          <el-col :span="12">
            <div class="api-response">
              <h3>响应结果</h3>
              
              <!-- 加载状态 -->
              <div v-if="loading" class="loading-container">
                <el-icon class="is-loading"><Loading /></el-icon>
                <span>正在请求...</span>
              </div>
              
              <!-- 错误信息 -->
              <el-alert
                v-else-if="error"
                type="error"
                :title="error.message || '请求失败'"
                :closable="false"
                show-icon
              >
                <div v-if="error.response" class="error-details">
                  <p>状态码: {{ error.response.status }} {{ error.response.statusText }}</p>
                  <pre>{{ formatJSON(error.response.data) }}</pre>
                </div>
              </el-alert>
              
              <!-- 响应内容 -->
              <div v-else-if="response" class="response-container">
                <div class="response-status">
                  <el-tag 
                    :type="response.status >= 200 && response.status < 300 ? 'success' : 'danger'"
                  >
                    {{ response.status }} {{ response.statusText }}
                  </el-tag>
                </div>
                
                <el-tabs type="border-card">
                  <el-tab-pane label="响应数据">
                    <pre class="response-data">{{ formatJSON(response.data) }}</pre>
                  </el-tab-pane>
                  <el-tab-pane label="响应头">
                    <pre class="response-headers">{{ formatJSON(response.headers) }}</pre>
                  </el-tab-pane>
                </el-tabs>
              </div>
              
              <!-- 无响应提示 -->
              <el-empty v-else description="暂无响应数据"></el-empty>
            </div>
          </el-col>
        </el-row>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
.api-debug {
  position: fixed;
  bottom: 10px;
  right: 10px;
  z-index: 9990;
}

.toggle-button {
  z-index: 9990;
}

.panel-content {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
}

.api-config, .api-response {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 15px;
  background-color: #fff;
  height: 100%;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  gap: 10px;
  color: #909399;
}

.response-container {
  margin-top: 10px;
}

.response-status {
  margin-bottom: 10px;
}

.response-data, .response-headers, .error-details pre {
  white-space: pre-wrap;
  font-family: monospace;
  font-size: 14px;
  background-color: #f5f7fa;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  max-height: 400px;
  overflow-y: auto;
}

.error-details {
  margin-top: 10px;
}
</style> 