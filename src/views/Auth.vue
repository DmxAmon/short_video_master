<!--
 * @Version    : v1.00
 * @Author     : Amon
 * @Date       : 2024-05-01
 * @LastAuthor : Claude AI
 * @LastTime   : 2023-05-01
 * @desc       : 用户认证组件
-->
<script setup>
import { ref, onMounted, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import { initializeAuth, logout as authLogout } from '../services/auth';

const props = defineProps({
  onAuthSuccess: Function, // 认证成功回调
  onAuthFailed: Function   // 认证失败回调
});

const isLoading = ref(false);
const authError = ref('');
const user = reactive({
  info: null,
  points: 0
});

// 初始化认证
const initAuth = async () => {
  // 检查是否已有认证令牌，如果有则不再触发认证流程
  const token = localStorage.getItem('access_token');
  const userInfoStr = localStorage.getItem('user_info');
  
  if (token && userInfoStr && userInfoStr !== "undefined" && userInfoStr !== "null") {
    console.log('已有认证令牌和用户信息，跳过认证流程');
    try {
      // 直接使用缓存的用户信息
      const userInfo = JSON.parse(userInfoStr);
      user.info = userInfo;
      user.points = userInfo.points || 0;
      
      // 调用成功回调
      props.onAuthSuccess && props.onAuthSuccess({
        user: user.info,
        points: user.points,
        permissions: userInfo.permissions || []
      });
      return;
    } catch (e) {
      console.error('解析缓存用户信息失败:', e);
      // 解析失败则继续走认证流程
      // 清除可能损坏的存储数据
      localStorage.removeItem('user_info');
    }
  }
  
  console.log('初始化认证流程');
  
  try {
    isLoading.value = true;
    
    // 调用真实的飞书认证
    const success = await initializeAuth();
    
    if (success) {
      // 获取localStorage中存储的用户信息
      const userInfoStr = localStorage.getItem('user_info');
      if (userInfoStr && userInfoStr !== "undefined" && userInfoStr !== "null") {
        try {
          const userInfo = JSON.parse(userInfoStr);
          user.info = userInfo;
          user.points = userInfo.points || 0;
          
          // 调用成功回调
          props.onAuthSuccess && props.onAuthSuccess({
            user: user.info,
            points: user.points,
            permissions: userInfo.permissions || []
          });
        } catch (e) {
          console.error('认证后解析用户信息失败:', e);
          throw new Error('获取用户信息失败');
        }
      } else {
        throw new Error('认证成功但未获取到用户信息');
      }
    } else {
      throw new Error('认证失败');
    }
  } catch (error) {
    console.error('认证失败:', error);
    authError.value = error.message || '认证失败，请重试';
    props.onAuthFailed && props.onAuthFailed(error);
  } finally {
    isLoading.value = false;
  }
};

// 执行认证
const performAuth = () => {
  authError.value = '';
  initAuth();
};

// 重试认证
const retryAuthentication = () => {
  authError.value = '';
  initAuth();
};

// 登出
const logout = async () => {
  try {
    isLoading.value = true;
    
    // 调用真实的登出函数
    authLogout();
    
    user.info = null;
    user.points = 0;
    authError.value = '';
    
    ElMessage.success('已登出');
  } catch (error) {
    console.error('登出失败:', error);
    ElMessage.error('登出失败: ' + (error.message || '未知错误'));
  } finally {
    isLoading.value = false;
  }
};

// 组件挂载时进行认证
onMounted(() => {
  initAuth();
});

// 对外暴露方法
defineExpose({
  performAuth,
  retryAuthentication,
  logout,
  authError
});
</script>

<template>
  <div class="auth-container">
    <!-- 身份验证错误提示 -->
    <div v-if="authError" class="auth-error">
      {{ authError }}
      <el-button type="primary" size="small" @click="retryAuthentication">
        重试
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.auth-container {
  width: 100%;
  max-width: 100%;
}

.auth-error {
  text-align: center;
  padding: 20px;
  color: #f56c6c;
  background-color: #fef0f0;
  border-radius: 4px;
  margin: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
}
</style> 