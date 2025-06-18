<template>
  <div class="transcribe-container">
    <!-- 转写模式选择区域 -->
    <div class="mode-select-area">
      <div class="section-title">选择转写模式</div>
      <div class="tab-container">
        <div 
          class="tab-item" 
          :class="{ active: transcribeMode === 'single' }"
          @click="transcribeMode = 'single'"
        >
          单个视频转写
        </div>
        <div 
          class="tab-item" 
          :class="{ 
            active: transcribeMode === 'batch',
            disabled: !hasFullAccess
          }"
          @click="hasFullAccess && (transcribeMode = 'batch')"
        >
          <div v-if="!hasFullAccess" class="locked-option">
            <!-- <el-icon><Lock /></el-icon> -->
            批量视频转写
          </div>
          <div v-else>批量视频转写</div>
        </div>
      </div>
    </div>
    
    <!-- 数据源选择区域 -->
    <div class="section-container">
      <div class="section-title">选择数据源</div>
      
      <!-- 表格选择 -->
      <div class="select-item">
        <div class="select-label">选择表格</div>
        <el-select
          v-model="selectedTable"
          class="full-width-select"
          placeholder="选择表格"
          :loading="tableLoading"
          @change="handleTableChange"
        >
          <el-option
            v-for="table in availableTables"
            :key="table.id"
            :label="table.name"
            :value="table.id"
          />
          <template #empty>
            <div class="empty-container">
              <el-empty description="无可用表格" />
            </div>
          </template>
        </el-select>
      </div>
      
      <!-- 视图选择 -->
      <div class="select-item">
        <div class="select-label">选择视图</div>
        <el-select
          v-model="selectedView"
          class="full-width-select"
          placeholder="选择视图"
          :loading="viewLoading"
          :disabled="!selectedTable"
          @change="handleViewChange"
        >
          <el-option
            v-for="view in availableViews"
            :key="view.id"
            :label="view.name"
            :value="view.id"
          />
          <template #empty>
            <el-empty description="无可用视图" />
          </template>
        </el-select>
      </div>
      
      <!-- 视频URL列选择 -->
      <div class="select-item">
        <div class="select-label">选择视频URL列</div>
        <el-select
          v-model="selectedColumn"
          class="full-width-select"
          placeholder="选择包含视频URL的列"
          :loading="columnsLoading"
          :disabled="!selectedView"
          @change="handleColumnChange"
        >
          <el-option
            v-for="column in availableColumns"
            :key="column.id"
            :label="column.name"
            :value="column.id"
          />
          <template #empty>
            <el-empty description="无可用URL列" />
          </template>
        </el-select>
      </div>
    </div>
    
    <!-- 视频选择区域 (批量模式) -->
    <div v-if="transcribeMode === 'batch' && selectedColumn" class="section-container">
      <div class="section-title">选择要转写的视频</div>
      
      <!-- 选择模式 -->
      <el-radio-group v-model="batchSelectMode" class="select-mode-group">
        <el-radio :value="'all'">
          <div class="mode-label">
            <el-icon><VideoPlay /></el-icon>
            <span>全部视频</span>
            <span class="mode-count" v-if="allRows.length > 0">({{ allRows.length }}个视频)</span>
          </div>
        </el-radio>
        
        <el-radio :value="'manual'">
          <div class="mode-label">
            <el-icon><Select /></el-icon>
            <span>手动勾选</span>
            <span class="mode-count" v-if="selectedRows.length > 0">(已选{{ selectedRows.length }}个)</span>
          </div>
        </el-radio>
      </el-radio-group>
      
      <!-- 全选模式下的筛选条件表单 -->
      <div v-if="batchSelectMode === 'all'" class="filter-form-container">
        <el-form label-position="top" class="filter-form">
          <div class="filter-form-title">筛选条件 (可选)</div>
          <el-form-item label="点赞数 ≥">
            <div class="filter-input-group">
              <el-switch v-model="filterConditions.likeCount.enabled" />
              <el-input-number 
                v-model="filterConditions.likeCount.value" 
                :disabled="!filterConditions.likeCount.enabled"
                :min="0"
                :step="100"
              />
            </div>
          </el-form-item>
          
          <el-form-item label="评论数 ≥">
            <div class="filter-input-group">
              <el-switch v-model="filterConditions.commentCount.enabled" />
              <el-input-number 
                v-model="filterConditions.commentCount.value" 
                :disabled="!filterConditions.commentCount.enabled"
                :min="0"
                :step="10"
              />
            </div>
          </el-form-item>
          
          <el-form-item label="分享数 ≥">
            <div class="filter-input-group">
              <el-switch v-model="filterConditions.shareCount.enabled" />
              <el-input-number 
                v-model="filterConditions.shareCount.value" 
                :disabled="!filterConditions.shareCount.enabled"
                :min="0"
                :step="10"
              />
            </div>
          </el-form-item>
        </el-form>
        
        <div class="filter-result">
          <span class="result-label">筛选结果:</span>
          <span class="result-count">{{ getFilteredRows().length }} / {{ allRows.length }} 个视频</span>
        </div>
      </div>
      
      <!-- 手动选择视频表格 -->
      <div v-if="batchSelectMode === 'manual'" class="manual-select-container">
        <div v-if="dataLoading" class="loading-container">
          <el-skeleton :rows="5" animated />
        </div>
        <div v-else-if="allRows.length === 0" class="empty-container">
          <el-empty description="无可用视频数据，请选择包含视频URL的列" />
        </div>
        <el-table
          v-else
          :data="allRows"
          style="width: 100%"
          @selection-change="handleSelectionChange"
          :max-height="400"
          border
        >
          <el-table-column
            type="selection"
            width="45"
          />
          <el-table-column
            prop="authorNickname"
            label="作者"
            width="100"
          />
          <el-table-column
            prop="title"
            label="标题"
            show-overflow-tooltip
          >
            <template #default="scope">
              <div class="table-title">
                {{ scope.row.title || '无标题' }}
                <el-tooltip effect="dark" content="复制URL" placement="top">
                  <el-button
                    link
                    @click="copyToClipboard(scope.row.url)"
                    size="small"
                    :icon="DocumentCopy"
                  ></el-button>
                </el-tooltip>
              </div>
            </template>
          </el-table-column>
          <el-table-column
            prop="likeCount"
            label="点赞数"
            width="90"
            sortable
          />
          <el-table-column
            prop="commentCount"
            label="评论数"
            width="90"
            sortable
          />
        </el-table>
        
        <div v-if="allRows.length > 0" class="table-footer">
          <span>共 {{ allRows.length }} 条数据，已选择 {{ selectedRows.length }} 条</span>
        </div>
      </div>
    </div>
    
    <!-- 视频选择区域 (单视频模式) -->
    <div v-if="transcribeMode === 'single' && selectedColumn" class="section-container">
      <div class="section-title">选择要转写的视频</div>
      
      <div class="select-item">
        <div class="select-label">选择视频</div>
        <el-select
          v-model="selectedRows[0]"
          class="full-width-select"
          value-key="id"
          placeholder="选择要转写的视频"
          :loading="dataLoading"
          :disabled="!selectedColumn || allRows.length === 0"
          filterable
          remote
          reserve-keyword
          :remote-method="filterVideoOptions"
          :loading-text="dataLoading ? '加载中...' : ''"
          :no-match-text="noMatchText"
          :no-data-text="allRows.length === 0 ? '无可用视频' : '请输入关键词搜索'"
        >
          <el-option
            v-for="row in filteredVideoOptions"
            :key="row.id"
            :label="row.title || row.url"
            :value="row"
          >
            <div class="video-option">
              <div class="video-title">{{ row.title || '无标题' }}</div>
              <div class="video-info">
                <span>作者: {{ row.authorNickname || '未知' }}</span>
                <span v-if="row.likeCount">点赞: {{ row.likeCount }}</span>
              </div>
            </div>
          </el-option>
        </el-select>
        <div class="select-help-text">输入关键词可搜索视频标题</div>
      </div>
    </div>
    
    <!-- 设置区域 -->
    <div v-if="selectedColumn" class="section-container">
      <div class="section-title">转写结果设置</div>
      
      <div class="select-item">
        <el-radio-group v-model="useNewColumn">
          <el-radio :value="true">新建列存储转写结果</el-radio>
          <el-radio :value="false">选择已有列覆盖</el-radio>
        </el-radio-group>
      </div>
      
      <div v-if="useNewColumn" class="select-item">
        <div class="select-label">新列名称</div>
        <el-input v-model="resultColumnName" placeholder="输入新列名称" />
      </div>
      
      <div v-else class="select-item">
        <div class="select-label">选择覆盖列</div>
        <el-select
          v-model="selectedResultColumn"
          class="full-width-select"
          placeholder="选择要覆盖的列"
        >
          <el-option
            v-for="column in availableTextColumns"
            :key="column.id"
            :label="column.name"
            :value="column.id"
          />
        </el-select>
      </div>
    </div>
    
    <!-- 操作按钮区域 -->
    <div class="action-button-area">
      <el-button
        type="primary"
        class="transcribe-btn"
        :loading="loading"
        :disabled="!canStartTranscribe"
        @click="startTranscribe"
      >
        {{ loading ? '转写中...' : '开始转写' }}
      </el-button>
      
      <div v-if="loading" class="operation-tip">
        正在处理，请勿关闭页面
      </div>
      
      <div v-if="loading" class="transcribe-progress">
        <el-progress 
          :percentage="transcribeProgress" 
          :stroke-width="10"
          status="success"
        />
        <div class="progress-text">
          预计剩余时间: {{ formatTimeRemaining(estimatedTimeRemaining) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, reactive } from 'vue'
import {
  ElSelect,
  ElOption,
  ElButton,
  ElProgress,
  ElIcon,
  ElMessage,
  ElEmpty,
  ElRadio,
  ElRadioGroup,
  ElTable,
  ElTableColumn,
  ElInput,
  ElInputNumber,
  ElForm,
  ElFormItem,
  ElSwitch,
  ElTooltip,
  ElSkeleton
} from 'element-plus'
import { Lock, Select, VideoPlay, DocumentCopy } from '@element-plus/icons-vue'
import { bitable, FieldType } from '@lark-base-open/js-sdk'
import { envConfig } from '../config/env'

// 定义props
const props = defineProps({
  user: {
    type: Object,
    required: true
  }
});

// 用户权限
const userPermissions = computed(() => {
  return props.user?.permissions || [];
});

// 系统状态
const isDev = envConfig.isDevelopment
const loading = ref(false)
const error = ref(null)

// 转写进度
const transcribeProgress = ref(0)
const estimatedTimeRemaining = ref(0)

// 视频搜索和过滤相关
const searchQuery = ref('')
const filteredVideoOptions = ref([])
const noMatchText = ref('没有匹配的视频')

// 表格数据加载状态
const tableLoading = ref(false)
const viewLoading = ref(false)
const columnsLoading = ref(false)
const dataLoading = ref(false)

// 表格数据选择状态
const availableTables = ref([])
const availableViews = ref([])
const availableColumns = ref([])
const availableTextColumns = ref([])
const allRows = ref([])
const selectedRows = ref([])

// 选择状态
const selectedTable = ref('')
const selectedView = ref('')
const selectedColumn = ref('')
const selectedVideo = computed(() => {
  return selectedRows.value.length > 0 ? selectedRows.value[0] : null
})

// 结果设置
const useNewColumn = ref(true)
const resultColumnName = ref('视频转写内容')
const selectedResultColumn = ref('')

// 转写模式 'single' 或 'batch'
const transcribeMode = ref('batch') 

// 批量选择模式: 'all' 或 'manual'
const batchSelectMode = ref('all')

// 筛选条件
const filterConditions = reactive({
  likeCount: {
    value: 1000,
    enabled: false
  },
  commentCount: {
    value: 100,
    enabled: false
  },
  shareCount: {
    value: 50,
    enabled: false
  }
})

// 权限计算
const hasFullAccess = computed(() => 
  userPermissions.value.includes('transcribe:advanced') || 
  props.user?.memberLevel === 'pro' || 
  props.user?.memberLevel === 'enterprise'
)

// 计算属性
const canStartTranscribe = computed(() => {
  if (loading.value) return false
  
  // 检查表格和视图是否已选择
  if (!selectedTable.value || !selectedView.value || !selectedColumn.value) {
    return false
  }
  
  // 单视频模式下必须选择一个视频
  if (transcribeMode.value === 'single') {
    return selectedVideo.value !== null
  }
  
  // 批量模式下要根据不同选择模式判断
  if (transcribeMode.value === 'batch') {
    switch (batchSelectMode.value) {
      case 'all':
        return getFilteredRows().length > 0 // 有满足条件的数据
      case 'manual':
        return selectedRows.value.length > 0 // 至少选了一个
      default:
        return false
    }
  }
  
  return false
})

// 根据筛选条件过滤视频
const getFilteredRows = () => {
  if (!allRows.value.length) return [];
  
  return allRows.value.filter(row => {
    let match = true;
    
    // 检查点赞数筛选条件
    if (filterConditions.likeCount.enabled && row.likeCount !== undefined) {
      match = match && row.likeCount >= filterConditions.likeCount.value;
    }
    
    // 检查评论数筛选条件
    if (filterConditions.commentCount.enabled && row.commentCount !== undefined) {
      match = match && row.commentCount >= filterConditions.commentCount.value;
    }
    
    // 检查分享数筛选条件 
    if (filterConditions.shareCount.enabled && row.shareCount !== undefined) {
      match = match && row.shareCount >= filterConditions.shareCount.value;
    }
    
    return match;
  });
};

// 获取当前选中的所有视频
const getSelectedVideos = () => {
  if (transcribeMode.value === 'single') {
    return selectedVideo.value ? [selectedVideo.value] : [];
  }
  
  if (transcribeMode.value === 'batch') {
    switch (batchSelectMode.value) {
      case 'all':
        return getFilteredRows();
      case 'manual':
        return [...selectedRows.value];
      default:
        return [];
    }
  }
  
  return [];
};

// 修改 loadTables 函数，直接使用飞书 SDK 获取表格列表
const loadTables = async () => {
  try {
    tableLoading.value = true;
    console.log('loadTables: 开始获取表格列表');
    
    // 使用飞书SDK获取表格列表
    if (bitable && bitable.base) {
      console.log('loadTables: 调用SDK获取表格列表');
      const tableMetaList = await bitable.base.getTableMetaList();
      console.log('loadTables: SDK返回原始数据', tableMetaList);
      
      if (Array.isArray(tableMetaList) && tableMetaList.length > 0) {
        // 将表格数据转换为UI需要的格式
        availableTables.value = tableMetaList.map(meta => ({
          id: meta.id,
          name: meta.name
        }));
        console.log('loadTables: 成功获取并格式化表格数据', availableTables.value);
      } else {
        console.warn('loadTables: 未获取到表格数据或表格为空');
        availableTables.value = [];
      }
    } else {
      console.error('loadTables: 飞书SDK未加载或不可用');
      ElMessage.warning('飞书API未加载，无法获取表格数据');
      availableTables.value = [];
    }
  } catch (error) {
    console.error('loadTables: 获取表格列表失败:', error);
    ElMessage.error('获取表格列表失败');
    availableTables.value = [];
  } finally {
    tableLoading.value = false;
  }
};

// 处理表格选择变更
const handleTableChange = async (tableId) => {
  if (!tableId) return;
  console.log('handleTableChange: 选择表格:', tableId);
  
  // 重置状态
  selectedView.value = '';
  selectedColumn.value = '';
  availableViews.value = [];
  availableColumns.value = [];
  availableTextColumns.value = [];
  allRows.value = [];
  selectedRows.value = [];
  
  // 先使用bitable.ui.switchToTable方法切换到用户选择的表格
  try {
    if (bitable && bitable.ui && bitable.ui.switchToTable) {
      console.log('正在切换到用户选择的表格:', tableId);
      const switchResult = await bitable.ui.switchToTable(tableId);
      if (switchResult) {
        console.log('成功切换到表格');
        ElMessage.success('已切换到选择的表格');
      } else {
        console.warn('切换表格返回未成功状态');
      }
    }
  } catch (switchError) {
    console.warn('切换表格失败:', switchError);
    // 继续执行，不影响后续流程
  }
  
  try {
    viewLoading.value = true;
    
    console.log('handleTableChange: 开始获取视图列表');
    // 使用飞书SDK获取视图列表
    if (bitable && bitable.base) {
      try {
        const table = await bitable.base.getTableById(tableId);
        if (!table) {
          throw new Error('获取表格对象失败');
        }
        
        console.log('handleTableChange: 成功获取表格对象');
        // 获取视图元数据列表
        const viewMetaList = await table.getViewMetaList();
        console.log('handleTableChange: 视图元数据列表', viewMetaList);
        
        if (Array.isArray(viewMetaList) && viewMetaList.length > 0) {
          // 将视图数据转换为UI需要的格式
          availableViews.value = viewMetaList.map(meta => ({
            id: meta.id,
            name: meta.name,
            type: meta.type
          }));
          console.log('handleTableChange: 格式化后的视图列表', availableViews.value);
        } else {
          console.warn('handleTableChange: 未获取到视图数据或视图为空');
          availableViews.value = [];
        }
      } catch (sdkError) {
        console.error('handleTableChange: 调用SDK获取视图失败:', sdkError);
        ElMessage.error('获取表格视图失败：' + sdkError.message);
        availableViews.value = [];
      }
    } else {
      console.error('handleTableChange: 飞书SDK未加载或不可用');
      ElMessage.warning('飞书API未加载，无法获取视图数据');
      availableViews.value = [];
    }
  } catch (error) {
    console.error('handleTableChange: 加载视图失败:', error);
    ElMessage.error('加载视图失败: ' + error.message);
    availableViews.value = [];
  } finally {
    viewLoading.value = false;
  }
};

// 处理视图选择变更
const handleViewChange = async (viewId) => {
  if (!viewId) return;
  console.log('handleViewChange: 选择视图:', viewId);
  
  // 重置状态
  selectedColumn.value = '';
  availableColumns.value = [];
  availableTextColumns.value = [];
  allRows.value = [];
  selectedRows.value = [];
  
  try {
    columnsLoading.value = true;
    
    console.log('handleViewChange: 开始获取字段列表');
    // 使用飞书SDK获取字段列表
    if (bitable && bitable.base) {
      try {
        const table = await bitable.base.getTableById(selectedTable.value);
        if (!table) {
          throw new Error('获取表格对象失败');
        }
        
        const view = await table.getViewById(viewId);
        if (!view) {
          throw new Error('获取视图对象失败');
        }
        
        console.log('handleViewChange: 成功获取视图对象');
        
        // 获取可见字段ID列表
        const fieldIds = await view.getVisibleFieldIdList();
        console.log('handleViewChange: 可见字段ID列表', fieldIds);
        
        if (!Array.isArray(fieldIds) || fieldIds.length === 0) {
          console.warn('handleViewChange: 视图中没有可见字段');
          return;
        }
        
        // 获取字段元数据
        const allFieldMetaList = [];
        for (const fieldId of fieldIds) {
          try {
            const fieldMeta = await table.getFieldMetaById(fieldId);
            allFieldMetaList.push(fieldMeta);
          } catch (fieldError) {
            console.warn(`handleViewChange: 获取字段 ${fieldId} 元数据失败:`, fieldError);
          }
        }
        
        console.log('handleViewChange: 所有字段元数据', allFieldMetaList);
        
        // 筛选URL类型字段作为视频链接字段
        const urlFields = allFieldMetaList.filter(field => field.type === 15); // URL类型的字段类型为15
        availableColumns.value = urlFields.map(field => ({
          id: field.id,
          name: field.name,
          type: 'url'
        }));
        
        // 筛选文本类型字段作为可覆盖字段
        const textFields = allFieldMetaList.filter(field => field.type === 1); // 文本类型的字段类型为1
        availableTextColumns.value = textFields.map(field => ({
          id: field.id,
          name: field.name,
          type: 'text'
        }));
        
        console.log('handleViewChange: URL字段列表', availableColumns.value);
        console.log('handleViewChange: 文本字段列表', availableTextColumns.value);
      } catch (sdkError) {
        console.error('handleViewChange: 调用SDK获取字段失败:', sdkError);
        ElMessage.error('获取视图字段失败：' + sdkError.message);
      }
    } else {
      console.error('handleViewChange: 飞书SDK未加载或不可用');
      ElMessage.warning('飞书API未加载，无法获取字段数据');
    }
  } catch (error) {
    console.error('handleViewChange: 加载字段失败:', error);
    ElMessage.error('加载字段失败: ' + error.message);
  } finally {
    columnsLoading.value = false;
  }
};

// 处理视频URL列选择变更
const handleColumnChange = async (columnId) => {
  console.log('=== handleColumnChange开始 ===');
  console.log('  选中的列ID:', columnId);
  console.log('  当前表格ID:', selectedTable.value);
  console.log('  当前视图ID:', selectedView.value);
  
  try {
    if (!columnId) {
      console.warn('未选择列，清空数据');
      allRows.value = [];
      filteredVideoOptions.value = [];
      return;
    }
    
    dataLoading.value = true;
    selectedRows.value = [];
    
    console.log('加载记录数据，列ID:', columnId);
    
    try {
      // 使用飞书SDK获取记录数据
      if (!bitable || !bitable.base) {
        throw new Error('飞书SDK未加载或不可用');
      }
      
      // 获取当前表格对象
      const table = await bitable.base.getTableById(selectedTable.value);
      if (!table) {
        throw new Error('获取表格对象失败');
      }
      
      // 获取当前视图对象
      const view = await table.getViewById(selectedView.value);
      if (!view) {
        throw new Error('获取视图对象失败');
      }
      
      // 获取视图下可见的记录ID
      const recordIds = await view.getVisibleRecordIdList();
      console.log('获取到记录ID列表:', recordIds, '记录数量:', recordIds?.length || 0);
      
      if (!Array.isArray(recordIds) || recordIds.length === 0) {
        console.warn('视图中没有可见记录，请检查视图筛选条件或权限设置');
        allRows.value = [];
        filteredVideoOptions.value = [];
        return;
      }
      
      // 获取当前表格所有字段信息，用于调试
      const fieldMetaList = await table.getFieldMetaList();
      console.log('表格所有字段元数据:', fieldMetaList);
      console.log('当前选中的URL列ID:', columnId);
      
      // 获取每条记录的详细信息
      const rows = [];
      
      for (const recordId of recordIds) {
        if (!recordId) {
          console.warn('跳过无效的记录ID');
          continue;
        }
        
        try {
          const record = await table.getRecordById(recordId);
          const fields = record.fields || {};
          
          // 记录所有字段名和值，便于调试
          console.log(`记录 ${recordId} 的所有字段键:`, Object.keys(fields));
          console.log(`记录 ${recordId} 的字段内容:`, JSON.stringify(fields));
          
          const urlValue = extractTextValue(fields[columnId]);
          console.log(`记录 ${recordId} 的URL值:`, urlValue, '类型:', typeof urlValue);
          
          // 跳过没有URL的记录
          if (!urlValue) {
            console.warn(`记录 ${recordId} 没有有效的URL，已跳过`);
            continue;
          }
          
          // 提取字段值并记录调试信息
          console.log('记录字段映射 - 标题: fldCgKzD2E, 作者: fldHYq66m1, 点赞: fld8zbnupn, 评论: flddMPF2Co, 分享: fld2SCJVM3');

          // 使用确定的字段ID而不是搜索字段名
          const titleFieldId = 'fldCgKzD2E';
          const authorFieldId = 'fldHYq66m1';
          const likeFieldId = 'fld8zbnupn';
          const commentFieldId = 'flddMPF2Co';
          const shareFieldId = 'fld2SCJVM3';

          // 检查字段是否存在
          const hasTitle = fields[titleFieldId] !== undefined;
          const hasAuthor = fields[authorFieldId] !== undefined;
          const hasLikes = fields[likeFieldId] !== undefined;
          const hasComments = fields[commentFieldId] !== undefined;
          const hasShares = fields[shareFieldId] !== undefined;

          console.log('字段存在检查:', {
            hasTitle,
            hasAuthor,
            hasLikes,
            hasComments,
            hasShares
          });

          // 提取值
          const title = hasTitle ? extractTextValue(fields[titleFieldId]) : '';
          const author = hasAuthor ? extractTextValue(fields[authorFieldId]) : '';
          const likes = hasLikes ? parseInt(extractTextValue(fields[likeFieldId]) || '0') : 0;
          const comments = hasComments ? parseInt(extractTextValue(fields[commentFieldId]) || '0') : 0;
          const shares = hasShares ? parseInt(extractTextValue(fields[shareFieldId]) || '0') : 0;

          console.log('提取的字段值:', {
            url: urlValue,
            title,
            author,
            likes,
            comments,
            shares
          });
          
          rows.push({
            id: recordId,
            recordId: recordId,
            url: urlValue,
            title,
            authorNickname: author,
            likeCount: likes,
            commentCount: comments,
            shareCount: shares
          });
        } catch (recordError) {
          console.warn(`获取记录 ${recordId} 数据失败:`, recordError);
        }
      }
      
      allRows.value = rows;
      console.log('解析后的记录数据:', allRows.value);
      console.log('总共找到', rows.length, '条有效记录');
      
      // 初始化过滤后的选项数据
      filteredVideoOptions.value = allRows.value.slice(0, 50);
      console.log('过滤后可选择的视频:', filteredVideoOptions.value.length, '条');
      
      // 单个模式下，自动选择第一个视频
      if (transcribeMode.value === 'single' && allRows.value.length > 0) {
        selectedRows.value = [allRows.value[0]];
        console.log('单视频模式下自动选择第一个视频:', selectedRows.value[0]);
      } else {
        selectedRows.value = [];
        console.log('批量模式或无数据，清空选择');
      }
    } catch (error) {
      console.error('获取记录数据失败:', error);
      ElMessage.error('数据加载失败: ' + error.message);
      allRows.value = [];
      filteredVideoOptions.value = [];
    }
    
    dataLoading.value = false;
  } catch (error) {
    console.error('处理列选择变更失败:', error);
    dataLoading.value = false;
  }
};

// 添加根据筛选条件更新选中行的函数
const updateSelectedRowsByFilter = () => {
  const filteredRows = getFilteredRows();
  if (filteredRows.length > 0) {
    selectedRows.value = [...filteredRows];
    console.log('updateSelectedRowsByFilter: 根据筛选条件自动选择了', selectedRows.value.length, '个视频');
  } else {
    selectedRows.value = [];
    console.log('updateSelectedRowsByFilter: 筛选条件下没有匹配的视频');
  }
};

// 从飞书单元格值中提取文本
const extractTextValue = (cellValue) => {
  if (cellValue === undefined || cellValue === null) {
    console.log('提取文本: 值为空');
    return '';
  }
  
  // 记录原始值类型，方便调试
  console.log('提取文本，原始值:', cellValue, '类型:', typeof cellValue);
  
  // 处理字符串类型
  if (typeof cellValue === 'string') {
    console.log('提取文本: 字符串类型 =>', cellValue);
    return cellValue;
  }
  
  // 处理数字类型
  if (typeof cellValue === 'number') {
    const result = String(cellValue);
    console.log('提取文本: 数字类型 =>', result);
    return result;
  }
  
  // 处理数组类型（如URL、多选等）
  if (Array.isArray(cellValue)) {
    console.log('提取文本: 数组类型 =>', cellValue);
    if (cellValue.length === 0) return '';
    
    console.log('处理数组类型字段值:', cellValue);
    
    // 尝试提取第一个元素
    const firstItem = cellValue[0];
    
    // 处理URL类型
    if (firstItem && typeof firstItem === 'object') {
      if (firstItem.type === 'url' || firstItem.type === 'Url') {
        return firstItem.link || firstItem.text || firstItem.url || '';
      }
      
      // 处理普通对象
      return firstItem.text || firstItem.name || firstItem.value || 
             firstItem.link || firstItem.url || String(firstItem);
    }
    
    // 处理简单值数组
    return String(firstItem);
  }
  
  // 处理对象类型
  if (typeof cellValue === 'object' && cellValue !== null) {
    console.log('处理对象类型字段值:', JSON.stringify(cellValue));
    
    // 处理Url类型对象
    if (cellValue.type === 'url' || cellValue.type === 'Url') {
      const result = cellValue.link || cellValue.text || cellValue.url || '';
      console.log('处理URL类型，提取结果:', result);
      return result;
    }
    
    // 处理飞书表格中的URL类型
    if (cellValue.type === 'url_button') {
      const result = cellValue.text || cellValue.link || cellValue.value || '';
      console.log('处理飞书URL按钮类型，提取结果:', result);
      return result;
    }
    
    // 处理飞书特殊字段格式 
    if (cellValue.value !== undefined) {
      console.log('处理飞书特殊字段，value属性值:', cellValue.value);
      if (typeof cellValue.value === 'string') {
        return cellValue.value;
      } else if (Array.isArray(cellValue.value)) {
        return cellValue.value.map(v => String(v)).join(', ');
      } else if (typeof cellValue.value === 'object' && cellValue.value !== null) {
        console.log('嵌套对象value属性:', JSON.stringify(cellValue.value));
        if (cellValue.value.link || cellValue.value.url) {
          return cellValue.value.link || cellValue.value.url;
        }
        return JSON.stringify(cellValue.value);
      }
      return String(cellValue.value);
    }
    
    // 尝试获取所有可能包含文本的属性
    const possibleTextProperties = [
      'text', 'name', 'value', 'link', 'url', 'title', 'content',
      'display', 'displayName', 'displayValue', 'label'
    ];
    
    // 遍历所有可能的属性
    for (const prop of possibleTextProperties) {
      if (cellValue[prop] !== undefined && cellValue[prop] !== null) {
        console.log(`检查对象的${prop}属性:`, cellValue[prop], '类型:', typeof cellValue[prop]);
        if (typeof cellValue[prop] === 'string' || typeof cellValue[prop] === 'number') {
          const result = String(cellValue[prop]);
          console.log(`从${prop}属性提取到文本:`, result);
          return result;
        }
      }
    }
    
    // 如果有data属性且是对象，递归处理
    if (cellValue.data && typeof cellValue.data === 'object') {
      return extractTextValue(cellValue.data);
    }
    
    // 兜底返回JSON字符串
    try {
      return JSON.stringify(cellValue);
    } catch (e) {
      return String(cellValue);
    }
  }
  
  // 兜底返回
  return String(cellValue);
};

// 格式化剩余时间
const formatTimeRemaining = (seconds) => {
  if (seconds <= 0) return '不到1秒'
  if (seconds < 60) return `${seconds}秒`
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  if (remainingSeconds === 0) {
    return `${minutes}分钟`
  } else {
    return `${minutes}分${remainingSeconds}秒`
  }
}

// 恢复完整的startTranscribe函数逻辑
const startTranscribe = async () => {
  if (!canStartTranscribe.value) return;
  
  try {
    // 获取所有需要处理的视频
    const videos = getSelectedVideos();
    
    if (!videos.length) {
      ElMessage.warning('请选择要转写的视频');
      return;
    }
    
    // 检查视频数量限制
    const videoCountLimit = hasFullAccess.value ? 1000 : 5; // 免费用户限制5个，专业版无限制
    
    if (videos.length > videoCountLimit) {
      ElMessage.warning(`您当前的会员级别一次最多可以处理 ${videoCountLimit} 个视频，已选择 ${videos.length} 个视频`);
      return;
    }
    
    loading.value = true;
    transcribeProgress.value = 0;
    
    console.log(`准备转写 ${videos.length} 个视频:`, videos);
    
    // 在这里获取记录ID列表，用于后续转写操作
    const recordIds = videos.map(video => video.id);
    console.log('要转写的记录ID:', recordIds);
    
    // 调用真实的转写API
    try {
      // 获取API基础URL和认证令牌
      const backendUrl = localStorage.getItem('api_base_url') || 'https://fsbk.dy2bcsm.cn/api';
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        throw new Error('未找到认证令牌，请先登录');
      }
      
      // 准备转写请求参数
      const requestData = {
        videos: videos,
        tableId: selectedTable.value,
        resultColumn: useNewColumn.value ? resultColumnName.value : selectedResultColumn.value,
        createNewColumn: useNewColumn.value
      };
      
      // 发送转写请求
      const response = await fetch(`${backendUrl}/douyin/transcribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.code === 0) {
        // 转写成功
        console.log('转写完成:', result.data);
        ElMessage.success(`已完成 ${videos.length} 个视频的转写`);
      } else {
        throw new Error(result.message || '转写失败');
      }
    } catch (apiError) {
      console.error('转写API调用失败:', apiError);
      throw apiError;
    }
    
    // 如果需要创建新列，使用飞书SDK创建
    if (useNewColumn.value && resultColumnName.value) {
      try {
        const table = await bitable.base.getTableById(selectedTable.value);
        const newFieldId = await table.addField({ 
          type: FieldType.Text, 
          name: resultColumnName.value 
        });
        console.log('已创建新列:', newFieldId);
      } catch (fieldError) {
        console.warn('创建新列失败:', fieldError);
        // 不抛出错误，因为转写可能已经成功
      }
    }
  } catch (error) {
    console.error('视频转写失败:', error);
    ElMessage.error('视频转写失败: ' + error.message);
  } finally {
    loading.value = false;
    transcribeProgress.value = 100;
    estimatedTimeRemaining.value = 0;
  }
};

// 监听转写模式变化
watch(transcribeMode, (newMode) => {
  console.log('转写模式变更为:', newMode);
  
  // 清空已选择的行
  selectedRows.value = [];
  
  // 根据新模式自动选择
  if (newMode === 'single' && allRows.value.length > 0) {
    // 单视频模式下自动选择第一个视频
    selectedRows.value = [allRows.value[0]];
    console.log('单视频模式自动选择第一个视频', selectedRows.value[0]);
  } else if (newMode === 'batch' && batchSelectMode.value === 'all') {
    // 批量模式且为全选时，根据筛选条件自动选择
    updateSelectedRowsByFilter();
  }
});

// 监听批量选择模式变化
watch(batchSelectMode, (newMode) => {
  console.log('批量选择模式变更为:', newMode);
  
  // 只有在批量转写模式下才处理
  if (transcribeMode.value === 'batch') {
    if (newMode === 'all') {
      // 全选模式下根据筛选条件自动选择
      updateSelectedRowsByFilter();
    } else if (newMode === 'manual') {
      // 手动模式下清空选择，由用户手动勾选
      selectedRows.value = [];
    }
  }
});

// 监听筛选条件变化，自动更新选中的行
watch(
  [
    () => filterConditions.likeCount.enabled,
    () => filterConditions.likeCount.value,
    () => filterConditions.commentCount.enabled,
    () => filterConditions.commentCount.value,
    () => filterConditions.shareCount.enabled,
    () => filterConditions.shareCount.value
  ],
  () => {
    if (transcribeMode.value === 'batch' && batchSelectMode.value === 'all') {
      updateSelectedRowsByFilter();
    }
  }
);

// 剪贴板复制功能
const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('已复制链接到剪贴板');
  }).catch(() => {
    ElMessage.error('复制失败，请手动复制');
  });
};

// 组件挂载时加载初始数据
onMounted(async () => {
  try {
    console.log('组件挂载 - 开始加载表格数据');
    console.log('当前环境:', isDev ? '开发环境' : '生产环境');
    console.log('强制使用真实的飞书SDK获取数据，不使用模拟数据');
    
    // 从飞书API加载数据，无论是开发环境还是生产环境
    tableLoading.value = true;
    console.log('从飞书SDK加载表格数据');
    await loadTables();
    console.log('表格数据加载完成:', availableTables.value);
    tableLoading.value = false;
  } catch (error) {
    console.error('初始数据加载失败:', error);
    ElMessage.error('数据加载失败，请刷新页面重试');
    tableLoading.value = false;
  }
});

// 表格选择变更处理
const handleSelectionChange = (rows) => {
  console.log('Selected rows:', rows);
  selectedRows.value = rows;
};

// 格式化字段列表，用于下拉选择
const formatFieldMetaList = (metaList) => {
  return metaList.map(meta => ({ label: meta.name, value: meta.id }));
};

// 视频搜索过滤方法
const filterVideoOptions = (query) => {
  searchQuery.value = query
  if (query === '') {
    // 如果查询为空，最多显示前50条结果
    filteredVideoOptions.value = allRows.value.slice(0, 50)
    return
  }
  
  const lowerQuery = query.toLowerCase()
  filteredVideoOptions.value = allRows.value.filter(row => {
    // 搜索标题
    if (row.title && row.title.toLowerCase().includes(lowerQuery)) {
      return true
    }
    // 搜索作者昵称
    if (row.authorNickname && row.authorNickname.toLowerCase().includes(lowerQuery)) {
      return true
    }
    // 搜索URL
    if (row.url && row.url.toLowerCase().includes(lowerQuery)) {
      return true
    }
    return false
  })
  
  // 更新无匹配文本
  if (filteredVideoOptions.value.length === 0) {
    noMatchText.value = `没有与"${query}"匹配的视频`
  }
}
</script>

<style scoped>
.transcribe-container {
  padding: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #303133;
}

.mode-select-area {
  margin-bottom: 16px;
}

.tab-container {
  display: flex;
  width: 100%;
  height: 42px;
  border-bottom: 1px solid #DCDFE6;
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 14px;
  font-weight: 600;
  color: #606266;
  cursor: pointer;
  position: relative;
}

.tab-item.active {
  color: #2E6BE6;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: #2E6BE6;
}

.tab-item.disabled {
  color: #C0C4CC;
  cursor: not-allowed;
}

.locked-option {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.section-container {
  margin-bottom: 12px;
  background-color: #fff;
  border-radius: 8px;
  padding: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.select-item {
  margin-bottom: 10px;
}

.select-label {
  font-size: 13px;
  color: #606266;
  margin-bottom: 4px;
}

.full-width-select {
  width: 100%;
}

.action-button-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 16px 0;
}

.transcribe-btn {
  width: 90%;
  height: 40px;
  font-size: 14px;
  font-weight: 500;
}

.operation-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}

.transcribe-progress {
  width: 100%;
  margin-top: 16px;
}

.progress-text {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
  text-align: center;
}

.select-mode-group {
  margin-bottom: 14px;
}

.mode-label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mode-count {
  font-size: 12px;
  color: #909399;
}

.filter-form-container {
  margin-top: 10px;
  margin-bottom: 12px;
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 6px;
}

.filter-form {
  margin-bottom: 10px;
}

.filter-form-title {
  font-size: 13px;
  font-weight: 500;
  color: #606266;
  margin-bottom: 10px;
}

.filter-input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-result {
  margin-top: 8px;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 4px;
  background-color: #ecf5ff;
  color: #409eff;
  display: inline-block;
}

.result-label {
  font-weight: 500;
  margin-right: 4px;
}

.manual-select-container {
  margin-top: 12px;
}

.loading-container {
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.empty-container {
  margin: 30px 0;
}

.table-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.table-footer {
  margin-top: 10px;
  font-size: 12px;
  color: #606266;
  text-align: right;
  padding: 5px;
}

.video-option {
  display: flex;
  flex-direction: column;
}

.video-title {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 3px;
}

.video-info {
  font-size: 12px;
  color: #909399;
  display: flex;
  gap: 10px;
}

/* 权限包装器样式 */
.permission-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

/* 响应式调整 */
@media (max-width: 480px) {
  .transcribe-container {
    padding: 12px;
  }
  
  .section-container {
    padding: 12px;
  }
  
  .transcribe-btn {
    width: 100%;
  }
}

.select-help-text {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.video-option {
  display: flex;
  flex-direction: column;
  padding: 4px 0;
}

.video-title {
  font-weight: 500;
  font-size: 14px;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.video-info {
  font-size: 12px;
  color: #909399;
  display: flex;
  gap: 8px;
}
</style> 
