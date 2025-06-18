<!--
 * @Version    : v1.00
 * @Author     : AI Codex
 * @Date       : 2024-11-15
 * @desc       : 信息展示卡片组件
-->
<script setup>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
  // 标题
  title: {
    type: String,
    default: ''
  },
  // 副标题
  subtitle: {
    type: String,
    default: ''
  },
  // 图标
  icon: {
    type: [String, Object],
    default: null
  },
  // 图标背景色
  iconBgColor: {
    type: String,
    default: '#409EFF'
  },
  // 内容
  content: {
    type: [String, Number, Object],
    default: ''
  },
  // 额外信息
  extra: {
    type: [String, Number],
    default: ''
  },
  // 是否加载中
  loading: {
    type: Boolean,
    default: false
  },
  // 是否可折叠
  collapsible: {
    type: Boolean,
    default: false
  },
  // 是否默认折叠
  defaultCollapsed: {
    type: Boolean,
    default: false
  },
  // 操作按钮
  actions: {
    type: Array,
    default: () => []
  },
  // 边框
  bordered: {
    type: Boolean,
    default: true
  },
  // 阴影
  shadow: {
    type: String,
    default: 'never' // always, hover, never
  },
  compact: {
    type: Boolean,
    default: false
  }
});

// 定义事件
const emit = defineEmits(['action-click']);

// 折叠状态
const isCollapsed = ref(props.defaultCollapsed);

// 点击折叠按钮
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
};

// 处理操作按钮点击
const handleActionClick = (action, index) => {
  emit('action-click', { action, index });
};

// 计算卡片样式
const cardStyle = computed(() => {
  return {
    borderRadius: '4px',
    overflow: 'hidden'
  };
});

// 计算阴影类型
const shadowClass = computed(() => {
  if (props.shadow === 'never') return '';
  return `is-${props.shadow}-shadow`;
});
</script>

<template>
  <div class="info-card" :class="{ 'is-compact': compact }">
    <div v-if="title" class="info-card-header">
      <h3 class="info-card-title">{{ title }}</h3>
      <slot name="header-action"></slot>
    </div>
    <div class="info-card-content">
      <slot></slot>
    </div>
    <div v-if="$slots.footer" class="info-card-footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<style scoped>
.info-card {
  background: white;
  border-radius: 4px;
  box-shadow: none;
  margin-bottom: var(--spacing-md);
  overflow: hidden;
  border: 1px solid var(--border-color-light, #ebeef5);
}

.info-card-header {
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--border-color-light, #ebeef5);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-card-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.info-card-content {
  padding: var(--spacing-md) var(--spacing-lg);
}

.info-card-footer {
  padding: var(--spacing-md) var(--spacing-lg);
  border-top: 1px solid var(--border-color-light, #ebeef5);
  background-color: var(--bg-light, #f5f7fa);
}

.info-card.is-compact .info-card-header,
.info-card.is-compact .info-card-content,
.info-card.is-compact .info-card-footer {
  padding: var(--spacing-sm) var(--spacing-md);
}

@media (max-width: 358px) {
  .info-card-header,
  .info-card-content,
  .info-card-footer {
    padding: var(--spacing-sm) var(--spacing-md);
  }
  
  .info-card.is-compact .info-card-header,
  .info-card.is-compact .info-card-content,
  .info-card.is-compact .info-card-footer {
    padding: var(--spacing-xs) var(--spacing-sm);
  }
}
</style> 