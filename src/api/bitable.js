/**
 * @Version    : v1.00
 * @Author     : Amon
 * @Date       : 2024-05-06
 * @desc       : 飞书多维表格API接口
 */
import { createLogger } from '../utils/logger';

// 创建模块日志记录器
const logger = createLogger('BITABLE');

/**
 * 同步数据到飞书多维表格
 * @param {string|Object} tableIdOrData 表格ID或数据对象
 * @param {Object|Object} dataOrConfig 数据或配置对象
 * @param {Object} configOrMapping 配置或映射对象
 * @returns {Promise<Object>} 同步结果
 */
export async function syncDataToBitable(tableIdOrData, dataOrConfig, configOrMapping) {
  logger.info('开始同步数据到飞书多维表格');
  
  try {
    // 参数兼容性处理
    let tableId, data, config;
    
    if (typeof tableIdOrData === 'string') {
      // 旧版本调用方式：syncDataToBitable(tableId, data, config)
      tableId = tableIdOrData;
      data = dataOrConfig;
      config = configOrMapping || {};
    } else {
      // 新版本调用方式：syncDataToBitable(data, config)
      data = tableIdOrData;
      config = dataOrConfig || {};
      tableId = config.tableId;
    }
    
    // 验证必要参数
    if (!data || !Array.isArray(data)) {
      throw new Error('数据参数无效，必须是数组');
    }
    
    if (data.length === 0) {
      logger.warn('数据为空，跳过同步');
      return {
        success: true,
        message: '数据为空，跳过同步',
        recordCount: 0
      };
    }
    
    // 获取API基础URL和认证令牌
    const backendUrl = localStorage.getItem('api_base_url') || 'https://fsbk.dy2bcsm.cn/api';
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      throw new Error('未找到认证令牌，请先登录');
    }
    
    // 准备同步请求参数
    const requestData = {
      data: data,
      config: {
        tableId: tableId,
        viewId: config.viewId,
        tableName: config.tableName,
        mode: config.mode || 'update',
        fields: config.fields || [],
        autoCreateFields: config.autoCreateFields !== false,
        field_mappings: config.field_mappings || {},
        withTranscription: config.withTranscription || false
      }
    };
    
    // 发送同步请求到后端
    logger.info('发送同步请求到后端', { 
      url: `${backendUrl}/bitable/sync`,
      recordCount: data.length,
      config: requestData.config
    });
    
    const response = await fetch(`${backendUrl}/bitable/sync`, {
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
      logger.info('同步数据成功', { 
        recordCount: result.data.recordCount,
        tableId: result.data.tableId
      });
      return result.data;
    } else {
      throw new Error(result.message || '同步失败');
    }
  } catch (error) {
    logger.error('同步数据到飞书多维表格失败', error);
    throw error;
  }
}

/**
 * 获取表格列表（占位符函数）
 * @returns {Promise<Array>} 表格列表
 */
export async function getTableList() {
  logger.info('获取表格列表');
  
  try {
    // 这个函数现在主要作为占位符
    // 实际的获取逻辑应该使用飞书SDK直接获取
    logger.warn('getTableList函数已废弃，请直接使用飞书SDK获取表格列表');
    
    return [];
  } catch (error) {
    logger.error('获取表格列表失败', error);
    throw error;
  }
}

/**
 * 获取视图列表（占位符函数）
 * @param {string} tableId 表格ID
 * @returns {Promise<Array>} 视图列表
 */
export async function getViewList(tableId) {
  logger.info('获取视图列表', { tableId });
  
  try {
    // 这个函数现在主要作为占位符
    // 实际的获取逻辑应该使用飞书SDK直接获取
    logger.warn('getViewList函数已废弃，请直接使用飞书SDK获取视图列表');
    
    return [];
  } catch (error) {
    logger.error('获取视图列表失败', error);
    throw error;
  }
}

/**
 * 获取多维表格列表（占位符函数）
 * @returns {Promise<Object>} 包含表格列表的对象
 */
export async function getBitableTables() {
  logger.info('获取多维表格列表');
  
  try {
    logger.warn('getBitableTables函数已废弃，请直接使用飞书SDK获取表格列表');
    
    return {
      tables: []
    };
  } catch (error) {
    logger.error('获取多维表格列表失败', error);
    throw error;
  }
}

/**
 * 获取表格字段（占位符函数）
 * @param {string} tableId 表格ID
 * @returns {Promise<Object>} 包含字段列表的对象
 */
export async function getBitableFields(tableId) {
  logger.info('获取表格字段', { tableId });
  
  try {
    logger.warn('getBitableFields函数已废弃，请直接使用飞书SDK获取字段列表');
    
    return {
      fields: []
    };
  } catch (error) {
    logger.error('获取表格字段失败', error);
    throw error;
  }
}

/**
 * 获取字段映射（占位符函数）
 * @param {string} tableId 表格ID
 * @returns {Promise<Object>} 字段映射对象
 */
export async function getFieldMapping(tableId) {
  logger.info('获取字段映射', { tableId });
  
  try {
    logger.warn('getFieldMapping函数已废弃');
    
    return {
      mapping: {}
    };
  } catch (error) {
    logger.error('获取字段映射失败', error);
    throw error;
  }
}

/**
 * 保存字段映射（占位符函数）
 * @param {string} tableId 表格ID
 * @param {Object} mapping 字段映射
 * @returns {Promise<Object>} 保存结果
 */
export async function saveFieldMapping(tableId, mapping) {
  logger.info('保存字段映射', { tableId, mapping });
  
  try {
    logger.warn('saveFieldMapping函数已废弃');
    
    return {
      success: true
    };
  } catch (error) {
    logger.error('保存字段映射失败', error);
    throw error;
  }
}

/**
 * 创建多维表格（占位符函数）
 * @param {string} name 表格名称
 * @param {Array} fields 字段配置
 * @returns {Promise<Object>} 创建结果
 */
export async function createBitableTable(name, fields) {
  logger.info('创建多维表格', { name, fields });
  
  try {
    logger.warn('createBitableTable函数已废弃，请直接使用飞书SDK创建表格');
    
    return {
      success: true,
      tableId: 'mock_table_id_' + Date.now(),
      tableName: name
    };
  } catch (error) {
    logger.error('创建多维表格失败', error);
    throw error;
  }
}

/**
 * 更新表格记录（占位符函数）
 * @param {string} tableId 表格ID
 * @param {string} recordId 记录ID
 * @param {Object} data 更新数据
 * @returns {Promise<Object>} 更新结果
 */
export async function updateBitableRecord(tableId, recordId, data) {
  logger.info('更新表格记录', { tableId, recordId, data });
  
  try {
    logger.warn('updateBitableRecord函数已废弃，请直接使用飞书SDK更新记录');
    
    return {
      success: true,
      recordId: recordId
    };
  } catch (error) {
    logger.error('更新表格记录失败', error);
    throw error;
  }
}

/**
 * 添加表格记录（占位符函数）
 * @param {string} tableId 表格ID
 * @param {Object} data 记录数据
 * @returns {Promise<Object>} 添加结果
 */
export async function addBitableRecord(tableId, data) {
  logger.info('添加表格记录', { tableId, data });
  
  try {
    logger.warn('addBitableRecord函数已废弃，请直接使用飞书SDK添加记录');
    
    return {
      success: true,
      recordId: 'mock_record_id_' + Date.now()
    };
  } catch (error) {
    logger.error('添加表格记录失败', error);
    throw error;
  }
}

/**
 * 获取表格记录（占位符函数）
 * @param {string} tableId 表格ID
 * @param {string} viewId 视图ID（可选）
 * @returns {Promise<Object>} 记录列表
 */
export async function getBitableRecords(tableId, viewId) {
  logger.info('获取表格记录', { tableId, viewId });
  
  try {
    logger.warn('getBitableRecords函数已废弃，请直接使用飞书SDK获取记录');
    
    return {
      records: []
    };
  } catch (error) {
    logger.error('获取表格记录失败', error);
    throw error;
  }
}

/**
 * 批量添加记录（占位符函数）
 * @param {string} tableId 表格ID
 * @param {Array} records 记录数组
 * @returns {Promise<Object>} 批量添加结果
 */
export async function batchAddRecords(tableId, records) {
  logger.info('批量添加记录', { tableId, recordCount: records?.length || 0 });
  
  try {
    logger.warn('batchAddRecords函数已废弃，请直接使用飞书SDK批量添加记录');
    
    return {
      success: true,
      addedCount: records?.length || 0,
      recordIds: records?.map((_, index) => `mock_record_id_${Date.now()}_${index}`) || []
    };
  } catch (error) {
    logger.error('批量添加记录失败', error);
    throw error;
  }
} 