import { ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import { bitable } from '@lark-base-open/js-sdk';
import { bitableWriteService } from '../services/bitableWrite.js';
import { createLogger } from '../utils/logger';
import axios from 'axios';

// 创建日志记录器
const logger = createLogger('DATA_PROCESSOR');

/**
 * 数据处理组合器
 */
export function useDataProcessor() {
  
  // 进度状态
  const writeProgress = reactive({
    stage: '', // 'preparing', 'creating', 'writing', 'logging', 'completed'
    current: 0,
    total: 0,
    message: '',
    isActive: false
  });

  // 错误状态
  const writeError = ref(null);

  /**
   * 处理采集数据并写入表格
   * @param {Object} collectionData - 采集的数据
   * @param {Object} config - 配置信息
   * @param {Function} onTableCreated - 新表格创建后的回调函数
   * @returns {Promise<Object>} 处理结果
   */
  const processAndWrite = async (collectionData, config, onTableCreated = null) => {
    logger.info('开始处理采集数据并写入表格', { 
      dataCount: collectionData.videos?.length || 0,
      config 
    });

    try {
      // 重置状态
      writeError.value = null;
      writeProgress.isActive = true;
      updateProgress('preparing', 0, 100, '准备写入数据...');

      // 1. 验证数据
      if (!collectionData.videos || collectionData.videos.length === 0) {
        throw new Error('没有可写入的视频数据');
      }

      // 1.5 分析实际数据结构
      const sampleVideo = collectionData.videos[0];
      const availableFields = Object.keys(sampleVideo);
      logger.info('后端返回的实际字段', { 
        availableFields,
        sampleVideo,
        // 特别检查时间相关字段
        timeFields: {
          create_time: sampleVideo.create_time,
          createTime: sampleVideo.createTime,
          create_time_formatted: sampleVideo.create_time_formatted
        }
      });

      // 2. 生成字段映射（基于实际可用的字段）
      const fieldMappings = generateFieldMappings(config.fields, availableFields);
      logger.info('生成字段映射', { fieldMappings });

      updateProgress('preparing', 20, 100, '准备字段映射...');

      // 3. 根据模式选择写入方式
      let writeResult;
      if (config.mode === 'new') {
        // 创建新表格模式 - 分两步进行，提升用户体验
        updateProgress('creating', 30, 100, `正在创建新表格 "${config.tableName}"...`);
        
        // 第一步：创建表格并切换到该表格
        const newTable = await bitableWriteService.createTable(config.tableName, fieldMappings);
        
        // 获取新表格的ID和名称 - 简化处理
        let newTableId, newTableName;
        
        try {
          // 尝试获取表格ID
          if (newTable.id) {
            newTableId = newTable.id;
          } else if (typeof newTable.getId === 'function') {
            newTableId = await newTable.getId();
          } else {
            throw new Error('无法获取表格ID');
          }
          
          // 使用配置的表格名称
          newTableName = config.tableName;
          
        } catch (metaError) {
          logger.error('获取表格信息失败', metaError);
          throw new Error('无法获取新创建的表格信息');
        }
        
        logger.info('新表格创建成功', { tableId: newTableId, tableName: newTableName });
        
        // 切换到新创建的表格，让用户看到表格
        if (bitable && bitable.ui && bitable.ui.switchToTable) {
          try {
            await bitable.ui.switchToTable(newTableId);
            logger.info('成功切换到新表格', { tableId: newTableId });
          } catch (switchError) {
            logger.warn('切换到新表格失败，但继续写入数据', switchError);
          }
        }
        
        updateProgress('writing', 50, 100, `表格创建完成，正在写入数据到 "${newTableName}"...`);
        
        // 第二步：写入数据到新表格
        writeResult = await bitableWriteService.writeToExistingTable(
          newTableId,
          null, // 新表格使用默认视图
          collectionData.videos,
          fieldMappings
        );
        
        // 确保返回结果包含新表格信息
        writeResult.tableId = newTableId;
        writeResult.tableName = newTableName;
        writeResult.isNewTable = true;
        
        // 立即通知前端更新表格列表
        if (onTableCreated && typeof onTableCreated === 'function') {
          try {
            onTableCreated({
              tableId: newTableId,
              tableName: newTableName,
              isNewTable: true
            });
            logger.info('已通知前端更新表格列表', { tableId: newTableId, tableName: newTableName });
          } catch (callbackError) {
            logger.warn('回调函数执行失败', callbackError);
          }
        }
        
      } else {
        // 写入现有表格模式
        updateProgress('writing', 30, 100, `正在写入表格 "${config.tableName}"...`);
        
        writeResult = await bitableWriteService.writeToExistingTable(
          config.tableId,
          config.viewId,
          collectionData.videos,
          fieldMappings
        );
      }

      updateProgress('writing', 70, 100, '数据写入完成，正在记录日志...');

      // 4. 记录同步日志到后端
      const logResult = await recordSyncLog({
        mode: config.extractMode || 'video',
        video_ids: collectionData.videos.map(v => v.aweme_id || v.video_id || v.videoId).filter(id => id),
        table_info: {
          table_id: writeResult.tableId,
          table_name: writeResult.tableName,
          view_id: config.viewId,
          view_name: config.viewName || '默认视图'
        },
        fields: convertFrontendFieldsToBackend(config.fields),
        record_count: writeResult.successCount,
        transcription_enabled: config.withTranscription || false,
        transcribed_count: collectionData.videos.filter(v => v.transcription).length
      });

      updateProgress('completed', 100, 100, '数据写入完成！');

      // 5. 构建最终结果
      const finalResult = {
        success: true,
        writeResult,
        logResult,
        summary: {
          totalRecords: collectionData.videos.length,
          successRecords: writeResult.successCount,
          failedRecords: writeResult.errorCount || 0,
          tableName: writeResult.tableName,
          tableId: writeResult.tableId,
          isNewTable: writeResult.isNewTable || false,
          pointsCost: logResult?.points_cost || 0
        }
      };

      logger.info('数据处理完成', { summary: finalResult.summary });

      if (onTableCreated) {
        onTableCreated(finalResult);
      }

      return finalResult;

    } catch (error) {
      logger.error('数据处理失败', error);
      writeError.value = error;
      updateProgress('error', 0, 100, `处理失败: ${error.message}`);
      throw error;
    } finally {
      // 延迟重置进度状态，让用户看到完成状态
      setTimeout(() => {
        writeProgress.isActive = false;
      }, 2000);
    }
  };

  /**
   * 生成字段映射
   * @param {Array} selectedFields - 选中的字段数组
   * @param {Array} availableFields - 可用字段数组
   * @returns {Object} 字段映射对象
   */
  const generateFieldMappings = (selectedFields, availableFields = []) => {
    logger.info('生成字段映射', { selectedFields, availableFields });

    const fieldLabelMap = {
      'title': '标题',
      'aweme_id': '视频ID',
      'share_url': '视频链接',
      'author_nickname': '作者昵称',
      'author_id': '作者ID',
      'create_time_formatted': '发布时间',
      'create_time': '发布时间戳',
      'digg_count': '点赞数',
      'comment_count': '评论数',
      'share_count': '分享数',
      'duration': '视频时长',
      'play_count': '播放量',
      'video_url': '视频播放链接',
      'cover_url': '视频封面链接',
      'transcription': '视频转写内容'
    };

    // 字段名映射 - 前端字段ID到后端字段名的映射
    const fieldNameMapping = {
      'title': 'title',                           // 标题
      'awemeId': 'aweme_id',                      // 视频ID
      'shareUrl': 'share_url',                    // 视频链接
      'authorNickname': 'author_nickname',        // 作者昵称
      'authorId': 'author_id',                    // 作者ID
      'createTimeFormatted': 'create_time_formatted', // 发布时间
      'createTime': 'create_time',                // 发布时间戳
      'diggCount': 'digg_count',                  // 点赞数
      'commentCount': 'comment_count',            // 评论数
      'shareCount': 'share_count',                // 分享数
      'duration': 'duration',                     // 视频时长
      'playCount': 'play_count',                  // 播放量
      'videoUrl': 'video_url',                    // 视频播放链接
      'coverUrl': 'cover_url',                    // 视频封面链接
      'transcription': 'transcription'            // 视频转写内容
    };

    const mappings = {};
    const skippedFields = [];
    
    selectedFields.forEach(fieldKey => {
      // 使用后端实际的字段名
      const backendFieldKey = fieldNameMapping[fieldKey] || fieldKey;
      
      // 检查字段是否在可用字段中
      if (availableFields.length === 0 || availableFields.includes(backendFieldKey)) {
        const label = fieldLabelMap[backendFieldKey] || fieldLabelMap[fieldKey] || fieldKey;
        mappings[backendFieldKey] = label;
      } else {
        skippedFields.push({ 
          frontend: fieldKey, 
          backend: backendFieldKey,
          reason: 'field not available in data'
        });
      }
    });

    logger.info('字段映射生成完成', { 
      originalFields: selectedFields,
      availableFields,
      mappings,
      skippedFields,
      fieldNameMapping 
    });
    
    if (skippedFields.length > 0) {
      logger.warn('部分字段被跳过', { skippedFields });
    }
    
    return mappings;
  };

  /**
   * 将前端字段名转换为后端字段名
   * @param {Array} frontendFields - 前端字段名数组
   * @returns {Array} 后端字段名数组
   */
  const convertFrontendFieldsToBackend = (frontendFields) => {
    const fieldNameMapping = {
      'title': 'title',                           // 标题
      'awemeId': 'aweme_id',                      // 视频ID
      'shareUrl': 'share_url',                    // 视频链接
      'authorNickname': 'author_nickname',        // 作者昵称
      'authorId': 'author_id',                    // 作者ID
      'createTimeFormatted': 'create_time_formatted', // 发布时间
      'createTime': 'create_time',                // 发布时间戳
      'diggCount': 'digg_count',                  // 点赞数
      'commentCount': 'comment_count',            // 评论数
      'shareCount': 'share_count',                // 分享数
      'duration': 'duration',                     // 视频时长
      'playCount': 'play_count',                  // 播放量
      'videoUrl': 'video_url',                    // 视频播放链接
      'coverUrl': 'cover_url',                    // 视频封面链接
      'transcription': 'transcription'            // 视频转写内容
    };

    const backendFields = frontendFields.map(field => fieldNameMapping[field] || field);
    
    logger.info('字段名转换', { 
      frontendFields, 
      backendFields,
      mapping: fieldNameMapping 
    });
    
    return backendFields;
  };

  /**
   * 记录同步日志到后端
   * @param {Object} logData - 日志数据
   * @returns {Promise<Object>} 日志记录结果
   */
  const recordSyncLog = async (logData) => {
    logger.info('记录同步日志', { logData });

    try {
      // 获取API基础URL和认证令牌
      const backendUrl = localStorage.getItem('api_base_url') || 'https://fsbk.dy2bcsm.cn/api';
      const token = localStorage.getItem('access_token');

      if (!token) {
        logger.warn('未找到认证令牌，跳过日志记录');
        return { points_cost: 0 };
      }

      // 发送日志记录请求
      const response = await axios.post(`${backendUrl}/douyin/sync-log`, logData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.code === 0) {
        logger.info('同步日志记录成功', { 
          logId: response.data.data.log_id,
          pointsCost: response.data.data.points_cost 
        });
        return response.data.data;
      } else {
        throw new Error(response.data?.message || '日志记录失败');
      }

    } catch (error) {
      logger.error('记录同步日志失败', error);
      // 日志记录失败不影响主流程，只记录警告
      logger.warn('日志记录失败，但数据写入成功');
      return { points_cost: 0 };
    }
  };

  /**
   * 更新进度状态
   * @param {string} stage - 阶段
   * @param {number} current - 当前进度
   * @param {number} total - 总进度
   * @param {string} message - 进度消息
   */
  const updateProgress = (stage, current, total, message) => {
    writeProgress.stage = stage;
    writeProgress.current = current;
    writeProgress.total = total;
    writeProgress.message = message;
    
    logger.info('进度更新', { stage, current, total, message });
  };

  /**
   * 处理写入错误
   * @param {Error} error - 错误对象
   */
  const handleWriteError = (error) => {
    logger.error('处理写入错误', error);

    // 重置进度状态
    updateProgress('completed', 100, 100, '操作失败');

    // 根据错误类型显示不同的提示
    if (error.message.includes('SDK')) {
      ElMessage.error('飞书SDK未加载，请刷新页面重试');
    } else if (error.message.includes('表格')) {
      ElMessage.error('表格操作失败，请检查表格权限');
    } else if (error.message.includes('字段')) {
      ElMessage.error('字段创建失败，请检查字段配置');
    } else if (error.message.includes('权限')) {
      ElMessage.error('没有权限操作该表格，请检查权限设置');
    } else {
      ElMessage.error(`写入失败: ${error.message}`);
    }
  };

  /**
   * 重置状态
   */
  const resetState = () => {
    writeError.value = null;
    writeProgress.stage = '';
    writeProgress.current = 0;
    writeProgress.total = 0;
    writeProgress.message = '';
    writeProgress.isActive = false;
  };

  /**
   * 格式化数据用于显示
   * @param {Object} result - 处理结果
   * @returns {Object} 格式化后的显示数据
   */
  const formatResultForDisplay = (result) => {
    if (!result || !result.summary) {
      return null;
    }

    const { summary } = result;
    
    return {
      title: summary.isNewTable ? '新表格创建成功' : '数据写入成功',
      tableName: summary.tableName,
      tableId: summary.tableId,
      totalRecords: summary.totalRecords,
      successRecords: summary.successRecords,
      failedRecords: summary.failedRecords,
      pointsCost: summary.pointsCost,
      successRate: summary.totalRecords > 0 
        ? Math.round((summary.successRecords / summary.totalRecords) * 100) 
        : 0
    };
  };

  return {
    // 状态
    writeProgress,
    writeError,
    
    // 方法
    processAndWrite,
    generateFieldMappings,
    convertFrontendFieldsToBackend,
    recordSyncLog,
    handleWriteError,
    resetState,
    formatResultForDisplay,
    updateProgress
  };
} 