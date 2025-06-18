<!--
 * @Version    : v1.00
 * @Author     : Amon
 * @Date       : 20245-05-06
 * @desc       : Markdown模式选择器组件
-->
<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { usePermissions } from '../../composables/usePermissions';

const { t } = useI18n();

// 组件属性
const props = defineProps({
  // 当前模式 'cell' 或 'column'
  mode: {
    type: String,
    default: 'cell'
  },
  // 用户权限列表
  userPermissions: {
    type: Array,
    default: () => []
  }
});

// 事件
const emit = defineEmits(['update:mode']);

// 使用权限钩子
const { hasPermission } = usePermissions(props.userPermissions);

// 处理模式更改
const handleModeChange = (newMode) => {
  if (newMode === 'column' && !hasPermission('markdown:column')) {
    return;
  }
  emit('update:mode', newMode);
};

// 计算会员专享标签是否显示
const showMemberTag = computed(() => {
  return !hasPermission('markdown:column');
});
</script>

<template>
  <div class="mode-selector">
    <div class="selector-label">{{ $t('markdown.modeLabel') }}:</div>
    <div class="selector-options">
      <el-radio-group 
        :model-value="mode" 
        @update:model-value="handleModeChange"
        size="small"
      >
        <el-radio-button label="cell">{{ $t('markdown.cellMode') }}</el-radio-button>
        <el-radio-button 
          label="column" 
          :disabled="!hasPermission('markdown:column')"
        >
          {{ $t('markdown.columnMode') }}
          <el-tag 
            v-if="showMemberTag" 
            size="small" 
            type="warning"
          >
            {{ $t('transcription.settings.memberFeature') }}
          </el-tag>
        </el-radio-button>
      </el-radio-group>
    </div>
  </div>
  
  <div class="mode-description">
    <el-alert
      type="info"
      :closable="false"
      show-icon
    >
      <template v-if="mode === 'cell'">
        {{ $t('markdown.selectCell') }}
      </template>
      <template v-else>
        {{ $t('markdown.memberFeature') }}
      </template>
    </el-alert>
  </div>
</template>

<style scoped>
.mode-selector {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.selector-label {
  font-weight: bold;
  margin-right: 12px;
}

.mode-description {
  margin-top: 12px;
  margin-bottom: 20px;
}

:deep(.el-tag) {
  margin-left: 4px;
}
</style> 