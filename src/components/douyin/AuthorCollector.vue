<!--
 * @Version    : v1.00
 * @Author     : AI Codex
 * @Date       : 2024-11-15
 * @desc       : 抖音作者数据采集组件
-->
<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDouyinAuthor } from '../../composables/useDouyinAuthor';
import DataTable from '../common/DataTable.vue';
import ActionButtons from '../common/ActionButtons.vue';
import { getBitableTables } from '../../api/bitable';

const { t } = useI18n();

// 组件属性
const props = defineProps({
  user: {
    type: Object,
    default: () => ({})
  }
});

// 定义事件
const emit = defineEmits(['collection-success', 'export-success']);

// 使用抖音作者数据采集功能
const {
  authorUrl,
  fieldOptions,
  selectedFields,
  collecting,
  collectionResult,
  error,
  exporting,
  startCollection,
  resetCollection,
  exportToTable
} = useDouyinAuthor();

// 表格列配置
const columns = ref([
  { prop: 'title', label: '标题', width: '300' },
  { prop: 'views', label: '播放量' },
  { prop: 'likes', label: '点赞数' },
  { prop: 'comments', label: '评论数' },
  { prop: 'publish_time', label: '发布时间' },
]);

// 导出相关
const showExportDialog = ref(false);
const tableList = ref([]);
const selectedTableId = ref('');
const loadingTables = ref(false);

// 加载表格列表
const loadTables = async () => {
  loadingTables.value = true;
  try {
    const result = await getBitableTables();
    tableList.value = result.tables || [];
  } catch (err) {
    console.error('获取表格列表失败:', err);
  } finally {
    loadingTables.value = false;
  }
};

// 处理采集按钮点击
const handleCollect = async () => {
  await startCollection();
  
  if (collectionResult.value) {
    emit('collection-success', collectionResult.value);
  }
};

// 处理重置按钮点击
const handleReset = () => {
  resetCollection();
};

// 打开导出对话框
const openExportDialog = () => {
  showExportDialog.value = true;
  loadTables();
};

// 关闭导出对话框
const closeExportDialog = () => {
  showExportDialog.value = false;
};

// 执行导出操作
const handleExport = async () => {
  if (!selectedTableId.value) {
    ElMessage.warning('请选择要导出到的多维表格');
    return;
  }
  
  try {
    const result = await exportToTable(selectedTableId.value);
    closeExportDialog();
    emit('export-success', {
      tableId: selectedTableId.value,
      tableName: tableList.value.find(t => t.id === selectedTableId.value)?.name,
      result
    });
  } catch (err) {
    console.error('导出失败:', err);
  }
};

// 导出按钮配置
const exportButtons = [
  { 
    label: '导出到多维表格', 
    type: 'success', 
    action: 'bitable',
    disabled: !collectionResult.value || collecting.value || exporting.value 
  },
  { 
    label: '导出Excel', 
    type: 'primary',
    action: 'excel',
    disabled: !collectionResult.value || collecting.value || exporting.value
  }
];

// 处理导出按钮点击
const handleExportClick = (event) => {
  const { button } = event;
  if (button.action === 'bitable') {
    openExportDialog();
  } else if (button.action === 'excel') {
    // 这里可以添加导出Excel的逻辑
    ElMessage.info('导出Excel功能即将上线');
  }
};
</script>

<template>
  <div class="author-collector">
    <!-- 采集表单 -->
    <el-form label-position="top">
      <el-form-item label="作者主页URL">
        <el-input 
          v-model="authorUrl" 
          placeholder="请输入抖音作者主页URL"
          clearable
          :disabled="collecting"
        ></el-input>
      </el-form-item>
      
      <el-form-item label="采集字段">
        <el-checkbox-group v-model="selectedFields" :disabled="collecting">
          <el-checkbox 
            v-for="field in fieldOptions" 
            :key="field.value" 
            :label="field.value"
          >
            {{ field.label }}
          </el-checkbox>
        </el-checkbox-group>
      </el-form-item>
      
      <el-form-item>
        <el-button 
          type="primary" 
          @click="handleCollect" 
          :loading="collecting"
          :disabled="!authorUrl || selectedFields.length === 0"
        >
          开始采集
        </el-button>
        
        <el-button @click="handleReset" :disabled="collecting">
          重置
        </el-button>
      </el-form-item>
    </el-form>
    
    <!-- 错误提示 -->
    <el-alert
      v-if="error"
      :title="error"
      type="error"
      show-icon
      style="margin: 15px 0;"
    ></el-alert>
    
    <!-- 采集结果 -->
    <div v-if="collectionResult?.videos?.length" class="result-container">
      <div class="result-header">
        <h3>采集结果（共 {{ collectionResult.videos.length }} 条）</h3>
        
        <ActionButtons 
          :buttons="exportButtons"
          @click="handleExportClick"
        />
      </div>
      
      <DataTable 
        :data="collectionResult.videos" 
        :columns="columns"
        :dataLoading="collecting || exporting"
        border
        stripe
      />
    </div>
    
    <!-- 导出对话框 -->
    <el-dialog
      v-model="showExportDialog"
      title="导出到飞书多维表格"
      width="500px"
    >
      <div v-loading="loadingTables">
        <el-form label-position="top">
          <el-form-item label="选择多维表格">
            <el-select 
              v-model="selectedTableId" 
              placeholder="请选择表格"
              style="width: 100%"
            >
              <el-option
                v-for="table in tableList"
                :key="table.id"
                :label="table.name"
                :value="table.id"
              />
            </el-select>
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="closeExportDialog">取消</el-button>
          <el-button 
            type="primary" 
            @click="handleExport"
            :loading="exporting"
            :disabled="!selectedTableId"
          >
            确认导出
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.author-collector {
  width: 100%;
}

.result-container {
  margin-top: 20px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 15px;
  background-color: #fff;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.result-header h3 {
  margin: 0;
  font-size: 16px;
}
</style> 