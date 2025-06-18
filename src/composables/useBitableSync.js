import { ref, reactive, computed } from 'vue';
import { 
  getBitableTables, 
  getBitableFields, 
  syncDataToBitable,
  getFieldMapping,
  saveFieldMapping
} from '../api/bitable';
import { ElMessage } from 'element-plus';

/**
 * 多维表格同步相关逻辑
 */
export function useBitableSync() {
  // 表格列表
  const tableList = ref([]);
  
  // 选中的表格ID
  const selectedTableId = ref('');
  
  // 选中的表格字段
  const tableFields = ref([]);
  
  // 待同步的数据
  const syncData = ref([]);
  
  // 字段映射
  const fieldMapping = reactive({});
  
  // 是否正在加载表格列表
  const loadingTables = ref(false);
  
  // 是否正在加载字段列表
  const loadingFields = ref(false);
  
  // 是否正在同步数据
  const syncing = ref(false);
  
  // 同步结果
  const syncResult = ref(null);
  
  /**
   * 加载多维表格列表
   */
  const loadTables = async () => {
    loadingTables.value = true;
    
    try {
      const result = await getBitableTables();
      tableList.value = result.tables || [];
      return tableList.value;
    } catch (err) {
      ElMessage.error(err.message || '获取多维表格列表失败');
      throw err;
    } finally {
      loadingTables.value = false;
    }
  };
  
  /**
   * 加载表格字段
   * @param {string} tableId 
   */
  const loadFields = async (tableId) => {
    if (!tableId) {
      tableFields.value = [];
      return;
    }
    
    loadingFields.value = true;
    
    try {
      const result = await getBitableFields(tableId);
      tableFields.value = result.fields || [];
      // 同时加载字段映射
      await loadFieldMapping(tableId);
      return tableFields.value;
    } catch (err) {
      ElMessage.error(err.message || '获取表格字段失败');
      throw err;
    } finally {
      loadingFields.value = false;
    }
  };
  
  /**
   * 加载字段映射
   * @param {string} tableId 
   */
  const loadFieldMapping = async (tableId) => {
    if (!tableId) return;
    
    try {
      const result = await getFieldMapping(tableId);
      Object.keys(fieldMapping).forEach(key => {
        delete fieldMapping[key];
      });
      
      if (result.mapping) {
        Object.keys(result.mapping).forEach(key => {
          fieldMapping[key] = result.mapping[key];
        });
      }
      
      return fieldMapping;
    } catch (err) {
      console.error('获取字段映射失败:', err);
      // 不阻止正常流程，不显示错误提示
      return {}; // 返回空映射对象
    }
  };
  
  /**
   * 保存字段映射
   */
  const saveMapping = async () => {
    if (!selectedTableId.value) {
      ElMessage.warning('请先选择一个表格');
      return;
    }
    
    try {
      await saveFieldMapping(selectedTableId.value, fieldMapping);
      ElMessage.success('保存字段映射成功');
    } catch (err) {
      ElMessage.error(err.message || '保存字段映射失败');
      throw err;
    }
  };
  
  /**
   * 同步数据到多维表格
   */
  const syncData2Bitable = async () => {
    if (!selectedTableId.value) {
      ElMessage.warning('请先选择一个表格');
      return;
    }
    
    if (!syncData.value || !syncData.value.length) {
      ElMessage.warning('没有可同步的数据');
      return;
    }
    
    if (Object.keys(fieldMapping).length === 0) {
      ElMessage.warning('请先设置字段映射');
      return;
    }
    
    syncing.value = true;
    syncResult.value = null;
    
    try {
      const result = await syncDataToBitable(selectedTableId.value, syncData.value, fieldMapping);
      syncResult.value = result;
      ElMessage.success(`同步成功, 共新增${result.success_count || 0}条数据`);
      return result;
    } catch (err) {
      ElMessage.error(err.message || '同步数据失败');
      throw err;
    } finally {
      syncing.value = false;
    }
  };
  
  /**
   * 更新字段映射
   * @param {string} sourceField 源字段
   * @param {string} targetField 目标字段 
   */
  const updateMapping = (sourceField, targetField) => {
    if (targetField) {
      fieldMapping[sourceField] = targetField;
    } else {
      delete fieldMapping[sourceField];
    }
  };
  
  /**
   * 重置字段映射
   */
  const resetMapping = () => {
    Object.keys(fieldMapping).forEach(key => {
      delete fieldMapping[key];
    });
  };
  
  /**
   * 设置要同步的数据
   * @param {Array} data 
   */
  const setDataToSync = (data) => {
    syncData.value = Array.isArray(data) ? data : [];
  };
  
  /**
   * 处理表格选择变更
   * @param {string} tableId 
   */
  const handleTableChange = async (tableId) => {
    selectedTableId.value = tableId;
    
    // 重置字段映射
    resetMapping();
    
    // 加载新选择的表格字段
    if (tableId) {
      await loadFields(tableId);
    } else {
      tableFields.value = [];
    }
  };
  
  /**
   * 自动映射字段（尝试匹配同名字段）
   */
  const autoMapFields = () => {
    if (!syncData.value || syncData.value.length === 0 || !tableFields.value || tableFields.value.length === 0) {
      ElMessage.warning('没有可映射的字段');
      return;
    }
    
    resetMapping();
    
    // 获取数据源字段
    const sampleData = syncData.value[0];
    const sourceFields = Object.keys(sampleData);
    
    // 自动映射
    sourceFields.forEach(sourceField => {
      // 查找同名或相似字段
      const matchField = tableFields.value.find(field => 
        field.name.toLowerCase() === sourceField.toLowerCase() ||
        field.name.toLowerCase().includes(sourceField.toLowerCase()) ||
        sourceField.toLowerCase().includes(field.name.toLowerCase())
      );
      
      if (matchField) {
        fieldMapping[sourceField] = matchField.id;
      }
    });
    
    ElMessage.success('自动映射完成');
  };
  
  /**
   * 获取目标表格的名称
   */
  const selectedTableName = computed(() => {
    if (!selectedTableId.value || !tableList.value.length) return '';
    const selectedTable = tableList.value.find(table => table.id === selectedTableId.value);
    return selectedTable ? selectedTable.name : '';
  });
  
  /**
   * 获取字段映射的数量
   */
  const mappingCount = computed(() => {
    return Object.keys(fieldMapping).length;
  });
  
  return {
    tableList,
    selectedTableId,
    selectedTableName,
    tableFields,
    syncData,
    fieldMapping,
    mappingCount,
    loadingTables,
    loadingFields,
    syncing,
    syncResult,
    loadTables,
    loadFields,
    loadFieldMapping,
    saveMapping,
    syncData2Bitable,
    updateMapping,
    resetMapping,
    setDataToSync,
    handleTableChange,
    autoMapFields
  };
} 