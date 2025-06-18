<!--
 * @Version    : v1.00
 * @Author     : Amon
 * @Date       : 2024-05-06
 * @desc       : 首页
-->
<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';
import MemberInfo from '../components/membership/MemberInfo.vue';
import { usePermissionCheck } from '../utils/permissionUtils';
import PermissionDenied from '../components/membership/PermissionDenied.vue';

const router = useRouter();
const message = ref('欢迎使用飞书抖音插件');

// 创建权限检查钩子
const { checking, permissionState, checkPermission } = usePermissionCheck();

// 测试批量采集功能权限
const testBatchCollectPermission = async () => {
  const hasPermission = await checkPermission('batch_collect', 1, '批量视频采集');
  
  if (hasPermission) {
    ElMessage.success('您有权限使用批量采集功能');
  }
};

// 测试高级Markdown功能权限
const testAdvancedMarkdownPermission = async () => {
  const hasPermission = await checkPermission('markdown:advanced', 1, '高级Markdown');
  
  if (hasPermission) {
    ElMessage.success('您有权限使用高级Markdown功能');
  }
};

// 跳转到会员系统测试页面
const goToMembershipTest = () => {
  router.push('/membership-test');
};

// 跳转到登录鉴权测试页面
const goToAuthTest = () => {
  router.push('/auth-test');
};

onMounted(() => {
  console.log('HomeView mounted');
});
</script>

<template>
  <div class="home-container">
    <h1>{{ message }}</h1>
    
    <!-- 会员信息卡片 -->
    <div class="member-info-section">
      <MemberInfo />
    </div>
    
    <div class="action-buttons">
      <h3>功能测试</h3>
      <div class="button-group">
        <el-button type="primary" @click="testBatchCollectPermission" :loading="checking">
          测试批量采集权限
        </el-button>
        <el-button type="warning" @click="testAdvancedMarkdownPermission" :loading="checking">
          测试高级Markdown权限
        </el-button>
      </div>
      
      <h3>页面导航</h3>
      <div class="button-group">
        <el-button @click="goToMembershipTest">
          会员系统测试
        </el-button>
        <el-button @click="goToAuthTest">
          登录鉴权测试
        </el-button>
      </div>
    </div>
    
    <!-- 权限不足对话框 -->
    <PermissionDenied
      v-model:visible="permissionState.showDialog"
      :permission-data="permissionState.permissionData"
      :feature-name="permissionState.featureName"
    />
  </div>
</template>

<style scoped>
.home-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.member-info-section {
  margin: 20px 0;
}

.action-buttons {
  margin-top: 30px;
}

.button-group {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

h3 {
  margin-top: 20px;
  margin-bottom: 10px;
}
</style> 