<!--
 * @Version    : v1.00
 * @Author     : AI Codex
 * @Date       : 2024-05-15
 * @desc       : 权限不足提示组件，用于在用户没有权限使用功能时显示提示和升级建议
-->
<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElDialog, ElButton, ElDivider, ElCard, ElTag, ElIcon } from 'element-plus';
import { Warning, Lock, ShoppingCart, Coin } from '@element-plus/icons-vue';

const router = useRouter();

// 定义props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  permissionData: {
    type: Object,
    default: () => ({})
  },
  featureName: {
    type: String,
    default: '该功能'
  }
});

// 定义事件
const emit = defineEmits(['update:visible', 'upgrade', 'buy-package', 'recharge-points']);

// 计算错误类型
const errorType = computed(() => {
  if (!props.permissionData) return 'unknown';
  return props.permissionData.reason || 'unknown';
});

// 计算错误消息
const errorMessage = computed(() => {
  if (!props.permissionData) return '权限不足';
  return props.permissionData.message || '您没有权限使用该功能';
});

// 计算会员等级名称
const getMemberLevelName = (level) => {
  const levelMap = {
    'free': '免费用户',
    'standard': '标准会员',
    'premium': '高级会员',
    'professional': '专业会员'
  };
  return levelMap[level] || level;
};

// 处理关闭对话框
const handleClose = () => {
  emit('update:visible', false);
};

// 处理升级会员
const handleUpgrade = () => {
  handleClose();
  
  // 如果有推荐升级信息，使用其链接
  if (props.permissionData?.recommendedUpgrade?.link) {
    router.push(props.permissionData.recommendedUpgrade.link);
  } else {
    // 否则跳转到会员中心
    router.push('/membership');
  }
  
  emit('upgrade');
};

// 处理购买功能包
const handleBuyPackage = () => {
  handleClose();
  
  // 如果有推荐功能包信息，使用其链接
  if (props.permissionData?.recommendedAction?.packageLink) {
    router.push(props.permissionData.recommendedAction.packageLink);
  } else {
    // 否则跳转到功能包商店
    router.push('/packages');
  }
  
  emit('buy-package');
};

// 处理充值积分
const handleRechargePoints = () => {
  handleClose();
  
  // 如果有积分充值链接，使用其链接
  if (props.permissionData?.recommendedAction?.pointsLink) {
    router.push(props.permissionData.recommendedAction.pointsLink);
  } else {
    // 否则跳转到积分中心
    router.push('/points');
  }
  
  emit('recharge-points');
};
</script>

<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    :title="errorMessage"
    width="500px"
    :show-close="true"
    @close="handleClose"
  >
    <div class="permission-denied-content">
      <!-- 错误图标 -->
      <div class="error-icon">
        <el-icon :size="48" color="#f56c6c"><Warning /></el-icon>
      </div>
      
      <!-- 错误说明 -->
      <div class="error-description">
        <p v-if="errorType === 'insufficient_member_level'">
          <strong>{{ featureName }}</strong> 需要 
          <el-tag type="warning">{{ getMemberLevelName(permissionData.requiredLevel) }}</el-tag> 
          及以上等级才能使用。您当前是 
          <el-tag>{{ getMemberLevelName(permissionData.currentLevel) }}</el-tag>
        </p>
        
        <p v-else-if="errorType === 'feature_not_allowed'">
          您当前的会员等级没有使用 <strong>{{ featureName }}</strong> 的权限。
        </p>
        
        <p v-else-if="errorType === 'quota_exceeded'">
          您的 <strong>{{ featureName }}</strong> 使用额度已用完。
          <template v-if="permissionData.quotaLeft">
            <br>
            会员额度剩余: {{ permissionData.quotaLeft.memberQuota || 0 }}
            <br>
            功能包额度剩余: {{ permissionData.quotaLeft.packageQuota || 0 }}
            <br>
            积分余额: {{ permissionData.quotaLeft.points || 0 }}
          </template>
        </p>
        
        <p v-else>
          您没有权限使用 <strong>{{ featureName }}</strong>。
        </p>
      </div>
      
      <el-divider>解决方案</el-divider>
      
      <!-- 解决方案 -->
      <div class="solutions">
        <!-- 升级会员 -->
        <el-card v-if="errorType === 'insufficient_member_level' || errorType === 'feature_not_allowed'" 
                shadow="hover" 
                class="solution-card">
          <div class="solution-content">
            <el-icon :size="24" color="#409eff"><Lock /></el-icon>
            <div class="solution-text">
              <h4>升级会员</h4>
              <p>升级到更高级别的会员，获取更多功能和使用额度。</p>
            </div>
            <el-button type="primary" @click="handleUpgrade">立即升级</el-button>
          </div>
        </el-card>
        
        <!-- 购买功能包 -->
        <el-card v-if="errorType === 'quota_exceeded'" 
                shadow="hover" 
                class="solution-card">
          <div class="solution-content">
            <el-icon :size="24" color="#67c23a"><ShoppingCart /></el-icon>
            <div class="solution-text">
              <h4>购买功能包</h4>
              <p>购买额外的功能包，增加 {{ featureName }} 的使用额度。</p>
            </div>
            <el-button type="success" @click="handleBuyPackage">购买功能包</el-button>
          </div>
        </el-card>
        
        <!-- 充值积分 -->
        <el-card v-if="errorType === 'quota_exceeded' && permissionData.quotaLeft && permissionData.quotaLeft.points !== undefined" 
                shadow="hover" 
                class="solution-card">
          <div class="solution-content">
            <el-icon :size="24" color="#e6a23c"><Coin /></el-icon>
            <div class="solution-text">
              <h4>使用积分</h4>
              <p>充值积分，使用积分兑换功能使用额度。</p>
            </div>
            <el-button type="warning" @click="handleRechargePoints">充值积分</el-button>
          </div>
        </el-card>
      </div>
    </div>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.permission-denied-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 0;
}

.error-icon {
  margin-bottom: 20px;
}

.error-description {
  text-align: center;
  margin-bottom: 20px;
}

.solutions {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.solution-card {
  width: 100%;
}

.solution-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.solution-text {
  flex: 1;
  margin: 0 15px;
}

.solution-text h4 {
  margin: 0 0 5px 0;
  font-size: 16px;
}

.solution-text p {
  margin: 0;
  font-size: 14px;
  color: #606266;
}

.dialog-footer {
  display: flex;
  justify-content: center;
}
</style> 