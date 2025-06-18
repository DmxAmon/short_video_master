<!--
 * @Version    : v1.00
 * @Author     : Amon
 * @Date       : 20245-05-06
 * @desc       : Markdown元数据组件
-->
<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// 组件属性
const props = defineProps({
  // 元数据对象
  metadata: {
    type: Object,
    default: () => ({})
  }
});

// 是否有表格信息
const hasTableInfo = computed(() => {
  return !!props.metadata.tableId;
});

// 是否有字段信息
const hasFieldInfo = computed(() => {
  return !!props.metadata.fieldId;
});

// 是否有整列数据
const hasColumnData = computed(() => {
  return Array.isArray(props.metadata.column) && props.metadata.column.length > 0;
});

// 整列数据计数
const columnCount = computed(() => {
  return hasColumnData.value ? props.metadata.column.length : 0;
});
</script>

<template>
  <div class="markdown-metadata">
    <div class="metadata-items">
      <div v-if="hasTableInfo" class="meta-item">
        <span class="meta-label">{{ $t('markdown.tableName') }}:</span>
        <span class="meta-value">{{ metadata.tableName || metadata.tableId }}</span>
      </div>
      
      <div v-if="hasFieldInfo" class="meta-item">
        <span class="meta-label">{{ $t('markdown.fieldName') }}:</span>
        <span class="meta-value">{{ metadata.fieldName || metadata.fieldId }}</span>
      </div>
      
      <div v-if="hasColumnData" class="meta-item">
        <span class="meta-label">{{ $t('markdown.columnCount') }}:</span>
        <span class="meta-value">{{ columnCount }}</span>
      </div>
    </div>
    
    <slot name="actions"></slot>
  </div>
</template>

<style scoped>
.markdown-metadata {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
}

.metadata-items {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
}

.meta-item {
  font-size: 13px;
}

.meta-label {
  color: #606266;
  margin-right: 5px;
}

.meta-value {
  font-weight: bold;
  color: #303133;
}
</style> 