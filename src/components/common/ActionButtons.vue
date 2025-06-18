<!--
 * @Version    : v1.00
 * @Author     : AI Codex
 * @Date       : 2024-11-15
 * @desc       : 通用操作按钮组组件
-->
<script setup>
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// 组件属性
const props = defineProps({
  // 按钮配置列表：[{label, type, icon, disabled, loading, action}]
  buttons: {
    type: Array,
    default: () => []
  },
  // 按钮尺寸
  size: {
    type: String,
    default: 'default' // 'large', 'default', 'small'
  },
  // 按钮组方向
  direction: {
    type: String,
    default: 'horizontal' // 'horizontal', 'vertical'
  },
  // 按钮间距
  gap: {
    type: Number,
    default: 10
  },
  // 右对齐
  right: {
    type: Boolean,
    default: false
  }
});

// 定义事件
const emit = defineEmits(['click']);

// 按钮点击处理
const handleClick = (button, index) => {
  emit('click', { button, index });
};
</script>

<template>
  <div 
    class="action-buttons" 
    :class="{ 
      'vertical': direction === 'vertical',
      'right-aligned': right
    }"
    :style="{ gap: `${gap}px` }"
  >
    <el-button
      v-for="(button, index) in buttons"
      :key="index"
      :type="button.type || 'primary'"
      :icon="button.icon"
      :size="button.size || size"
      :disabled="button.disabled"
      :loading="button.loading"
      @click="handleClick(button, index)"
    >
      {{ button.label }}
    </el-button>
  </div>
</template>

<style scoped>
.action-buttons {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.action-buttons.vertical {
  flex-direction: column;
  align-items: flex-start;
}

.action-buttons.right-aligned {
  justify-content: flex-end;
}
</style> 