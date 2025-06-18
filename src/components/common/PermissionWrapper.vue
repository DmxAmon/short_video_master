<!--
 * @Version    : v1.00
 * @Author     : AI Codex
 * @Date       : 2024-05-10
 * @desc       : 权限控制包装组件，用于包装需要权限控制的功能
-->
<script setup>
import { ref, computed } from 'vue';
import { ElMessageBox } from 'element-plus';
import { Lock } from '@element-plus/icons-vue';
import { useRouter } from 'vue-router';

// 环境变量
const debugMode = import.meta.env.DEV || false;

const props = defineProps({
  // 主要所需权限
  requiredPermission: {
    type: String,
    required: true
  },
  // 替代权限列表 - 用户拥有其中任一权限即可访问
  alternativePermissions: {
    type: Array,
    default: () => []
  },
  // 用户当前权限列表
  userPermissions: {
    type: Array,
    default: () => []
  },
  // 升级提示信息
  upgradeMessage: {
    type: String,
    default: '您需要升级账户以访问此功能'
  },
  // 权限限制类型：hidden(隐藏), disabled(禁用), locked(锁定但可见)
  limitType: {
    type: String,
    default: 'locked',
    validator: (value) => ['hidden', 'disabled', 'locked'].includes(value)
  },
  // 使用次数
  usageCount: {
    type: Number,
    default: 0
  },
  // 使用上限
  usageLimit: {
    type: Number,
    default: 0
  },
  // 是否显示使用限制信息
  showUsageInfo: {
    type: Boolean,
    default: false
  },
  // 提示框标题
  title: {
    type: String,
    default: '权限不足'
  },
  // 是否显示了解更多按钮
  showLearnMore: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['upgrade-clicked']);
const router = useRouter();

// 检查用户是否有权限访问
const hasAccess = computed(() => {
  // 如果用户拥有主要权限，直接允许访问
  if (props.userPermissions.includes(props.requiredPermission)) {
    return true;
  }
  
  // 检查是否拥有任一替代权限
  if (props.alternativePermissions && props.alternativePermissions.length) {
    return props.alternativePermissions.some(permission => 
      props.userPermissions.includes(permission)
    );
  }
  
  return false;
});

// 是否有权限
const hasPermission = computed(() => {
  // 特殊处理 markdown:column 和 markdown:preview 权限冲突问题
  if (props.requiredPermission === 'markdown:column' && 
      props.alternativePermissions && 
      props.alternativePermissions.includes('markdown:preview') &&
      props.userPermissions.includes('markdown:preview')) {
    console.log('用户拥有 markdown:preview 权限，允许访问 markdown 功能');
    return true;
  }
  
  // 处理新旧权限标识符映射
  const permissionMappings = {
    'extract': ['douyin:basic'],
    'transcribe': ['transcribe:basic'],
    'batch': ['douyin:batch'],
    'monitor': ['monitor:basic'],
    'douyin:basic': ['extract'],
    'transcribe:basic': ['transcribe'],
    'douyin:batch': ['batch'],
    'monitor:basic': ['monitor']
  };
  
  if (!props.requiredPermission && props.alternativePermissions.length === 0) {
    console.log('无需权限检查，显示内容');
    return true;
  }
  
  if (!props.userPermissions || props.userPermissions.length === 0) {
    console.log(`用户无任何权限，需要权限: ${props.requiredPermission} 或 ${props.alternativePermissions.join(', ')}`);
    return false;
  }
  
  // 检查主要权限
  const hasMainPermission = props.userPermissions.includes(props.requiredPermission) || 
                           (permissionMappings[props.requiredPermission] && 
                            permissionMappings[props.requiredPermission].some(p => props.userPermissions.includes(p)));
  
  console.log(`检查主要权限 [${props.requiredPermission}]: ${hasMainPermission ? '通过' : '失败'}`);
  
  // 检查替代权限
  let hasAltPermission = false;
  if (props.alternativePermissions && props.alternativePermissions.length > 0) {
    hasAltPermission = props.alternativePermissions.some(perm => {
      const directMatch = props.userPermissions.includes(perm);
      const mappedMatch = permissionMappings[perm] && 
                          permissionMappings[perm].some(p => props.userPermissions.includes(p));
      return directMatch || mappedMatch;
    });
    
    // 记录每个替代权限的检查结果
    props.alternativePermissions.forEach(perm => {
      const directMatch = props.userPermissions.includes(perm);
      const mappedMatch = permissionMappings[perm] && 
                         permissionMappings[perm].some(p => props.userPermissions.includes(p));
      console.log(`检查替代权限 [${perm}]: ${directMatch || mappedMatch ? '通过' : '失败'}`);
    });
  }
  
  // 满足主要权限或任一替代权限即可
  const result = hasMainPermission || hasAltPermission;
  
  console.log(`权限检查结果: ${result ? '通过' : '拒绝'}, 用户权限: [${props.userPermissions.join(', ')}]`);
  
  return result;
});

// 是否超出使用限制
const hasReachedUsageLimit = computed(() => {
  if (props.usageLimit <= 0) return false;
  return props.usageCount >= props.usageLimit;
});

// 使用限制百分比
const usagePercentage = computed(() => {
  if (props.usageLimit <= 0) return 0;
  return Math.min(Math.round((props.usageCount / props.usageLimit) * 100), 100);
});

// 使用限制状态
const usageStatus = computed(() => {
  if (usagePercentage.value >= 90) return 'exception';
  if (usagePercentage.value >= 70) return 'warning';
  return 'success';
});

// 是否显示受限内容
const showContent = computed(() => {
  if (props.limitType === 'hidden') {
    return hasPermission.value && !hasReachedUsageLimit.value;
  }
  return true;
});

// 处理锁定点击
const handleLockedClick = () => {
  if (!hasPermission.value) {
    ElMessageBox.confirm(
      '此功能需要升级会员才能使用，是否查看会员权益?',
      '会员功能',
      {
        confirmButtonText: '查看会员权益',
        cancelButtonText: '暂不升级',
        type: 'info'
      }
    )
    .then(() => {
      emit('upgrade-clicked');
    })
    .catch(() => {});
  } else if (hasReachedUsageLimit.value) {
    ElMessageBox.alert(
      '您今日使用次数已达上限，请明天再试或升级会员扩大使用次数。',
      '使用次数已达上限',
      {
        confirmButtonText: '确定',
        type: 'warning'
      }
    );
  }
};

// 处理升级会员
const handleUpgrade = () => {
  ElMessageBox.confirm(
    '要升级您的账户以获取更多功能吗？',
    '升级账户',
    {
      confirmButtonText: '前往升级',
      cancelButtonText: '取消',
      type: 'info'
    }
  ).then(() => {
    // 实际应用中这里应该跳转到升级页面
    window.open('https://example.com/upgrade', '_blank');
  }).catch(() => {
    // 用户取消
  });
};

// 处理了解更多
const handleLearnMore = () => {
  router.push('/features');
};
</script>

<template>
  <div class="permission-wrapper">
    <div v-if="hasAccess">
      <slot></slot>
    </div>
    <div v-else class="permission-denied">
      <el-empty
        description="需要权限"
        :image-size="200"
      >
        <template #description>
          <div class="permission-message">
            <p>{{ upgradeMessage }}</p>
            <p class="permission-details" v-if="debugMode">
              需要权限: {{ requiredPermission }}
              <span v-if="alternativePermissions && alternativePermissions.length">
                或 {{ alternativePermissions.join(', ') }}
              </span>
              <br>
              当前权限: {{ userPermissions.join(', ') || '无' }}
            </p>
          </div>
        </template>
        <el-button type="primary" @click="handleUpgrade">升级账户</el-button>
      </el-empty>
    </div>
  </div>
</template>

<style scoped>
.permission-wrapper {
  position: relative;
  width: 100%;
}

.permission-locked {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #f5f7fa;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s;
}

.permission-locked:hover {
  background-color: #eef1f6;
}

.permission-locked .el-icon {
  font-size: 24px;
  color: #909399;
  margin-bottom: 8px;
}

.permission-disabled.limit-type-disabled {
  position: relative;
}

.disabled-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
}

.usage-info {
  margin-top: 8px;
  font-size: 12px;
  color: #606266;
}

.usage-text {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.usage-progress {
  margin-top: 2px;
}

.permission-required-card {
  background-color: white;
  border-radius: var(--border-radius-md);
  padding: var(--spacing-lg);
  text-align: center;
  box-shadow: var(--box-shadow);
  margin-bottom: var(--spacing-lg);
}

.permission-icon {
  font-size: 30px;
  color: var(--primary-color);
  margin-bottom: var(--spacing-md);
}

.permission-title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--spacing-sm);
  color: var(--text-primary);
}

.permission-message {
  color: var(--text-secondary);
  margin-bottom: var(--spacing-lg);
  font-size: var(--font-size-base);
}

.permission-actions {
  display: flex;
  justify-content: center;
  gap: var(--spacing-md);
}

.permission-denied {
  padding: 30px 0;
  text-align: center;
}

.permission-details {
  font-size: 12px;
  margin-top: 10px;
  color: #c0c4cc;
}
</style> 