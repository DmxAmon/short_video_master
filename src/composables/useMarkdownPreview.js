/**
 * Markdown预览功能的可复用逻辑钩子
 * 提供Markdown内容渲染、整列数据获取和复制功能
 */
import { ref, reactive, computed } from 'vue';
import { ElMessage } from 'element-plus';
import MarkdownIt from 'markdown-it';

export function useMarkdownPreview() {
  // 初始化markdown-it实例
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true
  });
  
  // Markdown显示模式: 'cell'(单元格) 或 'column'(整列)
  const markdownMode = ref('cell');
  
  // 当前的Markdown内容
  const markdownContent = ref('');
  
  // Markdown元数据信息
  const markdownMetadata = reactive({
    tableId: '',
    tableName: '',
    fieldId: '',
    fieldName: '',
    recordId: '',
    column: [] // 整列数据
  });
  
  // 渲染后的Markdown内容
  const renderedMarkdown = computed(() => {
    if (!markdownContent.value) return '';
    try {
      return md.render(markdownContent.value);
    } catch (error) {
      console.error('Markdown渲染错误:', error);
      return `<div class="markdown-error">Markdown渲染失败: ${error.message}</div>`;
    }
  });
  
  /**
   * 设置单元格Markdown内容
   * @param {string} content Markdown文本内容
   * @param {Object} metadata 单元格元数据
   */
  const setMarkdownContent = (content, metadata = {}) => {
    markdownContent.value = content || '';
    
    // 更新元数据
    if (metadata) {
      Object.keys(metadata).forEach(key => {
        if (key !== 'column' && metadata[key] !== undefined) {
          markdownMetadata[key] = metadata[key];
        }
      });
    }
  };
  
  /**
   * 设置整列Markdown数据
   * @param {Array} columnData 整列数据数组
   */
  const setColumnData = (columnData) => {
    if (Array.isArray(columnData)) {
      markdownMetadata.column = columnData;
      
      // 如果是整列模式且有多行数据，更新显示内容
      if (markdownMode.value === 'column' && columnData.length > 1) {
        markdownContent.value = columnData.join('\n\n---\n\n');
      }
    }
  };
  
  /**
   * 切换Markdown显示模式
   * @param {string} mode 'cell' 或 'column'
   * @param {boolean} hasPermission 是否有整列查看权限
   */
  const switchMode = (mode, hasPermission = true) => {
    if (mode === 'column' && !hasPermission) {
      ElMessage.warning('整列模式需要会员权限');
      return;
    }
    
    markdownMode.value = mode;
    
    // 如果切换到整列模式，且有整列数据，则更新显示内容
    if (mode === 'column' && markdownMetadata.column && markdownMetadata.column.length > 1) {
      markdownContent.value = markdownMetadata.column.join('\n\n---\n\n');
    } else if (mode === 'cell' && markdownMetadata.column && markdownMetadata.column.length > 0) {
      // 切换回单元格模式，显示第一个单元格的内容
      const cellData = markdownMetadata.column.find(item => item.recordId === markdownMetadata.recordId);
      if (cellData && cellData.content) {
        markdownContent.value = cellData.content;
      }
    }
  };
  
  /**
   * 复制Markdown内容到剪贴板
   */
  const copyMarkdownContent = async () => {
    if (!markdownContent.value) {
      ElMessage.warning('没有可复制的内容');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(markdownContent.value);
      ElMessage.success('内容已复制到剪贴板');
    } catch (error) {
      console.error('复制失败:', error);
      ElMessage.error('复制失败，请手动选择并复制');
    }
  };
  
  /**
   * 复制整列Markdown内容到剪贴板
   */
  const copyColumnContent = async () => {
    if (!markdownMetadata.column || markdownMetadata.column.length === 0) {
      ElMessage.warning('没有整列数据可复制');
      return;
    }
    
    try {
      const columnText = markdownMetadata.column.join('\n\n---\n\n');
      await navigator.clipboard.writeText(columnText);
      ElMessage.success('整列内容已复制到剪贴板');
    } catch (error) {
      console.error('复制失败:', error);
      ElMessage.error('复制失败，请手动选择并复制');
    }
  };
  
  /**
   * 处理表格单元格选择事件
   * @param {Object} eventData 选择事件数据
   * @param {Function} getCellValue 获取单元格值的函数
   * @param {Function} getTable 获取表格的函数
   * @param {boolean} hasColumnPermission 是否有整列查看权限
   */
  const handleCellSelection = async (eventData, getCellValue, getTable, hasColumnPermission = false) => {
    try {
      // 获取选中的单元格内容
      const { tableId, fieldId, recordId } = eventData;
      
      if (!tableId || !fieldId || !recordId) {
        console.log('未选中有效单元格');
        return;
      }
      
      // 更新元数据
      markdownMetadata.tableId = tableId;
      markdownMetadata.fieldId = fieldId;
      markdownMetadata.recordId = recordId;
      
      // 获取表格和字段名
      const table = await getTable(tableId);
      const view = await table.getActiveView();
      markdownMetadata.tableName = await table.getName();
      
      // 获取字段信息
      const fields = await view.getFieldMetaList();
      const field = fields.find(f => f.id === fieldId);
      markdownMetadata.fieldName = field ? field.name : fieldId;
      
      // 获取单元格内容
      const cellValue = await getCellValue(fieldId, recordId, table);
      
      // 处理不同类型的单元格值，尝试提取文本内容
      let textContent = '';
      if (cellValue === null || cellValue === undefined) {
        textContent = '';
      } else if (typeof cellValue === 'string') {
        textContent = cellValue;
      } else if (Array.isArray(cellValue) && cellValue.length > 0) {
        if (cellValue[0].text) {
          textContent = cellValue[0].text;
        } else {
          textContent = JSON.stringify(cellValue);
        }
      } else if (typeof cellValue === 'object') {
        textContent = JSON.stringify(cellValue, null, 2);
      } else {
        textContent = String(cellValue);
      }
      
      // 设置Markdown内容
      markdownContent.value = textContent;
      
      // 如果是整列模式且用户有权限，则获取整列数据
      if (markdownMode.value === 'column' && hasColumnPermission) {
        await loadColumnData(table, fieldId, recordId, getCellValue);
      }
      
    } catch (error) {
      console.error('获取Markdown内容失败:', error);
      ElMessage.error('获取内容失败: ' + error.message);
    }
  };
  
  /**
   * 加载整列数据
   * @param {Object} table 表格对象
   * @param {string} fieldId 字段ID
   * @param {string} recordId 记录ID
   * @param {Function} getCellValue 获取单元格值的函数
   */
  const loadColumnData = async (table, fieldId, recordId, getCellValue) => {
    // 获取记录列表
    const records = await table.getRecordList();
    
    // 存储整列数据
    markdownMetadata.column = [];
    
    // 限制获取的记录数量，避免性能问题
    const maxRecords = 100;
    const recordsToProcess = records.slice(0, maxRecords);
    
    // 获取每个记录的对应字段值
    for (const record of recordsToProcess) {
      const value = await getCellValue(fieldId, record.id, table);
      let content = '';
      
      // 处理不同类型的单元格值
      if (value === null || value === undefined) {
        content = '';
      } else if (typeof value === 'string') {
        content = value;
      } else if (Array.isArray(value) && value.length > 0 && value[0].text) {
        content = value[0].text;
      } else if (typeof value === 'object') {
        content = JSON.stringify(value, null, 2);
      } else {
        content = String(value);
      }
      
      // 如果有内容则添加到列数组
      if (content.trim()) {
        markdownMetadata.column.push(content);
      }
    }
    
    // 如果有多条记录，合并显示
    if (markdownMetadata.column.length > 1) {
      markdownContent.value = markdownMetadata.column.join('\n\n---\n\n');
    }
    
    if (markdownMetadata.column.length >= maxRecords) {
      ElMessage.warning(`已加载最大记录数(${maxRecords})，如需查看更多请联系管理员`);
    }
  };
  
  /**
   * 重置Markdown预览状态
   */
  const resetMarkdown = () => {
    markdownContent.value = '';
    markdownMode.value = 'cell';
    Object.keys(markdownMetadata).forEach(key => {
      if (key === 'column') {
        markdownMetadata[key] = [];
      } else {
        markdownMetadata[key] = '';
      }
    });
  };
  
  return {
    markdownMode,
    markdownContent,
    markdownMetadata,
    renderedMarkdown,
    setMarkdownContent,
    setColumnData,
    switchMode,
    copyMarkdownContent,
    copyColumnContent,
    handleCellSelection,
    resetMarkdown
  };
} 