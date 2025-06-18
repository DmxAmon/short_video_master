import { bitable } from '@lark-base-open/js-sdk';
import { createLogger } from '../utils/logger';

// 创建日志记录器
const logger = createLogger('BITABLE_WRITE');

/**
 * 飞书多维表格写入服务
 */
export class BitableWriteService {
  constructor() {
    this.batchSize = 10; // 默认批量写入大小
  }

  /**
   * 写入数据到现有表格
   * @param {string} tableId - 表格ID
   * @param {string} viewId - 视图ID
   * @param {Array} data - 要写入的数据数组
   * @param {Object} fieldMappings - 字段映射关系
   * @returns {Promise<Object>} 写入结果
   */
  async writeToExistingTable(tableId, viewId, data, fieldMappings) {
    logger.info('开始写入数据到现有表格', { 
      tableId, 
      viewId, 
      dataCount: data.length,
      fieldMappings 
    });

    try {
      // 1. 获取表格实例
      const table = await bitable.base.getTableById(tableId);
      if (!table) {
        throw new Error(`找不到表格: ${tableId}`);
      }

      // 2. 获取表格字段信息
      const existingFields = await table.getFieldMetaList();
      logger.info('获取到现有字段', { fieldCount: existingFields.length });

      // 3. 检查和创建缺失的字段
      const fieldMap = await this.ensureFields(table, fieldMappings, existingFields);

      // 4. 转换数据格式
      const records = this.convertDataToTableFormat(data, fieldMap);

      // 5. 批量写入数据
      const writeResult = await this.batchWrite(table, records);

      logger.info('成功写入数据到现有表格', { 
        recordCount: writeResult.recordCount,
        successCount: writeResult.successCount 
      });

      return {
        success: true,
        tableId,
        viewId,
        recordCount: writeResult.recordCount,
        successCount: writeResult.successCount,
        records: writeResult.records,
        tableName: await this.getTableName(table)
      };

    } catch (error) {
      logger.error('写入现有表格失败', error);
      throw new Error(`写入表格失败: ${error.message}`);
    }
  }

  /**
   * 创建新表格并写入数据
   * @param {string} tableName - 表格名称
   * @param {Array} data - 要写入的数据数组
   * @param {Object} fieldMappings - 字段映射关系
   * @returns {Promise<Object>} 创建和写入结果
   */
  async createTableAndWrite(tableName, data, fieldMappings) {
    logger.info('开始创建新表格并写入数据', { 
      tableName, 
      dataCount: data.length,
      fieldMappings 
    });

    try {
      // 1. 创建新表格
      const table = await this.createTable(tableName, fieldMappings);
      
      // 等待一下确保表格创建完成
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const tableId = await table.getId();
      logger.info('成功创建新表格', { tableId, tableName });

      // 2. 重新获取表格字段信息（确保获取到完整的字段列表）
      const fields = await table.getFieldMetaList();
      logger.info('新表格字段列表', { fieldCount: fields.length, fields });

      // 3. 构建字段映射
      const fieldMap = {};
      Object.entries(fieldMappings).forEach(([sourceKey, fieldLabel]) => {
        const field = fields.find(f => f.name === fieldLabel);
        if (field) {
          fieldMap[field.id] = {
            sourceKey,
            type: field.type,
            name: field.name
          };
        } else {
          logger.warn('未找到字段', { fieldLabel, sourceKey });
        }
      });

      logger.info('新表格字段映射', { fieldMapCount: Object.keys(fieldMap).length, fieldMap });

      // 4. 转换数据格式
      const records = this.convertDataToTableFormat(data, fieldMap);

      // 5. 批量写入数据
      const writeResult = await this.batchWrite(table, records);

      logger.info('成功写入数据到新表格', { 
        recordCount: writeResult.recordCount,
        successCount: writeResult.successCount 
      });

      return {
        success: true,
        tableId,
        tableName,
        recordCount: writeResult.recordCount,
        successCount: writeResult.successCount,
        records: writeResult.records,
        isNewTable: true,
        // 添加新表格的完整信息，用于更新前端状态
        newTableInfo: {
          id: tableId,
          name: tableName
        }
      };

    } catch (error) {
      logger.error('创建表格并写入失败', error);
      throw new Error(`创建表格失败: ${error.message}`);
    }
  }

  /**
   * 批量写入数据（分批处理）
   * @param {Object} table - 表格实例
   * @param {Array} records - 记录数组
   * @param {number} batchSize - 批量大小
   * @returns {Promise<Object>} 写入结果
   */
  async batchWrite(table, records, batchSize = this.batchSize) {
    logger.info('开始批量写入数据', { 
      totalRecords: records.length, 
      batchSize 
    });

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    try {
      // 分批处理
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        
        try {
          logger.info(`写入第 ${Math.floor(i / batchSize) + 1} 批数据`, { 
            batchStart: i + 1, 
            batchEnd: Math.min(i + batchSize, records.length),
            batchSize: batch.length 
          });

          // 调用SDK批量添加记录
          const batchResult = await table.addRecords(batch);
          
          if (batchResult && Array.isArray(batchResult)) {
            // 记录成功的记录ID
            batchResult.forEach((recordId, index) => {
              if (recordId) {
                results.push({
                  recordId,
                  originalIndex: i + index,
                  data: batch[index]
                });
                successCount++;
              } else {
                errorCount++;
                logger.warn(`记录 ${i + index + 1} 写入失败`);
              }
            });
          } else {
            logger.warn('批量写入返回结果格式异常', { batchResult });
            errorCount += batch.length;
          }

          // 添加延迟，避免请求过于频繁
          if (i + batchSize < records.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }

        } catch (batchError) {
          logger.error(`第 ${Math.floor(i / batchSize) + 1} 批写入失败`, batchError);
          errorCount += batch.length;
          
          // 继续处理下一批，不中断整个流程
          continue;
        }
      }

      logger.info('批量写入完成', { 
        totalRecords: records.length,
        successCount,
        errorCount 
      });

      return {
        recordCount: records.length,
        successCount,
        errorCount,
        records: results
      };

    } catch (error) {
      logger.error('批量写入过程中发生错误', error);
      throw new Error(`批量写入失败: ${error.message}`);
    }
  }

  /**
   * 转换数据为表格格式
   * @param {Array} data - 原始数据
   * @param {Object} fieldMap - 字段映射
   * @returns {Array} 转换后的记录数组
   */
  convertDataToTableFormat(data, fieldMap) {
    logger.info('开始转换数据格式', { 
      dataCount: data.length,
      fieldMapKeys: Object.keys(fieldMap),
      sampleData: data[0] // 添加样本数据用于调试
    });

    return data.map((item, index) => {
      const record = { fields: {} };

      // 遍历字段映射，转换每个字段
      Object.entries(fieldMap).forEach(([fieldId, fieldInfo]) => {
        const { sourceKey, type, name } = fieldInfo;
        let value = item[sourceKey];

        // 添加调试日志
        if (index === 0) { // 只为第一条记录打印调试信息
          logger.info(`字段映射调试`, { 
            fieldId, 
            fieldName: name,
            sourceKey, 
            type, 
            originalValue: value,
            valueType: typeof value,
            hasValue: value !== undefined && value !== null && value !== ''
          });
        }

        // 特别处理发布时间字段
        if (sourceKey === 'create_time_formatted' && index === 0) {
          logger.info('发布时间字段详细调试', {
            sourceKey,
            originalValue: value,
            valueType: typeof value,
            itemKeys: Object.keys(item),
            // 检查其他可能的时间字段
            create_time: item.create_time,
            createTime: item.createTime,
            create_time_formatted: item.create_time_formatted
          });
        }

        // 处理值 - 即使是undefined也要设置默认值
        if (value !== undefined && value !== null && value !== '') {
          record.fields[fieldId] = this.convertValueByType(value, type);
        } else {
          // 为空值设置默认值
          record.fields[fieldId] = this.getDefaultValueByType(type);
          
          // 如果是发布时间字段且值为空，记录警告
          if (sourceKey === 'create_time_formatted') {
            logger.warn('发布时间字段值为空，使用默认值', {
              sourceKey,
              originalValue: value,
              defaultValue: record.fields[fieldId],
              availableKeys: Object.keys(item)
            });
          }
        }
      });

      // 为第一条记录打印完整的转换结果
      if (index === 0) {
        logger.info('第一条记录转换结果', { 
          originalItem: item,
          convertedRecord: record,
          fieldCount: Object.keys(record.fields).length
        });
      }

      return record;
    });
  }

  /**
   * 根据字段类型转换值
   * @param {*} value - 原始值
   * @param {number} type - 字段类型（飞书字段类型常量）
   * @returns {*} 转换后的值
   */
  convertValueByType(value, type) {
    try {
      switch (type) {
        case 1: // 单行文本
        case 3: // 多行文本
          // 对于文本类型，直接转换为字符串
          if (value === null || value === undefined) {
            return '';
          }
          return String(value);
        
        case 15: // 超链接
          const urlValue = String(value || '');
          // 确保URL格式正确
          if (urlValue && !urlValue.startsWith('http')) {
            return `https://${urlValue}`;
          }
          return urlValue;
        
        case 2: // 数字
          // 处理数字字符串（如点赞数）
          if (typeof value === 'string') {
            // 移除非数字字符，保留数字和小数点
            const numStr = value.replace(/[^\d.]/g, '');
            const num = parseFloat(numStr);
            // 返回整数，不保留小数
            return isNaN(num) ? 0 : Math.round(num);
          }
          // 返回整数，不保留小数
          return Math.round(Number(value) || 0);
        
        case 5: // 日期
          if (typeof value === 'string') {
            // 尝试解析日期字符串
            const date = new Date(value);
            if (isNaN(date.getTime())) {
              // 如果解析失败，返回当前日期的时间戳
              logger.warn('日期解析失败，使用当前日期', { originalValue: value });
              return Date.now();
            }
            // 返回毫秒时间戳
            const timestamp = date.getTime();
            logger.info('日期字符串转换为时间戳', { 
              originalValue: value, 
              parsedDate: date.toISOString(), 
              timestamp 
            });
            return timestamp;
          }
          if (value instanceof Date) {
            // 返回毫秒时间戳
            const timestamp = value.getTime();
            logger.info('Date对象转换为时间戳', { 
              originalDate: value.toISOString(), 
              timestamp 
            });
            return timestamp;
          }
          if (typeof value === 'number') {
            // 如果已经是时间戳，直接返回
            logger.info('数字值作为时间戳使用', { originalValue: value });
            return value;
          }
          logger.warn('无法解析日期值，使用当前日期', { originalValue: value, type: typeof value });
          return Date.now();
        
        case 7: // 复选框
          return Boolean(value);
        
        default:
          return String(value || '');
      }
    } catch (error) {
      logger.warn('值类型转换失败', { value, type, error: error.message });
      return String(value || '');
    }
  }

  /**
   * 根据字段类型获取默认值
   * @param {number} type - 字段类型
   * @returns {*} 默认值
   */
  getDefaultValueByType(type) {
    switch (type) {
      case 1: // 单行文本
      case 3: // 多行文本
      case 15: // 超链接
        return '';
      case 2: // 数字
        return 0;
      case 5: // 日期
        return Date.now(); // 返回当前时间的毫秒时间戳
      case 7: // 复选框
        return false;
      default:
        return '';
    }
  }

  /**
   * 确保表格中存在所需字段
   * @param {Object} table - 表格实例
   * @param {Object} fieldMappings - 字段映射
   * @param {Array} existingFields - 现有字段列表
   * @returns {Promise<Object>} 字段映射
   */
  async ensureFields(table, fieldMappings, existingFields) {
    logger.info('检查和创建字段', { 
      requiredFields: Object.keys(fieldMappings),
      existingFieldCount: existingFields.length 
    });

    const fieldMap = {};
    const existingFieldMap = {};

    // 建立现有字段的映射
    existingFields.forEach(field => {
      existingFieldMap[field.name] = field;
    });

    logger.info('现有字段映射', { 
      existingFieldNames: Object.keys(existingFieldMap) 
    });

    // 检查每个需要的字段
    for (const [sourceKey, fieldLabel] of Object.entries(fieldMappings)) {
      let field = existingFieldMap[fieldLabel];

      if (!field) {
        // 字段不存在，创建新字段
        try {
          const fieldType = this.getFieldTypeBySourceKey(sourceKey);
          logger.info('创建新字段', { fieldLabel, fieldType, sourceKey });

          const newField = await table.addField({
            name: fieldLabel,
            type: fieldType
          });

          // 等待字段创建完成
          await new Promise(resolve => setTimeout(resolve, 200));

          // 重新获取字段列表以获取完整的字段信息
          const updatedFields = await table.getFieldMetaList();
          field = updatedFields.find(f => f.name === fieldLabel);
          
          if (field) {
            logger.info('成功创建字段', { fieldId: field.id, fieldLabel, fieldType });
          } else {
            logger.error('创建字段后无法找到字段', { fieldLabel });
            continue;
          }
        } catch (error) {
          logger.error('创建字段失败', { fieldLabel, error: error.message });
          // 创建失败时跳过该字段
          continue;
        }
      } else {
        logger.info('字段已存在', { fieldLabel, fieldId: field.id });
      }

      // 确保字段有有效的ID
      if (field && field.id) {
        fieldMap[field.id] = {
          sourceKey,
          type: field.type,
          name: field.name
        };
      } else {
        logger.warn('字段缺少有效ID，跳过', { fieldLabel, field });
      }
    }

    logger.info('字段检查完成', { 
      fieldMapCount: Object.keys(fieldMap).length,
      createdFields: Object.keys(fieldMap).length - existingFields.length
    });
    
    return fieldMap;
  }

  /**
   * 创建新表格
   * @param {string} tableName - 表格名称
   * @param {Object} fieldMappings - 字段映射
   * @returns {Promise<Object>} 表格实例
   */
  async createTable(tableName, fieldMappings) {
    logger.info('开始创建表格', { tableName, fieldMappings });

    try {
      // 准备字段定义 - 只包含基础字段，避免创建过多字段导致失败
      const basicFields = [
        { name: '标题', type: 1 }, // 单行文本
        { name: '视频ID', type: 1 }, // 单行文本
        { name: '视频链接', type: 15 } // 超链接
      ];

      // 创建表格（先创建基础字段）
      const tableResult = await bitable.base.addTable({
        name: tableName,
        fields: basicFields
      });

      logger.info('成功创建基础表格', { tableName, basicFieldCount: basicFields.length, tableResult });

      // 等待表格创建完成
      await new Promise(resolve => setTimeout(resolve, 500));

      // 获取表格实例 - 根据飞书SDK文档，addTable返回的是表格ID
      let table;
      let tableId;
      
      if (typeof tableResult === 'string') {
        // 如果返回的是表格ID字符串
        tableId = tableResult;
        table = await bitable.base.getTableById(tableId);
      } else if (tableResult && tableResult.tableId) {
        // 如果返回的是包含tableId的对象
        tableId = tableResult.tableId;
        table = await bitable.base.getTableById(tableId);
      } else if (tableResult && tableResult.id) {
        // 如果返回的是包含id的对象
        tableId = tableResult.id;
        table = await bitable.base.getTableById(tableId);
      } else {
        throw new Error('创建表格返回的结果格式不正确');
      }

      if (!table) {
        throw new Error('无法获取创建的表格实例');
      }

      logger.info('获取表格实例成功', { 
        tableId,
        hasAddField: typeof table.addField === 'function',
        hasGetMeta: typeof table.getMeta === 'function',
        hasGetId: typeof table.getId === 'function'
      });

      // 然后添加其他字段 - 只有当表格有addField方法时才添加
      if (typeof table.addField === 'function') {
        const additionalFields = Object.entries(fieldMappings).filter(([sourceKey, fieldLabel]) => {
          return !['title', 'aweme_id', 'share_url'].includes(sourceKey);
        });

        logger.info('准备添加额外字段', { additionalFieldCount: additionalFields.length });

        for (const [sourceKey, fieldLabel] of additionalFields) {
          try {
            const fieldType = this.getFieldTypeBySourceKey(sourceKey);
            logger.info('添加字段', { fieldLabel, fieldType, sourceKey });

            await table.addField({
              name: fieldLabel,
              type: fieldType
            });

            // 添加延迟避免请求过快
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (fieldError) {
            logger.warn('添加字段失败，跳过', { fieldLabel, error: fieldError.message });
            // 继续添加其他字段，不中断流程
          }
        }
      } else {
        logger.warn('表格对象没有addField方法，跳过添加额外字段');
      }

      logger.info('表格创建完成', { tableName, tableId });
      return table;

    } catch (error) {
      logger.error('创建表格失败', error);
      throw new Error(`创建表格失败: ${error.message}`);
    }
  }

  /**
   * 根据源字段键获取字段类型
   * @param {string} sourceKey - 源字段键
   * @returns {string} 字段类型
   */
  getFieldTypeBySourceKey(sourceKey) {
    const typeMap = {
      // 基础字段
      'title': 1, // 单行文本
      
      // 视频ID字段
      'videoId': 1, // 单行文本
      'video_id': 1, // 单行文本
      'aweme_id': 1, // 单行文本 - 新的后端字段名
      
      // 视频链接字段
      'videoUrl': 15, // 超链接
      'video_url': 15, // 超链接
      'share_url': 15, // 超链接 - 新的后端字段名
      
      // 作者相关字段
      'authorNickname': 1, // 单行文本
      'author_nickname': 1, // 单行文本
      'authorId': 1, // 单行文本
      'author_id': 1, // 单行文本
      'authorFollowerCount': 1, // 单行文本
      'author_follower_count': 1, // 单行文本
      
      // 时间字段
      'createTime': 5, // 日期
      'create_time': 5, // 日期
      'create_time_formatted': 5, // 日期 - 新的后端字段名
      
      // 描述字段
      'description': 3, // 多行文本
      
      // 数量字段 - 全部使用文本类型（按用户要求）
      'likeCount': 1, // 单行文本
      'like_count': 1, // 单行文本
      'digg_count': 1, // 单行文本 - 新的后端字段名（点赞数）
      
      'commentCount': 1, // 单行文本
      'comment_count': 1, // 单行文本
      
      'shareCount': 1, // 单行文本
      'share_count': 1, // 单行文本
      
      'forwardCount': 1, // 单行文本
      'forward_count': 1, // 单行文本
      
      'downloadCount': 1, // 单行文本
      'download_count': 1, // 单行文本
      
      'playCount': 1, // 单行文本
      'play_count': 1, // 单行文本
      'play_account': 1, // 单行文本 - 新的后端字段名（播放量）
      
      // 其他字段
      'duration': 1, // 单行文本（时长格式）
      'transcription': 3, // 多行文本
      'cover': 15 // 超链接
    };

    return typeMap[sourceKey] || 1; // 默认为单行文本
  }

  /**
   * 获取表格名称
   * @param {Object} table - 表格实例
   * @returns {Promise<string>} 表格名称
   */
  async getTableName(table) {
    try {
      const meta = await table.getMeta();
      return meta.name || '未知表格';
    } catch (error) {
      logger.warn('获取表格名称失败', error);
      return '未知表格';
    }
  }
}

// 导出单例实例
export const bitableWriteService = new BitableWriteService(); 