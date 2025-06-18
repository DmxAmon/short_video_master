<template>
  <div class="home-container">
    <!-- 抖音视频采集 -->
    <DouyinView :user="user" />
  </div>
</template>

<script setup>
import { reactive, computed, onMounted } from 'vue';
import DouyinView from './DouyinView.vue';
import { envConfig } from '../config/env';

// 用户信息 (通过props获取)
const props = defineProps({
  user: {
    type: Object,
    required: true
  }
});

// 组件挂载后自动尝试认证
onMounted(() => {
  console.log('Home组件挂载完成，环境配置:', envConfig);
});
</script>

<style scoped>
.home-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
}
</style> 