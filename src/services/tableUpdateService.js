import { bitable } from '@lark-base-open/js-sdk';
import { createLogger } from '../utils/logger';

// 创建日志记录器
const logger = createLogger('TABLE_UPDATE_SERVICE');

/**
 * 表格更新服务类
 * 负责将转写结果更新到飞书多维表格
 */
export class TableUpdateService {
  constructor() {
    this.batchSize = 10; // 批量更新大小
  }

  /**
   * 获取或创建转写字段
   * @param {Object} table - 表格实例
   * @returns {Promise<string>} 转写字段ID
   */
  async getOrCreateTranscriptionField(table) {
    try {
      const fieldMetaList = await table.getFieldMetaList();
      
      // 查找转写字段
      const transcriptionField = fieldMetaList.find(field => 
        field.name === '视频转写内容' || 
        field.name === 'transcription' ||
        field.name.includes('转写')
      );
      
      if (transcriptionField) {
        logger.info('找到转写字段', { 
          fieldId: transcriptionField.id, 
          fieldName: transcriptionField.name 
        });
        return transcriptionField.id;
      }
      
      // 创建新的转写字段
      logger.info('创建新的转写字段');
      const newField = await table.addField({
        type: 1, // 多行文本类型
        name: '视频转写内容'
      });
      
      logger.info('转写字段创建成功', { 
        fieldId: newField.id, 
        fieldName: '视频转写内容' 
      });
      
      return newField.id;
    } catch (error) {
      logger.error('获取或创建转写字段失败', error);
      throw error;
    }
  }

  /**
   * 批量更新转写结果到表格
   * @param {string} tableId - 表格ID
   * @param {Array} transcriptionResults - 转写结果数组
   * @returns {Promise<Object>} 更新结果
   */
  async updateTranscriptionResults(tableId, transcriptionResults) {
    try {
      logger.info('开始批量更新转写结果', { 
        tableId, 
        resultsCount: transcriptionResults.length 
      });

      // 获取表格实例
      const table = await bitable.base.getTableById(tableId);
      
      // 获取或创建转写字段
      const transcriptionFieldId = await this.getOrCreateTranscriptionField(table);
      
      // 准备更新数据
      const updateRecords = [];
      let successCount = 0;
      let failedCount = 0;
      
      for (const result of transcriptionResults) {
        if (result.status === 'completed' && result.transcription_text) {
          updateRecords.push({
            recordId: result.record_id,
            fields: {
              [transcriptionFieldId]: result.transcription_text
            }
          });
          successCount++;
          
          logger.info('准备更新记录', {
            recordId: result.record_id,
            textLength: result.transcription_text.length,
            wordCount: result.word_count || 0
          });
        } else {
          failedCount++;
          logger.warn('跳过失败的转写记录', {
            recordId: result.record_id,
            status: result.status,
            error: result.error
          });
        }
      }
      
      if (updateRecords.length === 0) {
        logger.warn('没有需要更新的记录');
        return {
          success: true,
          updatedCount: 0,
          successCount: 0,
          failedCount: transcriptionResults.length
        };
      }
      
      // 分批更新记录
      let updatedCount = 0;
      const totalBatches = Math.ceil(updateRecords.length / this.batchSize);
      
      for (let i = 0; i < updateRecords.length; i += this.batchSize) {
        const batch = updateRecords.slice(i, i + this.batchSize);
        const batchNumber = Math.floor(i / this.batchSize) + 1;
        
        try {
          await table.setRecords(batch);
          updatedCount += batch.length;
          
          logger.info(`批次 ${batchNumber}/${totalBatches} 更新成功`, { 
            batchSize: batch.length,
            recordIds: batch.map(r => r.recordId),
            progress: `${updatedCount}/${updateRecords.length}`
          });
          
          // 添加延迟避免请求过快
          if (i + this.batchSize < updateRecords.length) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
          
        } catch (batchError) {
          logger.error(`批次 ${batchNumber}/${totalBatches} 更新失败`, batchError);
          
          // 如果批量更新失败，尝试逐个更新
          for (const record of batch) {
            try {
              await table.setRecord(record.recordId, record.fields);
              updatedCount++;
              logger.info('单个记录更新成功', { recordId: record.recordId });
            } catch (singleError) {
              logger.error('单个记录更新失败', { 
                recordId: record.recordId, 
                error: singleError.message 
              });
            }
          }
        }
      }
      
      const result = {
        success: true,
        updatedCount,
        successCount,
        failedCount,
        totalCount: transcriptionResults.length
      };
      
      logger.info('批量更新转写结果完成', result);
      return result;
      
    } catch (error) {
      logger.error('批量更新转写结果失败', error);
      throw error;
    }
  }

  /**
   * 更新单个记录的转写结果
   * @param {string} tableId - 表格ID
   * @param {string} recordId - 记录ID
   * @param {string} transcriptionText - 转写文本
   * @returns {Promise<boolean>} 更新是否成功
   */
  async updateSingleRecord(tableId, recordId, transcriptionText) {
    try {
      logger.info('更新单个记录转写结果', { 
        tableId, 
        recordId, 
        textLength: transcriptionText.length 
      });

      // 获取表格实例
      const table = await bitable.base.getTableById(tableId);
      
      // 获取或创建转写字段
      const transcriptionFieldId = await this.getOrCreateTranscriptionField(table);
      
      // 更新记录
      await table.setRecord(recordId, {
        [transcriptionFieldId]: transcriptionText
      });
      
      logger.info('单个记录更新成功', { recordId });
      return true;
      
    } catch (error) {
      logger.error('更新单个记录失败', { tableId, recordId, error });
      return false;
    }
  }

  /**
   * 检查表格是否存在转写字段
   * @param {string} tableId - 表格ID
   * @returns {Promise<boolean>} 是否存在转写字段
   */
  async hasTranscriptionField(tableId) {
    try {
      const table = await bitable.base.getTableById(tableId);
      const fieldMetaList = await table.getFieldMetaList();
      
      const transcriptionField = fieldMetaList.find(field => 
        field.name === '视频转写内容' || 
        field.name === 'transcription' ||
        field.name.includes('转写')
      );
      
      return !!transcriptionField;
    } catch (error) {
      logger.error('检查转写字段失败', { tableId, error });
      return false;
    }
  }
}

// 创建单例实例
export const tableUpdateService = new TableUpdateService(); 