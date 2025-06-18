<template>
  <div class="sdk-test">
    <h3>飞书SDK测试</h3>
    <div class="test-results">
      <div class="test-item">
        <span class="label">SDK导入状态:</span>
        <span :class="sdkStatus.class">{{ sdkStatus.text }}</span>
      </div>
      <div class="test-item">
        <span class="label">用户ID:</span>
        <span>{{ userId || '未获取' }}</span>
      </div>
      <div class="test-item">
        <span class="label">环境信息:</span>
        <span>{{ envInfo || '未获取' }}</span>
      </div>
      <div class="test-item">
        <span class="label">语言设置:</span>
        <span>{{ locale || '未获取' }}</span>
      </div>
    </div>
    <div class="actions">
      <button @click="testSDK" :disabled="testing">
        {{ testing ? '测试中...' : '测试SDK' }}
      </button>
      <button @click="getUserId" :disabled="testing">
        {{ testing ? '获取中...' : '获取用户ID' }}
      </button>
    </div>
    <div class="logs">
      <h4>测试日志:</h4>
      <div class="log-content">
        <div v-for="(log, index) in logs" :key="index" :class="log.type">
          {{ log.message }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
// 导入飞书SDK
import { bitable } from '@lark-base-open/js-sdk'

const testing = ref(false)
const userId = ref('')
const envInfo = ref('')
const locale = ref('')
const logs = ref([])

const sdkStatus = ref({
  text: '检测中...',
  class: 'status-checking'
})

// 检测SDK状态
const checkSDKStatus = () => {
  if (bitable && bitable.bridge) {
    sdkStatus.value = {
      text: '已导入并初始化',
      class: 'status-success'
    }
  } else if (bitable) {
    sdkStatus.value = {
      text: '已导入但未初始化',
      class: 'status-warning'
    }
  } else {
    sdkStatus.value = {
      text: '未导入',
      class: 'status-error'
    }
  }
}

// 测试SDK功能
const testSDK = async () => {
  testing.value = true
  logs.value = []
  try {
    console.log('开始测试SDK功能...')
    
    // 测试获取环境信息
    if (bitable && bitable.bridge && bitable.bridge.getEnv) {
      const env = await bitable.bridge.getEnv()
      envInfo.value = JSON.stringify(env)
      console.log('环境信息:', env)
      logs.value.push({
        message: '✅ 获取环境信息成功',
        type: 'success'
      })
    }
    
    // 测试获取语言设置
    if (bitable && bitable.bridge && bitable.bridge.getLocale) {
      const loc = await bitable.bridge.getLocale()
      locale.value = loc
      console.log('语言设置:', loc)
      logs.value.push({
        message: '✅ 获取语言设置成功',
        type: 'success'
      })
    }
    
    // 测试获取用户ID
    if (bitable && bitable.bridge && bitable.bridge.getBaseUserId) {
      const id = await bitable.bridge.getBaseUserId()
      userId.value = id
      console.log('用户ID:', id)
      logs.value.push({
        message: '✅ 获取用户ID成功',
        type: 'success'
      })
    } else {
      throw new Error('getBaseUserId方法不可用')
    }
    
    console.log('SDK功能测试完成')
  } catch (error) {
    console.error('SDK测试失败:', error)
    envInfo.value = '获取失败: ' + error.message
    logs.value.push({
      message: '❌ 测试失败',
      type: 'error'
    })
  } finally {
    testing.value = false
  }
}

// 获取用户ID
const getUserId = async () => {
  testing.value = true
  try {
    console.log('开始获取用户ID...')
    
    if (bitable && bitable.bridge && bitable.bridge.getBaseUserId) {
      const id = await bitable.bridge.getBaseUserId()
      userId.value = id
      console.log('用户ID:', id)
    } else {
      throw new Error('getBaseUserId方法不可用')
    }
  } catch (error) {
    console.error('获取用户ID失败:', error)
    userId.value = '获取失败: ' + error.message
    logs.value.push({
      message: '❌ 获取用户ID失败',
      type: 'error'
    })
  } finally {
    testing.value = false
  }
}

onMounted(() => {
  checkSDKStatus()
  // 延迟检测，给SDK一些初始化时间
  setTimeout(checkSDKStatus, 1000)
})
</script>

<style scoped>
.sdk-test {
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin: 20px 0;
  background: #f9f9f9;
}

.test-results {
  margin: 15px 0;
}

.test-item {
  margin: 8px 0;
  display: flex;
  align-items: center;
}

.label {
  font-weight: bold;
  margin-right: 10px;
  min-width: 100px;
}

.status-success {
  color: #67c23a;
}

.status-warning {
  color: #e6a23c;
}

.status-error {
  color: #f56c6c;
}

.status-checking {
  color: #409eff;
}

.actions {
  margin-top: 15px;
}

.actions button {
  margin-right: 10px;
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
}

.actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.actions button:hover:not(:disabled) {
  background: #f0f0f0;
}

.logs {
  margin-top: 20px;
}

.log-content {
  max-height: 300px;
  overflow-y: auto;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #f5f5f5;
  font-family: monospace;
  font-size: 12px;
}

.log-content .info {
  color: #333;
}

.log-content .success {
  color: #67c23a;
}

.log-content .error {
  color: #f56c6c;
}
</style> 