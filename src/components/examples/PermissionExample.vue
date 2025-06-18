<!--
 * @Version    : v1.00
 * @Author     : AI Codex
 * @Date       : 2024-05-10
 * @desc       : 权限控制示例组件
-->
<script setup>
import { ref, reactive, watch } from 'vue';
import PermissionWrapper from '../common/PermissionWrapper.vue';
import MembershipCard from '../common/MembershipCard.vue';
import { ElMessage, ElMessageBox } from 'element-plus';

// 定义组件Props
const props = defineProps({
  userPermissions: {
    type: Array,
    default: () => [
      'douyin:collect',
      'transcription:basic',
      'feishu:bitable_sync'
    ]
  }
});

// 本地权限状态（复制一份props的值）
const localPermissions = ref([...props.userPermissions]);

// 定义事件
const emit = defineEmits(['update:userPermissions']);

// 监听userPermissions变化，更新本地权限和UI
watch(() => props.userPermissions, (newPermissions) => {
  // 更新本地权限
  localPermissions.value = [...newPermissions];
  // 根据传入的权限更新会员等级
  updateMemberLevelFromPermissions(newPermissions);
}, { immediate: true });

// 根据权限列表更新会员等级
const updateMemberLevelFromPermissions = (permissions) => {
  if (permissions.includes('data:analysis') || permissions.includes('data:export')) {
    currentMemberLevel.value = '年度会员';
  } else if (permissions.includes('douyin:batch_collect') || permissions.includes('transcription:advanced')) {
    currentMemberLevel.value = '月度会员';
  } else {
    currentMemberLevel.value = '免费用户';
  }
};

// 模拟使用次数数据
const usageData = reactive({
  'douyin:collect': {
    count: 5,
    limit: 10
  },
  'transcription:basic': {
    count: 3,
    limit: 5
  },
  'douyin:batch_collect': {
    count: 0,
    limit: 0
  }
});

// 显示会员权益卡片
const showMembershipCard = ref(false);

// 用户当前会员等级
const currentMemberLevel = ref('免费用户');

// 处理升级会员点击
const handleUpgradeClick = () => {
  showMembershipCard.value = true;
};

// 处理会员升级
const handleUpgrade = async (level) => {
  try {
    // 调用真实API升级会员
    const response = await updateMemberLevel({
      userId: user.id,
      newLevel: level.code
    });
    
    if (response && response.code === 0) {
      // 更新用户会员等级
      user.memberLevel = level.code;
      ElMessage.success(`已升级到${level.name}！`);
    } else {
      throw new Error(response?.message || '升级失败');
    }
  } catch (error) {
    ElMessage.error(error.message || '升级失败');
  }
};
</script>

<template>
  <div class="permission-example">
    <h2 class="example-title">权限控制示例</h2>
    
    <div class="current-status">
      <div class="status-item">
        <div class="status-label">当前会员等级:</div>
        <div class="status-value">{{ currentMemberLevel }}</div>
      </div>
      <div class="status-item">
        <div class="status-label">拥有权限:</div>
        <div class="status-value permissions-list">
          <el-tag 
            v-for="permission in localPermissions"
            :key="permission"
            size="small"
            class="permission-tag"
          >
            {{ permission }}
          </el-tag>
        </div>
      </div>
    </div>
    
    <div class="features-grid">
      <!-- 基础数据采集 - 所有用户可用，有使用限制 -->
      <PermissionWrapper
        requiredPermission="douyin:collect"
        :userPermissions="localPermissions"
        :usageCount="usageData['douyin:collect'].count"
        :usageLimit="usageData['douyin:collect'].limit"
        showUsageInfo
      >
        <div class="feature-card">
          <h3>视频数据采集</h3>
          <p>获取抖音视频的基础数据，包括标题、播放量、点赞数等</p>
          <el-button type="primary" @click="usageData['douyin:collect'].count++">
            使用功能 (已用 {{ usageData['douyin:collect'].count }}/{{ usageData['douyin:collect'].limit }})
          </el-button>
        </div>
      </PermissionWrapper>
      
      <!-- 基础文本转写 - 所有用户可用，有使用限制 -->
      <PermissionWrapper
        requiredPermission="transcription:basic"
        :userPermissions="localPermissions"
        :usageCount="usageData['transcription:basic'].count"
        :usageLimit="usageData['transcription:basic'].limit"
        showUsageInfo
      >
        <div class="feature-card">
          <h3>基础文本转写</h3>
          <p>将视频音频转为文字，支持中文识别</p>
          <el-button type="primary" @click="usageData['transcription:basic'].count++">
            使用功能 (已用 {{ usageData['transcription:basic'].count }}/{{ usageData['transcription:basic'].limit }})
          </el-button>
        </div>
      </PermissionWrapper>
      
      <!-- 批量数据收集 - 仅会员可用 -->
      <PermissionWrapper
        requiredPermission="douyin:batch_collect"
        :userPermissions="localPermissions"
        :usageCount="usageData['douyin:batch_collect'].count"
        :usageLimit="usageData['douyin:batch_collect'].limit"
        showUsageInfo
        upgradeMessage="会员专享功能"
        @upgrade-clicked="handleUpgradeClick"
      >
        <div class="feature-card">
          <h3>批量数据收集</h3>
          <p>一次性收集多个视频或多个创作者的数据</p>
          <el-button type="primary" @click="usageData['douyin:batch_collect'].count++">
            使用功能
          </el-button>
        </div>
      </PermissionWrapper>
      
      <!-- 高级数据分析 - 仅会员可用 -->
      <PermissionWrapper
        requiredPermission="data:analysis"
        :userPermissions="localPermissions"
        upgradeMessage="会员专享功能"
        @upgrade-clicked="handleUpgradeClick"
      >
        <div class="feature-card">
          <h3>高级数据分析</h3>
          <p>深度分析视频表现，生成专业分析报告</p>
          <el-button type="primary">使用功能</el-button>
        </div>
      </PermissionWrapper>
      
      <!-- Markdown整列预览 - 仅会员可用 -->
      <PermissionWrapper
        requiredPermission="markdown:column"
        :userPermissions="localPermissions"
        upgradeMessage="会员专享功能"
        @upgrade-clicked="handleUpgradeClick"
      >
        <div class="feature-card">
          <h3>Markdown整列预览</h3>
          <p>查看整列Markdown内容并一键复制，提高内容处理效率</p>
          <el-button type="primary">使用功能</el-button>
        </div>
      </PermissionWrapper>
    </div>
    
    <!-- 会员权益卡片 -->
    <el-dialog
      v-model="showMembershipCard"
      title="选择会员等级"
      width="80%"
      :close-on-click-modal="false"
    >
      <MembershipCard 
        :currentLevel="currentMemberLevel"
        @upgrade="handleUpgrade"
      />
    </el-dialog>
  </div>
</template>

<style scoped>
.permission-example {
  padding: 20px;
}

.example-title {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 20px;
  color: #303133;
}

.current-status {
  background-color: #f5f7fa;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
}

.status-item {
  display: flex;
  margin-bottom: 10px;
}

.status-item:last-child {
  margin-bottom: 0;
}

.status-label {
  font-weight: bold;
  margin-right: 10px;
  min-width: 100px;
}

.permissions-list {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.permission-tag {
  margin-right: 5px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.feature-card {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.feature-card h3 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 16px;
  color: #303133;
}

.feature-card p {
  flex: 1;
  color: #606266;
  font-size: 14px;
  margin-bottom: 15px;
}
</style> 