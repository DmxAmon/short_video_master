<!--
 * @Version    : v1.00
 * @Author     : AI Codex
 * @Date       : 2024-11-15
 * @desc       : 应用头部组件
-->
<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { logout } from '../../api/auth';

const { t } = useI18n();

const props = defineProps({
  // 用户信息
  user: {
    type: Object,
    default: () => ({})
  },
  // 标题
  title: {
    type: String,
    default: '飞书抖音插件'
  },
  // 是否显示退出按钮
  showLogout: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['logout']);

// 用户名称
const userName = computed(() => {
  return props.user?.info?.name || t('common.user');
});

// 用户积分
const userPoints = computed(() => {
  return props.user?.points || 0;
});

// 处理退出登录
const handleLogout = async () => {
  try {
    await logout();
    emit('logout');
  } catch (error) {
    console.error('登出失败:', error);
  }
};
</script>

<template>
  <header class="app-header">
    <div class="logo">{{ title }}</div>
    <div class="user-info">
      <span class="user-name">{{ userName }}</span>
      <span class="points">{{ t('common.points') }}: {{ userPoints }}</span>
      <el-button v-if="showLogout" size="small" @click="handleLogout">{{ t('common.logout') }}</el-button>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  height: 60px;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fff;
  border-bottom: 1px solid #ebeef5;
}

.logo {
  font-size: 18px;
  font-weight: bold;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.user-name {
  font-weight: 500;
}

.points {
  color: #ff9900;
  font-weight: bold;
}
</style> 