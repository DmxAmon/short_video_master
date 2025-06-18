<!--
 * @Version    : v1.01
 * @Author     : Amon
 * @Date       : 2024-07-25
 * @desc       : Markdown预览模块
-->
<template>
  <div class="markdown-container">
    <!-- 模式选择区域 -->
    <div class="mode-select-area">
      <div class="tab-selector">
        <div 
          class="tab-option" 
          :class="{ active: activeMode === 'preview' }"
          @click="handleModeChange('preview')"
        >
          长内容预览
        </div>
        <div 
          class="tab-option" 
          :class="{ 
            active: activeMode === 'export',
            disabled: !userHasExportPermission
          }"
          @click="userHasExportPermission && handleModeChange('export')"
        >
          <div v-if="!userHasExportPermission" class="locked-option">
            <i class="el-icon-lock"></i>
            长内容批量导出
          </div>
          <div v-else>长内容批量导出</div>
        </div>
      </div>
    </div>
          
    <!-- 长内容预览模式 -->
    <div v-if="activeMode === 'preview'" class="content-mode-container">

      <!-- 功能区域和操作按钮 -->
      <div class="toolbar">
        <div class="navigation-buttons">
          <span v-if="markdownMetadata.fieldName && markdownMetadata.recordId" class="current-cell" style="margin-right: 20px;">
            当前单元格: {{ markdownMetadata.fieldName }} 
            <span v-if="markdownMetadata.recordIndex >= 0" class="record-info">
              ： {{ markdownMetadata.recordIndex + 1 }}/{{ markdownMetadata.totalRecords }} 行
            </span>
          </span>
        </div>
      </div>
          
      <!-- Markdown编辑区 -->
      <div class="markdown-content">
        <div class="content-header">
          <div class="header-left">
            <h3>编辑区</h3>
            <span class="word-count">{{ wordCount }} 字符</span>
          </div>
          <div class="header-actions">
            <button type="button" @click="copyContent" class="header-btn" title="复制内容到剪贴板">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span class="tooltip">复制</span>
            </button>
            <button type="button" @click="formatMarkdown" :disabled="!hasContent" class="header-btn" title="格式化Markdown内容">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="7.5 4.21 12 6.81 16.5 4.21"></polyline>
                <polyline points="7.5 19.79 7.5 14.6 3 12"></polyline>
                <polyline points="21 12 16.5 14.6 16.5 19.79"></polyline>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
              <span class="tooltip">格式化</span>
            </button>
            <button type="button" @click="refreshMarkdown" class="header-btn" title="刷新飞书表格内容">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M23 4v6h-6"></path>
                <path d="M1 20v-6h6"></path>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"></path>
                <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"></path>
              </svg>
              <span class="tooltip">刷新</span>
            </button>
          </div>
        </div>
        
        <div class="editor-container">
          <textarea 
            v-model="markdownContent" 
            placeholder="飞书表格中的Markdown内容将显示在这里..."
            @input="autoSave"
            class="auto-expand-textarea"
            ref="markdownEditor"
          ></textarea>
        </div>
        
        <!-- 浮动导航按钮 -->
        <div class="navigation-area">
          <div class="nav-button-wrapper">
            <button type="button" @click="navigateCell('prev')" class="float-nav-button">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="18 15 12 9 6 15"></polyline>
              </svg>
            </button>
            <span class="nav-tooltip">查看上一行内容</span>
          </div>
          <div class="nav-button-wrapper">
            <button type="button" @click="navigateCell('next')" class="float-nav-button">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            <span class="nav-tooltip">查看下一行内容</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 批量导出模式 -->
    <div v-else-if="activeMode === 'export'" class="content-mode-container">
      <div class="intro-section">
        <p>选择需要导出具有长内容单元格的列，支持复制到剪贴板或下载为文件。</p>
        <p>💡 提示：复制到剪贴板后可直接粘贴到飞书文档中；下载文件适合保存和分享。</p>
      </div>
      
      <div class="export-options">
        <div class="option-row">
          <label>数据表:</label>
          <select v-model="exportOptions.tableId" @change="loadTableViews" class="uniform-select">
            <option v-for="table in tables" :key="table.id" :value="table.id">{{ table.name }}</option>
          </select>
        </div>
    
        <div class="option-row">
          <label>视 图:</label>
          <select v-model="exportOptions.viewId" @change="loadTableFields" :disabled="!exportOptions.tableId" class="uniform-select">
            <option v-for="view in views" :key="view.id" :value="view.id">{{ view.name }}</option>
          </select>
        </div>
      
        <div class="option-row">
          <label>文本列:</label>
          <select v-model="exportOptions.fieldId" :disabled="!exportOptions.viewId" class="uniform-select">
            <option v-for="field in textFields" :key="field.id" :value="field.id">{{ field.name }}</option>
          </select>
        </div>
        
        <div class="option-row">
          <label>导出方式:</label>
          <div class="radio-options">
            <label>
              <input type="radio" v-model="exportOptions.type" value="markdown" />
              下载TXT文件
            </label>
            <label class="radio-label-with-tooltip">
              <input type="radio" v-model="exportOptions.type" value="doc" />
              <span class="radio-text">复制到剪贴板</span>
              <span class="radio-tooltip">可粘贴到飞书文档或word文档</span>
            </label>

          </div>
        </div>
      
        <div class="export-actions">
          <button 
            type="button" 
            @click="exportContent" 
            :disabled="!isExportReady || isExporting"
            class="export-button"
          >
            <i class="el-icon-upload2"></i> {{ isExporting ? '导出中...' : '开始导出' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, reactive, onActivated } from 'vue';
import MarkdownIt from 'markdown-it';
import { bitable } from '@lark-base-open/js-sdk';
import { ElMessage } from 'element-plus';

// 接收用户信息
const props = defineProps({
  user: {
    type: Object,
    required: true,
    default: () => ({
      permissions: []
    })
  }
});

// 用户权限
const userPermissions = computed(() => {
  return props.user?.permissions || [];
});

// 模式切换
const activeMode = ref('preview'); // 'preview' 或 'export'

// 状态
const markdownContent = ref('请在飞书表格中选择单元格...');
const renderedHTML = ref('');
const hasContent = ref(false);
const markdownEditor = ref(null);

// 元数据信息
const markdownMetadata = reactive({
  tableId: '',
  tableName: '',
  fieldId: '',
  fieldName: '',
  recordId: '',
  recordIndex: -1, // 当前记录的索引(行号)
  totalRecords: 0,  // 总记录数
  column: [] // 整列数据
});

// 用户权限控制
const userHasExportPermission = computed(() => {
  // 检查用户是否有导出权限（markdown:column或markdown:advanced权限）
  return userPermissions.value.includes('markdown:column') || 
         userPermissions.value.includes('markdown:advanced') ||
         props.user?.memberLevel === 'pro' || 
         props.user?.memberLevel === 'enterprise';
});

// 添加一个标志位，用于控制是否是首次加载表格
const isFirstLoad = ref(true);

// 导出功能相关状态
const tables = ref([]);
const views = ref([]);
const textFields = ref([]);
const isExporting = ref(false);
const exportOptions = reactive({
  tableId: '',
  viewId: '',
  fieldId: '',
  type: 'markdown' // 'doc' 或 'markdown'，默认选择下载TXT文件
});

// 计算属性 - 字数统计
const wordCount = computed(() => {
  return markdownContent.value.length;
});

// 计算属性 - 是否可以导出
const isExportReady = computed(() => {
  return exportOptions.tableId && exportOptions.viewId && exportOptions.fieldId;
});

// 初始化markdown-it实例
const md = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
  typographer: true
});

// 添加处理状态标志和防抖函数
const isProcessingCell = ref(false); // 是否正在处理单元格内容
const lastProcessedCell = ref(''); // 最后处理的单元格ID组合

// 防抖函数
const debounce = (fn, delay = 300) => {
  let timer = null;
  return function(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
};

// 自动保存
const autoSave = debounce(() => {
  localStorage.setItem('markdown_content', markdownContent.value);
  adjustHeight(); // 添加高度调整
}, 300);

// 刷新预览
const refreshPreview = debounce(() => {
  try {
    // 使用markdown-it渲染内容
    const html = md.render(markdownContent.value);
    renderedHTML.value = html;
    
    // 提示用户刷新成功，只在markdownContent有内容时显示
    if (markdownContent.value.trim()) {
      ElMessage.success('内容已刷新');
    }
  } catch (error) {
    console.error('渲染失败:', error);
    renderedHTML.value = '<div class="error">渲染失败，请检查Markdown语法</div>';
    ElMessage.error('渲染失败: ' + error.message);
  }
}, 500);

// Markdown工具栏功能
const insertMarkdown = (prefix, suffix) => {
  const textarea = markdownEditor.value;
  if (!textarea) return;
  
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = markdownContent.value.substring(start, end);
  const beforeText = markdownContent.value.substring(0, start);
  const afterText = markdownContent.value.substring(end);
  
  markdownContent.value = beforeText + prefix + selectedText + suffix + afterText;
  
  // 设置新的光标位置
  setTimeout(() => {
    textarea.focus();
    textarea.selectionStart = start + prefix.length;
    textarea.selectionEnd = start + prefix.length + selectedText.length;
  }, 0);
  
  refreshPreview();
};

// 插入表格
const insertTable = () => {
  const tableTemplate = `| 表头1 | 表头2 | 表头3 |\n| --- | --- | --- |\n| 内容1 | 内容2 | 内容3 |\n| 内容4 | 内容5 | 内容6 |`;
  insertMarkdown(tableTemplate, '');
};

// 上下行导航功能
const navigateCell = async (direction) => {
  // 如果正在处理，忽略该请求
  if (isProcessingCell.value) {
    console.log('正在处理单元格内容，请稍后再试');
    ElMessage.warning('正在处理，请稍后再试');
    return;
  }
  
  try {
    console.log('导航方向:', direction, '正在使用飞书SDK处理导航');
    
    if (!markdownMetadata.tableId || !markdownMetadata.fieldId || !markdownMetadata.recordId) {
      console.log('缺少必要的单元格信息');
      ElMessage.warning('请先选择一个单元格');
          return;
        }
    
    // 保存当前滚动位置
    const scrollPosition = window.scrollY;
    
    // 获取当前选择
    const selection = await bitable.base.getSelection();
    console.log('当前选择信息:', selection);
    
    // 获取当前视图
    if (!selection.viewId) {
      console.log('没有选择视图，尝试获取活跃表格');
      const activeTable = await bitable.base.getActiveTable();
      if (activeTable) {
        const views = await activeTable.getViewMetaList();
        if (views && views.length > 0) {
          selection.viewId = views[0].id;
          console.log('使用第一个视图:', selection.viewId);
        }
      }
    }
    
    // 获取当前表格
    console.log('获取表格:', markdownMetadata.tableId);
    const table = await bitable.base.getTableById(markdownMetadata.tableId);
    if (!table) {
      console.error('无法获取表格');
      ElMessage.error('无法获取表格信息');
        return;
    }
    
    // 尝试方法1: 使用视图导航（如果有视图）
    if (selection.viewId) {
      try {
        console.log('尝试使用视图导航');
        const view = await table.getViewById(selection.viewId);
        
        // 获取视图中的记录
        const visibleRecords = await view.getVisibleRecordIdList();
        console.log('视图中可见记录数:', visibleRecords.length);
        
        // 查找当前记录在视图中的位置
        const currentIndex = visibleRecords.indexOf(markdownMetadata.recordId);
        console.log('当前记录在视图中的索引:', currentIndex);
        
        if (currentIndex === -1) {
          console.log('在视图中找不到当前记录，使用方法2');
        } else {
          // 计算目标索引
          let targetIndex;
          if (direction === 'prev') {
            targetIndex = currentIndex > 0 ? currentIndex - 1 : visibleRecords.length - 1;
          } else {
            targetIndex = currentIndex < visibleRecords.length - 1 ? currentIndex + 1 : 0;
          }
          
          const targetRecordId = visibleRecords[targetIndex];
          console.log('目标记录ID:', targetRecordId);
          
          // 更新元数据
          markdownMetadata.recordId = targetRecordId;
          markdownMetadata.recordIndex = targetIndex; // 更新当前索引
          markdownMetadata.totalRecords = visibleRecords.length; // 更新总记录数
          
          // 尝试使用ui模块切换视图和表格
          try {
            console.log('使用UI模块切换到目标记录');
            
            // 确保我们在正确的表格上
            if (bitable.ui && bitable.ui.switchToTable) {
              await bitable.ui.switchToTable(markdownMetadata.tableId);
              console.log('已切换到表格:', markdownMetadata.tableId);
            }
            
            // 使用特殊技术从table对象中选择单元格
            if (table.selectRecord) {
              console.log('尝试选择记录:', targetRecordId);
              await table.selectRecord(targetRecordId);
              console.log('已选择记录');
            } else {
              console.warn('表格对象没有selectRecord方法');
            }
          } catch (uiError) {
            console.warn('使用UI模块切换失败:', uiError);
          }
          
          // 获取内容
          await fetchCellContent();
          
          // 恢复滚动位置
          setTimeout(() => {
            window.scrollTo({
              top: scrollPosition,
              behavior: 'auto'
            });
          }, 50);
          
          ElMessage.success(`已${direction === 'prev' ? '向上' : '向下'}导航到新记录`);
          return; // 导航成功，直接返回
        }
      } catch (e) {
        console.warn('视图导航失败:', e);
      }
    }
    
    // 方法2: 使用表格所有记录导航
    console.log('尝试获取所有记录导航');
    try {
      const records = await table.getRecordList();
      
      if (!records || !Array.isArray(records) || records.length === 0) {
        console.error('无法获取记录列表或记录为空');
        ElMessage.warning('表格中没有记录');
        return;
      }
      
      console.log('获取到记录数:', records.length);
      // 更新总记录数
      markdownMetadata.totalRecords = records.length;
      
      // 使用map创建记录ID数组，便于查找
      const recordIds = records.map(record => record.id);
      const currentIndex = recordIds.indexOf(markdownMetadata.recordId);
      
      console.log('当前记录索引:', currentIndex);
      
      if (currentIndex === -1) {
        console.warn('找不到当前记录，使用第一条记录');
        // 如果找不到当前记录，使用第一条或最后一条记录
        const targetIndex = direction === 'prev' ? records.length - 1 : 0;
        const targetRecord = records[targetIndex];
        
        // 更新元数据
        markdownMetadata.recordId = targetRecord.id;
        markdownMetadata.recordIndex = targetIndex; // 更新当前索引
      } else {
        // 计算目标索引
        let targetIndex;
        if (direction === 'prev') {
          targetIndex = currentIndex > 0 ? currentIndex - 1 : records.length - 1;
        } else {
          targetIndex = currentIndex < records.length - 1 ? currentIndex + 1 : 0;
        }
        
        // 更新当前索引
        markdownMetadata.recordIndex = targetIndex;
        
        // 获取目标记录
        const targetRecord = records[targetIndex];
        
        // 更新元数据
        markdownMetadata.recordId = targetRecord.id;
      }
      
      // 尝试使用UI模块进行导航
      try {
        console.log('使用UI模块切换到目标记录');
        
        // 确保我们在正确的表格上
        if (bitable.ui && bitable.ui.switchToTable) {
          await bitable.ui.switchToTable(markdownMetadata.tableId);
          console.log('已切换到表格:', markdownMetadata.tableId);
        }
        
        // 等待一段时间让UI处理切换
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // 检查是否可以通过table选择记录
        if (table.selectRecord) {
          console.log('尝试选择记录:', markdownMetadata.recordId);
          await table.selectRecord(markdownMetadata.recordId);
          console.log('已选择记录');
        }
      } catch (uiError) {
        console.warn('使用UI模块切换失败:', uiError);
      }
      
      // 获取单元格内容
      await fetchCellContent();
      
      // 恢复滚动位置
      setTimeout(() => {
        window.scrollTo({
          top: scrollPosition,
          behavior: 'auto'
        });
      }, 50);
      
      ElMessage.success(`已${direction === 'prev' ? '向上' : '向下'}导航到新记录`);
    } catch (e) {
      console.error('记录导航失败:', e);
      ElMessage.error('导航失败: ' + e.message);
    }
  } catch (error) {
    console.error('导航处理失败:', error);
    ElMessage.error('导航失败: ' + error.message);
  }
};

// 复制内容
const copyContent = async (event) => {
  // 阻止事件冒泡
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  
  try {
    // 使用传统方法复制内容到剪贴板
    const textArea = document.createElement('textarea');
    textArea.value = markdownContent.value;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    if (successful) {
      ElMessage.success('内容已复制到剪贴板');
    } else {
      throw new Error('复制命令执行失败');
    }
  } catch (error) {
    console.error('复制失败:', error);
    // fallback: 提示用户手动复制
    ElMessage.warning('自动复制失败，请手动选择并复制内容');
  }
};

// 格式化Markdown
const formatMarkdown = (event) => {
  // 阻止事件冒泡
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  
  try {
    const formatted = markdownContent.value
      .replace(/\n{3,}/g, '\n\n') // 减少多余空行
      .replace(/[ \t]+\n/g, '\n') // 删除行尾空格
      .replace(/\n{2,}#/g, '\n\n#'); // 标题前保留一个空行
      
    markdownContent.value = formatted;
    ElMessage.success('格式化完成');
    refreshPreview();
  } catch (error) {
    console.error('格式化失败:', error);
    ElMessage.error('格式化失败: ' + error.message);
  }
};

// 手动刷新Markdown内容
const refreshMarkdown = async (event) => {
  // 阻止事件冒泡
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  
  try {
    // 尝试获取当前选择
    const selection = await bitable.base.getSelection();
    
    if (!selection || !selection.tableId || !selection.fieldId || !selection.recordId) {
      ElMessage.warning('当前没有选中单元格，请在飞书表格中选择一个单元格');
        return;
    }
    
    // 更新元数据
    markdownMetadata.tableId = selection.tableId;
    markdownMetadata.fieldId = selection.fieldId;
    markdownMetadata.recordId = selection.recordId;
    
    // 获取单元格内容
    await fetchCellContent();
    ElMessage.success('内容已从飞书表格刷新');
  } catch (error) {
    console.error('刷新内容失败:', error);
    ElMessage.error('刷新失败: ' + error.message);
  }
};

// 安全地解析事件对象
const safeParseEvent = (event) => {
  if (!event) return null;
  
  try {
    // 检查事件是否有data属性
    if (event.data) {
      // 如果data是字符串，尝试解析JSON
      if (typeof event.data === 'string') {
        try {
          return JSON.parse(event.data);
        } catch (e) {
          return { type: 'unknown', data: event.data };
        }
      }
      // 如果data是对象，直接返回
      return event.data;
    }
    
    return null;
  } catch (e) {
    console.error('解析事件对象失败:', e);
    return null;
  }
};

// 获取单元格内容
const fetchCellContent = async () => {
  try {
    const { tableId, fieldId, recordId } = markdownMetadata;
    
    if (!tableId || !fieldId || !recordId) {
      console.log('缺少必要的单元格标识信息');
      return;
    }
    
    // 创建单元格唯一标识
    const cellIdentifier = `${tableId}-${fieldId}-${recordId}`;
    
    // 检查是否正在处理或者已经处理过相同的单元格
    if (isProcessingCell.value) {
      console.log('正在处理另一个单元格内容，请稍后再试');
      return;
    }
    
    if (cellIdentifier === lastProcessedCell.value) {
      console.log('已经处理过该单元格，跳过重复处理');
      return;
    }
    
    // 设置处理状态
    isProcessingCell.value = true;
    lastProcessedCell.value = cellIdentifier;
    
    console.log(`尝试获取单元格内容: 表格ID=${tableId}, 字段ID=${fieldId}, 记录ID=${recordId}`);
    
    // 获取表格
    let table;
    try {
      table = await bitable.base.getTableById(tableId);
      if (!table) {
        throw new Error('无法获取表格对象');
      }
    } catch (e) {
      console.error('获取表格失败:', e);
      isProcessingCell.value = false; // 重置处理状态
      return;
    }
    
    // 更新行号信息（每次都更新以确保准确性）
    try {
      // 获取当前视图
      const selection = await bitable.base.getSelection();
      if (selection && selection.viewId) {
        const view = await table.getViewById(selection.viewId);
        const visibleRecords = await view.getVisibleRecordIdList();
        
        if (visibleRecords && visibleRecords.length > 0) {
          markdownMetadata.totalRecords = visibleRecords.length;
          const currentIndex = visibleRecords.indexOf(recordId);
          if (currentIndex !== -1) {
            markdownMetadata.recordIndex = currentIndex;
            console.log(`更新行号信息: ${currentIndex + 1}/${visibleRecords.length}`);
          } else {
            console.warn('在视图中找不到当前记录，使用全表记录');
            // 如果在视图中找不到，尝试使用全表记录
            const records = await table.getRecordList();
            if (records && records.length > 0) {
              markdownMetadata.totalRecords = records.length;
              const recordIds = records.map(record => record.id);
              const currentIndex = recordIds.indexOf(recordId);
              if (currentIndex !== -1) {
                markdownMetadata.recordIndex = currentIndex;
                console.log(`使用全表行号信息: ${currentIndex + 1}/${records.length}`);
              }
            }
          }
        }
      } else {
        // 如果没有视图信息，使用所有记录
        const records = await table.getRecordList();
        if (records && records.length > 0) {
          markdownMetadata.totalRecords = records.length;
          const recordIds = records.map(record => record.id);
          const currentIndex = recordIds.indexOf(recordId);
          if (currentIndex !== -1) {
            markdownMetadata.recordIndex = currentIndex;
            console.log(`使用全表行号信息: ${currentIndex + 1}/${records.length}`);
          }
        }
      }
    } catch (e) {
      console.warn('更新行号信息失败:', e);
      // 如果更新失败，重置行号信息
      markdownMetadata.recordIndex = -1;
      markdownMetadata.totalRecords = 0;
    }
    
    // 获取表格名称
    try {
      markdownMetadata.tableName = await table.getName();
      console.log(`表格名称: ${markdownMetadata.tableName}`);
    } catch (e) {
      console.warn('获取表格名称失败:', e);
      markdownMetadata.tableName = '未知表格';
    }
    
    // 获取字段信息
    try {
      const fields = await table.getFieldMetaList();
      const field = fields.find(f => f.id === fieldId);
      markdownMetadata.fieldName = field ? field.name : fieldId;
      console.log(`字段名称: ${markdownMetadata.fieldName}`);
    } catch (e) {
      console.warn('获取字段信息失败:', e);
      markdownMetadata.fieldName = '未知字段';
    }
    
    // 获取单元格内容
    let cellValue;
    try {
      console.log('正在获取单元格值...');
      cellValue = await table.getCellValue(fieldId, recordId);
      console.log('获取到单元格值:', cellValue);
    } catch (e) {
      console.error('获取单元格值失败:', e);
      isProcessingCell.value = false; // 重置处理状态
      return;
    }
    
    // 处理不同类型的单元格值，尝试提取文本内容
    let textContent = '';
    
    if (cellValue === null || cellValue === undefined) {
      console.log('单元格值为空');
      textContent = '';
    } else if (typeof cellValue === 'string') {
      // 直接是字符串
      textContent = cellValue;
    } else if (Array.isArray(cellValue)) {
      // 数组类型处理 - 飞书多行文本常见格式
      if (cellValue.length > 0) {
        // 处理常见的飞书文本数组格式
        if (cellValue[0] && typeof cellValue[0] === 'object') {
          if (cellValue[0].text) {
            // 文本类型 [{type: 'text', text: '内容'}]
            textContent = cellValue.map(item => item.text || '').join('');
          } else if (cellValue[0].content) {
            // 有些格式可能是 [{type: 'paragraph', content: [...]}]
            textContent = JSON.stringify(cellValue, null, 2);
          } else {
            // 其他对象数组
            textContent = JSON.stringify(cellValue, null, 2);
          }
        } else {
          // 简单值数组
          textContent = cellValue.join('\n');
        }
      }
    } else if (typeof cellValue === 'object' && cellValue !== null) {
      // 对象类型
      if (cellValue.text) {
        // 直接包含text属性的对象
        textContent = cellValue.text;
      } else if (cellValue.value) {
        // 包含value属性的对象
        textContent = typeof cellValue.value === 'string' 
          ? cellValue.value 
          : JSON.stringify(cellValue.value, null, 2);
      } else {
        // 其他对象
        textContent = JSON.stringify(cellValue, null, 2);
      }
    } else {
      // 其他类型，转为字符串
      textContent = String(cellValue);
    }
    
    console.log(`提取的文本内容长度: ${textContent.length}`);
    
    // 设置Markdown内容
    markdownContent.value = textContent;
    hasContent.value = Boolean(textContent.trim());

    // 使用防抖函数为refreshPreview和autoSave，避免频繁更新
    if (textContent.trim()) {
      // 对于autoSave和refreshPreview分开调用，防止触发多次提示
      autoSave();
      // 直接调用refreshPreview的内部逻辑，而不是调用refreshPreview函数
      // 这样可以避免触发"内容已刷新"提示
      try {
        const html = md.render(markdownContent.value);
        renderedHTML.value = html;
        // 不显示任何提示
      } catch (error) {
        console.error('渲染失败:', error);
        renderedHTML.value = '<div class="error">渲染失败，请检查Markdown语法</div>';
        ElMessage.error('渲染失败: ' + error.message);
      }
    }
    
    // 添加高度调整
    setTimeout(adjustHeight, 100);
    
    console.log('成功获取并设置Markdown内容');
  } catch (error) {
    console.error('获取Markdown内容失败:', error);
    throw error;
  } finally {
    // 无论成功失败，都重置处理状态
    setTimeout(() => {
      isProcessingCell.value = false;
    }, 100); // 短暂延迟，防止立即处理下一个请求
  }
};

// 加载已保存的内容
const loadSavedContent = () => {
  try {
    const savedContent = localStorage.getItem('markdown_content');
    if (savedContent && savedContent.trim()) {
      markdownContent.value = savedContent;
      hasContent.value = true;
      refreshPreview();
    }
  } catch (e) {
    console.warn('加载本地存储内容失败:', e);
  }
};

// 模式切换处理函数
const handleModeChange = async (mode) => {
  // 只有在用户明确点击导出模式标签时才切换表格
  if (mode === 'export' && userHasExportPermission.value) {
    activeMode.value = 'export';
    
    // 如果是首次切换到导出模式，加载表格列表但不自动选择第一个表格
    if (isFirstLoad.value) {
      try {
        const tableList = await bitable.base.getTableMetaList();
        tables.value = tableList;
        isFirstLoad.value = false;
      } catch (error) {
        console.error('加载数据表失败:', error);
        ElMessage.error('加载数据表失败');
      }
    }
    // 如果用户已经选择了表格，则切换到该表格
    else if (exportOptions.tableId && bitable.ui && bitable.ui.switchToTable) {
      console.log('切换到导出模式选择的表格:', exportOptions.tableId);
      try {
        await bitable.ui.switchToTable(exportOptions.tableId);
        ElMessage.success('已切换到选择的表格');
      } catch (switchError) {
        console.warn('切换表格失败:', switchError);
      }
    }
  } else if (mode === 'preview') {
    activeMode.value = 'preview';
  }
};

// 加载所有数据表
const loadTables = async () => {
  try {
    const tableList = await bitable.base.getTableMetaList();
    tables.value = tableList;
    
    // 只有在不是首次加载时才自动选择第一个表格
    if (!isFirstLoad.value && tableList.length > 0) {
      exportOptions.tableId = tableList[0].id;
      await loadTableViews();
    }
    
    // 标记为非首次加载
    isFirstLoad.value = false;
  } catch (error) {
    console.error('加载数据表失败:', error);
    ElMessage.error('加载数据表失败');
  }
};

// 加载数据表视图
const loadTableViews = async () => {
  if (!exportOptions.tableId) return;
  
  try {
    // 在批量导出模式下，当用户切换数据表时，自动切换飞书表格
    if (activeMode.value === 'export' && bitable.ui && bitable.ui.switchToTable) {
      console.log('批量导出模式：切换到用户选择的表格:', exportOptions.tableId);
      try {
        await bitable.ui.switchToTable(exportOptions.tableId);
        ElMessage.success('已切换到选择的表格');
      } catch (switchError) {
        console.warn('切换表格失败:', switchError);
      }
    }
    
    const table = await bitable.base.getTableById(exportOptions.tableId);
    const viewList = await table.getViewMetaList();
    views.value = viewList;
    
    // 默认选择第一个视图
    if (viewList.length > 0) {
      exportOptions.viewId = viewList[0].id;
      await loadTableFields();
    } else {
      views.value = [];
      exportOptions.viewId = '';
      textFields.value = [];
      exportOptions.fieldId = '';
    }
  } catch (error) {
    console.error('加载视图失败:', error);
    ElMessage.error('加载视图失败');
  }
};

// 加载表格字段
const loadTableFields = async () => {
  if (!exportOptions.tableId || !exportOptions.viewId) return;
  
  try {
    const table = await bitable.base.getTableById(exportOptions.tableId);
    const view = await table.getViewById(exportOptions.viewId);
    const fields = await view.getFieldMetaList();
    
    // 过滤出文本类型字段（飞书API中type=1表示文本字段）
    textFields.value = fields.filter(field => field.type === 1);
    
    // 默认选择第一个文本字段
    if (textFields.value.length > 0) {
      exportOptions.fieldId = textFields.value[0].id;
    } else {
      exportOptions.fieldId = '';
    }
  } catch (error) {
    console.error('加载字段失败:', error);
    ElMessage.error('加载字段失败');
  }
};

// 批量导出功能
const exportContent = async () => {
  if (!isExportReady.value) {
    ElMessage.warning('请先选择表格、视图和字段');
    return;
  }
  
  isExporting.value = true;
  
  try {
    const { tableId, viewId, fieldId, type } = exportOptions;
    
    // 获取表格
    const table = await bitable.base.getTableById(tableId);
    if (!table) {
      throw new Error('无法获取表格');
    }
    
    // 获取表格名称
    const tableName = await table.getName();
    
    // 获取字段信息
    const fields = await table.getFieldMetaList();
    const field = fields.find(f => f.id === fieldId);
    const fieldName = field ? field.name : fieldId;
    
    // 获取记录列表
    const records = await table.getRecordList();
    if (!records || records.length === 0) {
      throw new Error('表格中没有记录');
    }
    
    // 收集字段所有数据
    const contentList = [];
    
    for (const record of records) {
      try {
        // 获取单元格值
        const cellValue = await table.getCellValue(fieldId, record.id);
        
        // 处理单元格值
        let content = '';
        
        if (cellValue === null || cellValue === undefined) {
          continue; // 跳过空值
        } else if (typeof cellValue === 'string') {
          content = cellValue;
        } else if (Array.isArray(cellValue) && cellValue.length > 0) {
          if (cellValue[0] && cellValue[0].text) {
            content = cellValue.map(item => item.text || '').join('');
          } else {
            content = JSON.stringify(cellValue, null, 2);
          }
        } else if (typeof cellValue === 'object' && cellValue !== null) {
          if (cellValue.text) {
            content = cellValue.text;
          } else {
            content = JSON.stringify(cellValue, null, 2);
          }
        } else {
          content = String(cellValue);
        }
        
        // 如果内容非空，添加到列表
        if (content.trim()) {
          // 尝试获取记录的标题字段（如果有）
          let recordTitle = '';
          try {
            // 找到第一个文本字段作为标题源
            const titleField = fields.find(f => f.type === 1 && f.id !== fieldId);
            if (titleField) {
              const titleValue = await table.getCellValue(titleField.id, record.id);
              if (titleValue) {
                if (typeof titleValue === 'string') {
                  recordTitle = titleValue;
                } else if (Array.isArray(titleValue) && titleValue.length > 0 && titleValue[0].text) {
                  recordTitle = titleValue[0].text;
                }
              }
            }
          } catch (e) {
            console.warn('获取记录标题失败:', e);
          }
          
          contentList.push({
            id: record.id,
            title: recordTitle || `记录 ${contentList.length + 1}`,
            content: content
          });
        }
      } catch (e) {
        console.warn(`处理记录 ${record.id} 失败:`, e);
      }
    }
    
    // 如果没有内容，提示用户
    if (contentList.length === 0) {
      ElMessage.warning('没有找到非空内容');
      return;
    }
    
    // 生成导出内容
    let exportContent = `# ${tableName} - ${fieldName} 导出内容\n\n导出时间: ${new Date().toLocaleString()}\n总计记录: ${contentList.length} 条\n\n---\n\n`;
    
    contentList.forEach((item, index) => {
      exportContent += `## ${index + 1}. ${item.title}\n\n${item.content}\n\n---\n\n`;
    });
    
    if (type === 'doc') {
      // 导出到飞书文档 - 使用传统复制方法
      try {
        const textArea = document.createElement('textarea');
        textArea.value = exportContent;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          ElMessage.success(`已导出 ${contentList.length} 条记录内容到剪贴板，请在飞书文档中粘贴`);
        } else {
          throw new Error('复制命令执行失败');
        }
      } catch (error) {
        console.error('复制到剪贴板失败:', error);
        // fallback: 下载文件
        downloadAsFile(exportContent, `${tableName}-${fieldName}-导出内容.txt`);
        ElMessage.warning(`复制失败，已下载为文件。共导出 ${contentList.length} 条记录`);
      }
    } else {
      // 导出为TXT文本 - 直接下载文件
      try {
        downloadAsFile(exportContent, `${tableName}-${fieldName}-导出内容.txt`);
        ElMessage.success(`已导出 ${contentList.length} 条记录为TXT文件`);
      } catch (error) {
        console.error('下载文件失败:', error);
        ElMessage.error('下载文件失败: ' + error.message);
      }
    }
  } catch (error) {
    console.error('导出失败:', error);
    ElMessage.error('导出失败: ' + error.message);
  } finally {
    isExporting.value = false;
  }
};

// 辅助函数：下载文件
const downloadAsFile = (content, filename) => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// 动态调整高度 - 改进版
const adjustHeight = () => {
  const textarea = markdownEditor.value;
  if (!textarea) return;
  
  // 重置高度以获取实际内容高度
  textarea.style.height = '400px'; // 先设为最小高度
  
  // 计算真实内容高度
  const scrollHeight = textarea.scrollHeight;
  
  // 直接应用内容高度，无需限制最大高度
  textarea.style.height = `${scrollHeight}px`;
  
  console.log("调整高度为:", scrollHeight);
};

// 组件挂载时
onMounted(() => {
  console.log('Markdown组件挂载');
  
  try {
    // 加载已保存的内容
    loadSavedContent();
    
    // 初始渲染
    refreshPreview();
    
    // 设置事件监听
    setupEventListeners();
    
    // 加载导出功能所需数据，但不自动选择表格
    loadTables();
    
    // 如果有选择，尝试获取当前选择内容
    bitable.base.getSelection().then(selection => {
      if (selection && selection.tableId && selection.fieldId && selection.recordId) {
        markdownMetadata.tableId = selection.tableId;
        markdownMetadata.fieldId = selection.fieldId;
        markdownMetadata.recordId = selection.recordId;
        
        fetchCellContent();
      }
    }).catch(error => {
      console.warn('获取当前选择失败:', error);
    });
    
    // 设置编辑器自动调整高度
    if (markdownEditor.value) {
      markdownEditor.value.addEventListener('input', adjustHeight);
      // 初始调整一次高度
      setTimeout(adjustHeight, 100);
    }
    
  } catch (e) {
    console.error('组件挂载处理失败:', e);
  }
});

// 设置事件监听
const setupEventListeners = () => {
  try {
    // 创建防抖版本的获取单元格内容函数
    const debouncedFetchContent = debounce(() => {
      fetchCellContent();
    }, 200);
    
    // 记录上一次选择的单元格
    let lastSelection = { tableId: '', fieldId: '', recordId: '' };
    
    // 设置表格选择变化监听
    bitable.base.onSelectionChange(event => {
      if (event && event.data) {
        const { tableId, fieldId, recordId } = event.data;
        
        if (!tableId || !fieldId || !recordId) {
          console.log('选择事件缺少必要信息，忽略');
          return;
        }
        
        console.log('单元格选择变化:', { tableId, fieldId, recordId });
        
        // 检查是否与上一次选择完全相同，避免重复处理
        if (tableId === lastSelection.tableId && 
            fieldId === lastSelection.fieldId && 
            recordId === lastSelection.recordId) {
          console.log('选择未变化，忽略重复事件');
          return;
        }
        
        // 记录本次选择
        lastSelection = { tableId, fieldId, recordId };
        
        // 检查是否与当前处理的单元格相同
        if (tableId === markdownMetadata.tableId && 
            fieldId === markdownMetadata.fieldId && 
            recordId === markdownMetadata.recordId &&
            isProcessingCell.value) {
          console.log('已在处理相同单元格，忽略事件');
          return;
        }
        
        // 更新元数据
        markdownMetadata.tableId = tableId;
        markdownMetadata.fieldId = fieldId;
        markdownMetadata.recordId = recordId;
        
        // 使用防抖版本获取新选择的单元格内容
        debouncedFetchContent();
      }
    });
    
    console.log('已设置表格选择变化监听器');
  } catch (e) {
    console.error('设置事件监听器失败:', e);
  }
};

// 组件卸载前清理
onUnmounted(() => {
  console.log('Markdown组件卸载');
  
  // 移除编辑器事件监听
  if (markdownEditor.value) {
    markdownEditor.value.removeEventListener('input', adjustHeight);
  }
  
  // 对于使用SDK的事件监听器，不需要手动移除
  // 飞书SDK会自动处理组件卸载时的事件清理
});

// 添加onActivated钩子函数
onActivated(() => {
  console.log('Markdown组件被激活');
  
  // 确保总是显示预览模式，而不是导出模式
  if (activeMode.value !== 'preview') {
    console.log('从导出模式切换到预览模式');
    activeMode.value = 'preview';
  }
  
  // 尝试获取当前选择内容
  bitable.base.getSelection().then(selection => {
    if (selection && selection.tableId && selection.fieldId && selection.recordId) {
      markdownMetadata.tableId = selection.tableId;
      markdownMetadata.fieldId = selection.fieldId;
      markdownMetadata.recordId = selection.recordId;
      
      fetchCellContent();
    }
  }).catch(error => {
    console.warn('获取当前选择失败:', error);
  });
});
</script>

<style scoped>
.markdown-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  max-width: 100%;
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
}

/* 模式选择区域样式 */
.mode-select-area {
  margin-bottom: 10px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #303133;
  line-height: 22px;
}

.tab-selector {
  display: flex;
  border-bottom: 2px solid #e4e7ed;
  margin-bottom: 0px;
}

.tab-option {
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  text-align: center;
  color: #606266;
  position: relative;
  transition: all 0.3s;
  flex: 1;
}

.tab-option.active {
  color: #3370FF;
  font-weight: 500;
}

.tab-option.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: #3370FF;
}

.tab-option.disabled {
  cursor: not-allowed;
  color: #c0c4cc;
}

.locked-option {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

/* 内容模式容器 - 移除卡片式设计 */
.content-mode-container {
  padding: 0;
}

.intro-section {
  margin-bottom: 20px;
  color: #606266;
  font-size: 13px;
  line-height: 20px;
  background-color: #f5f7fa;
  padding: 12px 16px;
  border-radius: 4px;
}

/* 工具栏 */
.toolbar {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 5px;
  margin-top: 0;
  position: relative;
  z-index: 2;
  background-color: transparent;
  padding: 3px 0;
  border-radius: 0;
  box-shadow: none;
}

.navigation-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}

.current-cell {
  margin-left: 0;
  font-size: 12px;
  color: #606266;
  max-width: 500px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 18px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.record-info {
  color: #3370FF;
  font-weight: 500;
}

.nav-button {
  height: 32px;
  padding: 0 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background-color: #fff;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: normal;
  line-height: 20px;
  transition: all 0.2s;
  color: #606266;
}

.nav-button:hover {
  background-color: #f0f2f5;
  border-color: #dcdfe6;
}

.action-button {
  color: #303133;
}

button:disabled {
  background-color: #f5f7fa;
  border-color: #e4e7ed;
  color: #c0c4cc;
  cursor: not-allowed;
}

/* Markdown内容区 */
.markdown-content {
  border: 1px solid #dcdfe6;
  margin-bottom: 16px;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #dcdfe6;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.content-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  line-height: 22px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.word-count {
  font-size: 12px;
  color: #909399;
  line-height: 18px;
}

.header-btn {
  width: 28px;
  height: 28px;
  min-width: unset;
  padding: 0;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fff;
  color: #606266;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.header-btn:hover {
  background-color: #f2f6fc;
  color: #409eff;
  border-color: #c6e2ff;
}

.header-btn:disabled {
  cursor: not-allowed;
  background-color: #f5f7fa;
  color: #c0c4cc;
  border-color: #e4e7ed;
}

.header-btn .tooltip {
  display: none;
  position: absolute;
  background: rgba(0, 0, 0, 0.75);
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  bottom: -24px;
  z-index: 10;
}

.header-btn:hover .tooltip {
  display: block;
}

.header-btn svg {
  width: 16px;
  height: 16px;
}

/* 编辑区容器 */
.editor-container {
  width: 100%;
  position: relative;
  box-sizing: border-box;
}

/* 文本区域样式 */
.auto-expand-textarea {
  width: 100%;
  min-height: 400px;
  padding: 12px 16px;
  border: none;
  resize: none;
  font-family: "Source Code Pro", "Menlo", monospace;
  font-size: 13px;
  line-height: 20px;
  color: #2c3e50;
  outline: none;
  overflow: hidden;
  box-sizing: border-box;
  display: block;
}

/* 导出选项区域样式 */
.export-options {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.option-row label {
  width: 70px;
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 500;
  color: #606266;
  line-height: 22px;
}

select {
  flex: 1;
  height: 36px;
  padding: 0 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background-color: #fff;
  font-size: 14px;
  color: #606266;
}

/* 统一下拉框宽度 */
.uniform-select {
  width: 200px;
  flex: none;
}

select:disabled {
  background-color: #f5f7fa;
  cursor: not-allowed;
}

/* 统一下拉框宽度 */
.uniform-select {
  width: 200px;
  flex: none;
}

.radio-options {
  display: flex;
  gap: 16px;
}

.radio-options label {
  display: flex;
  align-items: center;
  gap: 8px;
  width: auto;
  cursor: pointer;
  font-weight: 400;
}

.radio-label-with-tooltip {
  position: relative;
}

.radio-text {
  position: relative;
}

.radio-tooltip {
  display: none !important;
  position: absolute;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 5px;
  z-index: 1000;
  pointer-events: none;
}

.radio-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 4px solid transparent;
  border-top-color: rgba(0, 0, 0, 0.8);
}

.radio-label-with-tooltip:hover .radio-tooltip {
  display: block !important;
}

.export-actions {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.export-button {
  height: 36px;
  background-color: #2E6BE6; /* 飞书品牌蓝 */
  color: white;
  border: none;
  padding: 0 20px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 4px;
  cursor: pointer;
  line-height: 22px;
}

.export-button:hover:not(:disabled) {
  background-color: #5085ea;
  color: white;
}

.export-button:disabled {
  background-color: #a0cfff;
  cursor: not-allowed;
  color: white;
}

/* 响应式适配 */
@media (max-width: 358px) {
  .toolbar {
  flex-direction: column;
    align-items: flex-start;
  }
  
  .navigation-buttons, .main-actions {
    width: 100%;
  }
  
  .md-toolbar {
    overflow-x: auto;
    justify-content: flex-start;
  }
  
  .option-row {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .option-row label {
  width: 100%;
    margin-bottom: 6px;
  }
  
  select, .radio-options, .uniform-select {
    width: 100%;
  }
}

@media (min-width: 600px) {
  .markdown-container {
    padding: 20px;
  }
  
  .content-mode-container {
    padding: 12px 0;
  }
  
  .auto-expand-textarea {
    min-height: 250px;
  }
}

/* 错误状态样式 */
.error {
  color: #f56c6c;
  padding: 10px;
  border: 1px solid #fbc4c4;
  border-radius: 4px;
  background-color: #fef0f0;
}

/* 通用按钮样式 */
button {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background-color: #fff;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  outline: none;
}

button:disabled {
  background-color: #f5f7fa;
  border-color: #e4e7ed;
  color: #c0c4cc;
  cursor: not-allowed;
}

/* 导航按钮样式 */
.nav-button {
  height: 32px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: normal;
  line-height: 20px;
  color: #606266;
}

.nav-button:hover {
  background-color: #f0f2f5;
  border-color: #dcdfe6;
}

/* 编辑区标题按钮样式 */
.header-btn {
  width: 28px;
  height: 28px;
  min-width: unset;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #606266;
}

.header-btn:hover {
  background-color: #f2f6fc;
  color: #409eff;
  border-color: #c6e2ff;
}

.header-btn svg {
  width: 16px;
  height: 16px;
}

/* 导航区域固定样式 */
.navigation-area {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 999;
  display: flex;
    flex-direction: column;
  gap: 8px;
}

.nav-button-wrapper {
  position: relative;
}

.float-nav-button {
  height: 40px;
  width: 40px;
  border-radius: 50%;
  background-color: #3370FF;
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: all 0.2s;
}

.float-nav-button:hover {
  background-color: #2860e0;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

.float-nav-button svg {
  width: 20px;
  height: 20px;
}

/* 导航按钮tooltip样式 */
.nav-tooltip {
  display: none;
  position: absolute;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  right: 50px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1001;
  pointer-events: none;
  transition: opacity 0.1s ease-in-out;
}

.nav-tooltip::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 100%;
  transform: translateY(-50%);
  border: 4px solid transparent;
  border-left-color: rgba(0, 0, 0, 0.8);
}

.nav-button-wrapper:hover .nav-tooltip {
  display: block;
}

/* 响应式适配 */
@media (max-width: 600px) {
  .navigation-area {
    bottom: 10px;
    right: 10px;
  }
  
  .float-nav-button {
    height: 36px;
    width: 36px;
  }
}
</style>

<style>
/* 全局样式，用于Markdown预览渲染 */
.markdown-preview h1 {
  font-size: 20px;
  font-weight: 600;
  margin-top: 24px;
  margin-bottom: 16px;
  line-height: 28px;
}

.markdown-preview h2 {
  font-size: 18px;
  font-weight: 600;
  margin-top: 20px;
  margin-bottom: 14px;
  line-height: 26px;
}

.markdown-preview h3 {
  font-size: 16px;
  font-weight: 600;
  margin-top: 18px;
  margin-bottom: 12px;
  line-height: 24px;
}

.markdown-preview h4,
.markdown-preview h5,
.markdown-preview h6 {
  font-size: 14px;
  font-weight: 600;
  margin-top: 16px;
  margin-bottom: 10px;
  line-height: 22px;
}

.markdown-preview p {
  margin-bottom: 16px;
  line-height: 22px;
  font-size: 14px;
}

.markdown-preview ul,
.markdown-preview ol {
  padding-left: 24px;
  margin-bottom: 16px;
  line-height: 22px;
  font-size: 14px;
}

.markdown-preview blockquote {
  padding: 0 16px;
  color: #6a737d;
  border-left: 4px solid #dfe2e5;
  margin: 0 0 16px 0;
  font-size: 14px;
  line-height: 22px;
}

.markdown-preview pre {
  padding: 16px;
  overflow: auto;
  font-size: 13px;
  line-height: 20px;
  background-color: #f6f8fa;
  border-radius: 4px;
  margin-bottom: 16px;
  font-family: "Source Code Pro", "Menlo", monospace;
}

.markdown-preview code {
  padding: 2px 4px;
  font-size: 90%;
  color: #c7254e;
  background-color: #f9f2f4;
  border-radius: 4px;
  font-family: "Source Code Pro", "Menlo", monospace;
}

.markdown-preview table {
  border-collapse: collapse;
  margin: 0 0 16px 0;
  width: 100%;
  font-size: 14px;
}

.markdown-preview table th,
.markdown-preview table td {
  padding: 6px 13px;
  border: 1px solid #dfe2e5;
}

.markdown-preview img {
  max-width: 100%;
  margin: 8px 0;
  border-radius: 4px;
}
</style> 