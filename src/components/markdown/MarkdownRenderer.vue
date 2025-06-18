<!--
 * @Version    : v1.00
 * @Author     : Amon
 * @Date       : 20245-05-06
 * @desc       : Markdown渲染器组件
-->
<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// 组件属性
const props = defineProps({
  // Markdown内容
  content: {
    type: String,
    default: ''
  },
  // 已渲染的HTML内容
  renderedHtml: {
    type: String,
    default: ''
  },
  // 最大高度
  maxHeight: {
    type: [String, Number],
    default: '500px'
  },
  // 是否显示加载状态
  loading: {
    type: Boolean,
    default: false
  }
});

// 渲染后的内容
const htmlContent = computed(() => {
  return props.renderedHtml || '<div class="markdown-empty">无内容</div>';
});

// 容器样式
const containerStyle = computed(() => {
  const height = typeof props.maxHeight === 'number' 
    ? `${props.maxHeight}px` 
    : props.maxHeight;
  
  return {
    maxHeight: height
  };
});
</script>

<template>
  <div class="markdown-renderer" :style="containerStyle">
    <div v-if="loading" class="markdown-loading">
      <el-skeleton :rows="6" animated />
    </div>
    <div v-else class="markdown-content" v-html="htmlContent"></div>
  </div>
</template>

<style scoped>
.markdown-renderer {
  width: 100%;
  overflow-y: auto;
  background-color: white;
  border-radius: 4px;
}

.markdown-loading {
  padding: 20px;
}

.markdown-content {
  width: 100%;
  overflow-wrap: break-word;
}

.markdown-empty {
  padding: 20px;
  color: #909399;
  text-align: center;
  font-style: italic;
}

/* Markdown样式 */
:deep(h1) {
  font-size: 1.8em;
  margin-top: 0;
  margin-bottom: 16px;
  border-bottom: 1px solid #eaecef;
  padding-bottom: 8px;
}

:deep(h2) {
  font-size: 1.5em;
  margin-top: 24px;
  margin-bottom: 16px;
  border-bottom: 1px solid #eaecef;
  padding-bottom: 6px;
}

:deep(h3) {
  font-size: 1.25em;
  margin-top: 24px;
  margin-bottom: 16px;
}

:deep(p) {
  margin-top: 0;
  margin-bottom: 16px;
  line-height: 1.6;
}

:deep(ul), :deep(ol) {
  padding-left: 20px;
  margin-bottom: 16px;
}

:deep(li) {
  margin-bottom: 4px;
}

:deep(pre) {
  background-color: #f6f8fa;
  border-radius: 4px;
  padding: 16px;
  overflow: auto;
  margin-bottom: 16px;
}

:deep(code) {
  font-family: monospace;
  background-color: #f6f8fa;
  padding: 2px 4px;
  border-radius: 3px;
}

:deep(blockquote) {
  margin: 0 0 16px;
  padding: 0 16px;
  color: #6a737d;
  border-left: 4px solid #dfe2e5;
}

:deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 16px;
}

:deep(th), :deep(td) {
  padding: 8px;
  border: 1px solid #dfe2e5;
}

:deep(th) {
  background-color: #f6f8fa;
  font-weight: bold;
}

:deep(img) {
  max-width: 100%;
  height: auto;
}

:deep(.markdown-error) {
  color: #f56c6c;
  padding: 10px;
  background-color: #fef0f0;
  border-radius: 4px;
}
</style> 