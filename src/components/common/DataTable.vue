<!--
 * @Version    : v1.00
 * @Author     : AI Codex
 * @Date       : 2024-11-15
 * @desc       : 通用数据表格组件
-->
<script setup>
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// 组件属性
const props = defineProps({
  // 数据源
  data: {
    type: Array,
    default: () => []
  },
  // 列配置 [{prop, label, width, sortable, formatter}]
  columns: {
    type: Array,
    default: () => []
  },
  // 是否显示序号列
  showIndex: {
    type: Boolean,
    default: false
  },
  // 是否显示操作列
  showActions: {
    type: Boolean,
    default: false
  },
  // 操作按钮配置 [{label, type, handler, icon, disabled}]
  actions: {
    type: Array,
    default: () => []
  },
  // 是否开启选择功能
  selectable: {
    type: Boolean,
    default: false
  },
  // 加载状态
  loading: {
    type: Boolean,
    default: false
  },
  // 是否支持排序
  sortable: {
    type: Boolean,
    default: false
  },
  // 是否显示分页
  pagination: {
    type: Boolean,
    default: false
  },
  // 分页大小
  pageSize: {
    type: Number,
    default: 10
  },
  // 总数据量（用于分页）
  total: {
    type: Number,
    default: 0
  },
  // 空状态提示文字
  emptyText: {
    type: String,
    default: ''
  },
  // 表格高度（支持数字或CSS值）
  height: {
    type: [String, Number],
    default: ''
  },
  // 表格宽度
  width: {
    type: [String, Number],
    default: '100%'
  },
  // 是否显示边框
  border: {
    type: Boolean,
    default: true
  },
  // 是否为斑马纹表格
  stripe: {
    type: Boolean,
    default: true
  },
  // 是否在加载中
  dataLoading: {
    type: Boolean,
    default: false
  }
});

// 事件
const emit = defineEmits([
  'row-click',
  'selection-change',
  'sort-change',
  'page-change',
  'action-click',
]);

// 表格引用
const tableRef = ref(null);

// 当前页码
const currentPage = ref(1);

// 当前选中项
const selection = ref([]);

// 当前排序属性
const sortProperty = ref('');

// 当前排序方向
const sortOrder = ref('');

// 处理行点击
const handleRowClick = (row, column, event) => {
  emit('row-click', row, column, event);
};

// 处理选择改变
const handleSelectionChange = (val) => {
  selection.value = val;
  emit('selection-change', val);
};

// 处理排序改变
const handleSortChange = ({ prop, order }) => {
  sortProperty.value = prop;
  sortOrder.value = order;
  emit('sort-change', { prop, order });
};

// 处理分页改变
const handlePageChange = (page) => {
  currentPage.value = page;
  emit('page-change', page);
};

// 处理操作按钮点击
const handleActionClick = (action, row, index) => {
  emit('action-click', { action, row, index });
};

// 获取列的宽度
const getColumnWidth = (column) => {
  if (column.width) return column.width;
  return '';
};

// 格式化单元格内容
const formatContent = (row, column) => {
  if (column.formatter && typeof column.formatter === 'function') {
    return column.formatter(row, column);
  }
  return row[column.prop];
};

// 清除选择
const clearSelection = () => {
  if (tableRef.value) {
    tableRef.value.clearSelection();
  }
};

// 计算空状态文本
const computedEmptyText = computed(() => {
  return props.emptyText || t('common.noData');
});

// 向外暴露的方法
defineExpose({
  clearSelection,
  getSelection: () => selection.value,
  tableRef
});
</script>

<template>
  <div class="common-data-table" :style="{ width }">
    <!-- 表格组件 -->
    <el-table
      ref="tableRef"
      :data="data"
      :height="height"
      :border="border"
      :stripe="stripe"
      v-loading="dataLoading"
      :element-loading-text="t('common.loading')"
      :empty-text="computedEmptyText"
      @row-click="handleRowClick"
      @selection-change="handleSelectionChange"
      @sort-change="handleSortChange"
      :style="{ width: '100%' }"
    >
      <!-- 选择列 -->
      <el-table-column
        v-if="selectable"
        type="selection"
        width="55"
        fixed="left"
      />

      <!-- 序号列 -->
      <el-table-column
        v-if="showIndex"
        type="index"
        width="60"
        :label="t('common.index')"
        align="center"
        fixed="left"
      />

      <!-- 数据列 -->
      <el-table-column
        v-for="column in columns"
        :key="column.prop || column.label"
        :prop="column.prop"
        :label="column.label"
        :width="getColumnWidth(column)"
        :sortable="column.sortable || sortable"
        :align="column.align || 'left'"
        :fixed="column.fixed || false"
      >
        <template #default="{ row }">
          <slot :name="column.prop" :row="row" :column="column">
            {{ formatContent(row, column) }}
          </slot>
        </template>
      </el-table-column>

      <!-- 操作列 -->
      <el-table-column
        v-if="showActions && actions.length > 0"
        :label="t('common.actions')"
        :width="actions.length > 2 ? 160 : 120"
        fixed="right"
        align="center"
      >
        <template #default="{ row, $index }">
          <el-button
            v-for="(action, idx) in actions"
            :key="idx"
            :type="action.type || 'primary'"
            :size="action.size || 'small'"
            :icon="action.icon"
            :disabled="
              typeof action.disabled === 'function'
                ? action.disabled(row)
                : action.disabled
            "
            @click.stop="handleActionClick(action, row, $index)"
          >
            {{ action.label }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页组件 -->
    <div v-if="pagination" class="pagination-container">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        layout="total, prev, pager, next, jumper"
        :total="total || data.length"
        @current-change="handlePageChange"
        background
      />
    </div>
  </div>
</template>

<style scoped>
.common-data-table {
  width: 100%;
}

.pagination-container {
  margin-top: 15px;
  display: flex;
  justify-content: flex-end;
}
</style> 