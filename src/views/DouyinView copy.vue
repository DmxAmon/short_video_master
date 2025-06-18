<!--
 * @Version    : v1.00
 * @Author     : Amon
 * @Date       : 20245-05-06
 * @desc       : 抖音视频链接提取视图组件
-->
<script setup>
import { ref, reactive, computed, onMounted, onActivated, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import axios from 'axios';
import InfoCard from '../components/common/InfoCard.vue';
import { ArrowDown, Plus, Delete, Lock, Loading, Check, SuccessFilled } from '@element-plus/icons-vue';
import { useRouter } from 'vue-router';
import { bitable } from '@lark-base-open/js-sdk';
// 只导入需要的函数
// 导入环境配置
import { envConfig } from '../config/env';
// 导入日志工具
import { createLogger } from '../utils/logger';
// 导入新的数据处理组合器
import { useDataProcessor } from '../composables/useDataProcessor';
// 导入同步采集服务
import { getSyncVideoCollectionService } from '../services/syncVideoCollection';
// 导入异步采集服务
import { getAsyncCollectionManager } from '../services/asyncCollection';
import { transcriptionService } from '../services/transcriptionService';
import { tableUpdateService } from '../services/tableUpdateService';

// 创建模块日志记录器
const logger = createLogger('DOUYIN');

// ==================== 错误处理工具类和常量 ====================

// 错误代码常量（与后端保持一致）
const ERROR_CODES = {
  // 成功
  SUCCESS: 0,
  
  // 通用错误 (1-99)
  UNKNOWN_ERROR: 1,
  INVALID_PARAMS: 2,
  UNAUTHORIZED: 3,
  FORBIDDEN: 4,
  NOT_FOUND: 5,
  METHOD_NOT_ALLOWED: 6,
  RATE_LIMIT_EXCEEDED: 7,
  SERVER_ERROR: 8,
  
  // 用户相关错误 (100-199)
  USER_NOT_FOUND: 100,
  USER_INACTIVE: 101,
  INSUFFICIENT_PERMISSIONS: 102,
  
  // 积分相关错误 (200-299)
  INSUFFICIENT_POINTS: 200,
  POINTS_DEDUCTION_FAILED: 201,
  POINTS_CHECK_FAILED: 202,
  INVALID_POINTS_AMOUNT: 203,
  POINTS_OPERATION_NOT_ALLOWED: 204,
  
  // 转写相关错误 (300-399)
  TRANSCRIPTION_TASK_NOT_FOUND: 300,
  TRANSCRIPTION_TASK_FAILED: 301,
  TRANSCRIPTION_TASK_TIMEOUT: 302,
  TRANSCRIPTION_TASK_CANCELLED: 303,
  INVALID_AUDIO_URL: 304,
  AUDIO_DOWNLOAD_FAILED: 305,
  AUDIO_FORMAT_NOT_SUPPORTED: 306,
  AUDIO_TOO_LONG: 307,
  AUDIO_TOO_SHORT: 308,
  ASR_SERVICE_ERROR: 309,
  ASR_SERVICE_UNAVAILABLE: 310,
  TRANSCRIPTION_QUOTA_EXCEEDED: 311,
  
  // 阿里云ASR相关错误 (400-499)
  ALIYUN_AUTH_FAILED: 400,
  ALIYUN_QUOTA_EXCEEDED: 401,
  ALIYUN_RATE_LIMIT: 402,
  ALIYUN_SERVICE_ERROR: 403,
  ALIYUN_INVALID_AUDIO: 404,
  ALIYUN_NETWORK_ERROR: 405,
  
  // 数据库相关错误 (500-599)
  DATABASE_ERROR: 500,
  DATABASE_CONNECTION_FAILED: 501,
  RECORD_NOT_FOUND: 502,
  RECORD_CREATION_FAILED: 503,
  RECORD_UPDATE_FAILED: 504,
  RECORD_DELETE_FAILED: 505,
  
  // 业务逻辑错误 (600-699)
  INVALID_OPERATION_STATE: 600,
  OPERATION_NOT_ALLOWED: 601,
  RESOURCE_LOCKED: 602,
  RESOURCE_EXPIRED: 603,
  CONCURRENT_OPERATION_CONFLICT: 604
};

// 业务错误类
class BusinessError extends Error {
  constructor(code, message, errorInfo) {
    super(message);
    this.name = 'BusinessError';
    this.code = code;
    this.errorInfo = errorInfo;
  }
}

// 网络错误类
class NetworkError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NetworkError';
  }
}

// 错误处理工具类
class TranscriptionErrorHandler {
  
  // 处理API响应错误
  static handleApiError(response, context = '') {
    const { code, message, error_details } = response;
    
    logger.error(`API错误 [${context}]`, { code, message, error_details });
    
    switch (code) {
      // 积分相关错误
      case ERROR_CODES.INSUFFICIENT_POINTS:
        return this.handleInsufficientPoints(error_details);
      
      case ERROR_CODES.POINTS_DEDUCTION_FAILED:
        return this.handlePointsDeductionFailed(error_details);
      
      case ERROR_CODES.POINTS_CHECK_FAILED:
        return this.handlePointsCheckFailed();
      
      // 转写相关错误
      case ERROR_CODES.TRANSCRIPTION_TASK_NOT_FOUND:
        return this.handleTaskNotFound(error_details);
      
      case ERROR_CODES.TRANSCRIPTION_TASK_FAILED:
        return this.handleTaskFailed(error_details);
      
      case ERROR_CODES.TRANSCRIPTION_TASK_TIMEOUT:
        return this.handleTaskTimeout();
      
      case ERROR_CODES.INVALID_AUDIO_URL:
        return this.handleInvalidAudioUrl(error_details);
      
      case ERROR_CODES.AUDIO_DOWNLOAD_FAILED:
        return this.handleAudioDownloadFailed(error_details);
      
      // 阿里云ASR错误
      case ERROR_CODES.ALIYUN_AUTH_FAILED:
        return this.handleAliyunAuthFailed();
      
      case ERROR_CODES.ALIYUN_QUOTA_EXCEEDED:
        return this.handleAliyunQuotaExceeded();
      
      case ERROR_CODES.ALIYUN_RATE_LIMIT:
        return this.handleAliyunRateLimit();
      
      case ERROR_CODES.ALIYUN_SERVICE_ERROR:
        return this.handleAliyunServiceError(error_details);
      
      // 通用错误
      case ERROR_CODES.UNAUTHORIZED:
        return this.handleUnauthorized();
      
      case ERROR_CODES.FORBIDDEN:
        return this.handleForbidden();
      
      case ERROR_CODES.RATE_LIMIT_EXCEEDED:
        return this.handleRateLimit();
      
      case ERROR_CODES.SERVER_ERROR:
        return this.handleServerError();
      
      default:
        return this.handleUnknownError(code, message);
    }
  }
  
  // 积分不足处理
  static handleInsufficientPoints(errorDetails) {
    const { current_points, required_points, shortage } = errorDetails || {};
    
    ElMessage.warning({
      message: `积分不足！当前余额：${current_points} 积分，需要：${required_points} 积分，还差：${shortage} 积分`,
      duration: 5000
    });
    
    return {
      type: 'insufficient_points',
      userAction: 'recharge',
      details: errorDetails
    };
  }
  
  // 积分扣费失败处理
  static handlePointsDeductionFailed(errorDetails) {
    const { reason, current_points, attempted_deduction } = errorDetails || {};
    
    ElMessage.error({
      message: `积分扣费失败：${reason}`,
      duration: 3000
    });
    
    return {
      type: 'points_deduction_failed',
      userAction: 'retry',
      details: errorDetails
    };
  }
  
  // 积分检查失败处理
  static handlePointsCheckFailed() {
    ElMessage.warning({
      message: '积分检查失败，将继续执行转写任务',
      duration: 3000
    });
    
    return {
      type: 'points_check_failed',
      userAction: 'continue',
      details: null
    };
  }
  
  // 转写任务不存在处理
  static handleTaskNotFound(errorDetails) {
    const { task_id } = errorDetails || {};
    
    ElMessage.error({
      message: `转写任务不存在：${task_id}`,
      duration: 3000
    });
    
    return {
      type: 'task_not_found',
      userAction: 'restart',
      details: errorDetails
    };
  }
  
  // 转写任务失败处理
  static handleTaskFailed(errorDetails) {
    const { failure_reason, failed_records } = errorDetails || {};
    
    ElMessage.error({
      message: `转写任务失败：${failure_reason}`,
      duration: 5000
    });
    
    if (failed_records && failed_records.length > 0) {
      logger.error('失败的转写记录', failed_records);
    }
    
    return {
      type: 'task_failed',
      userAction: 'retry',
      details: errorDetails
    };
  }
  
  // 转写任务超时处理
  static handleTaskTimeout() {
    ElMessage.error({
      message: '转写任务超时，请稍后重试',
      duration: 3000
    });
    
    return {
      type: 'task_timeout',
      userAction: 'retry',
      details: null
    };
  }
  
  // 音频URL无效处理
  static handleInvalidAudioUrl(errorDetails) {
    const { invalid_urls } = errorDetails || {};
    
    ElMessage.error({
      message: `检测到无效的音频URL，共 ${invalid_urls?.length || 0} 个`,
      duration: 5000
    });
    
    if (invalid_urls && invalid_urls.length > 0) {
      logger.error('无效的音频URL', invalid_urls);
    }
    
    return {
      type: 'invalid_audio_url',
      userAction: 'check_urls',
      details: errorDetails
    };
  }
  
  // 音频下载失败处理
  static handleAudioDownloadFailed(errorDetails) {
    ElMessage.error({
      message: '音频下载失败，请检查网络连接或音频链接',
      duration: 3000
    });
    
    return {
      type: 'audio_download_failed',
      userAction: 'retry',
      details: errorDetails
    };
  }
  
  // 阿里云认证失败处理
  static handleAliyunAuthFailed() {
    ElMessage.error({
      message: '语音识别服务认证失败，请联系管理员',
      duration: 3000
    });
    
    return {
      type: 'aliyun_auth_failed',
      userAction: 'contact_admin',
      details: null
    };
  }
  
  // 阿里云配额超限处理
  static handleAliyunQuotaExceeded() {
    ElMessage.error({
      message: '语音识别服务配额已用完，请稍后重试',
      duration: 3000
    });
    
    return {
      type: 'aliyun_quota_exceeded',
      userAction: 'wait_and_retry',
      details: null
    };
  }
  
  // 阿里云请求频率超限处理
  static handleAliyunRateLimit() {
    ElMessage.warning({
      message: '请求过于频繁，正在自动重试...',
      duration: 3000
    });
    
    return {
      type: 'aliyun_rate_limit',
      userAction: 'auto_retry',
      details: null
    };
  }
  
  // 阿里云服务错误处理
  static handleAliyunServiceError(errorDetails) {
    ElMessage.error({
      message: '语音识别服务暂时不可用，请稍后重试',
      duration: 3000
    });
    
    return {
      type: 'aliyun_service_error',
      userAction: 'retry',
      details: errorDetails
    };
  }
  
  // 未授权处理
  static handleUnauthorized() {
    ElMessage.error({
      message: '登录已过期，请重新登录',
      duration: 3000
    });
    
    // 清除本地token
    localStorage.removeItem('access_token');
    
    return {
      type: 'unauthorized',
      userAction: 'relogin',
      details: null
    };
  }
  
  // 禁止访问处理
  static handleForbidden() {
    ElMessage.error({
      message: '权限不足，无法执行此操作',
      duration: 3000
    });
    
    return {
      type: 'forbidden',
      userAction: 'contact_admin',
      details: null
    };
  }
  
  // 请求频率超限处理
  static handleRateLimit() {
    ElMessage.warning({
      message: '操作过于频繁，请稍后重试',
      duration: 3000
    });
    
    return {
      type: 'rate_limit',
      userAction: 'wait_and_retry',
      details: null
    };
  }
  
  // 服务器错误处理
  static handleServerError() {
    ElMessage.error({
      message: '服务器内部错误，请稍后重试',
      duration: 3000
    });
    
    return {
      type: 'server_error',
      userAction: 'retry',
      details: null
    };
  }
  
  // 未知错误处理
  static handleUnknownError(code, message) {
    ElMessage.error({
      message: `未知错误 (${code}): ${message}`,
      duration: 3000
    });
    
    return {
      type: 'unknown_error',
      userAction: 'retry',
      details: { code, message }
    };
  }
}

// 统一API请求处理函数
const makeApiRequest = async (url, options = {}) => {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // 检查业务错误码
    if (result.code !== ERROR_CODES.SUCCESS) {
      const errorInfo = TranscriptionErrorHandler.handleApiError(result, url);
      throw new BusinessError(result.code, result.message, errorInfo);
    }
    
    return result;
    
  } catch (error) {
    if (error instanceof BusinessError) {
      throw error;
    }
    
    // 网络错误或其他异常
    logger.error('API请求失败', { url, error: error.message });
    ElMessage.error({
      message: '网络连接失败，请检查网络后重试',
      duration: 3000
    });
    
    throw new NetworkError(error.message);
  }
};

// ==================== 转写功能核心函数 ====================

// 初始化数据处理器
const {
  writeProgress,
  writeError,
  processAndWrite,
  generateFieldMappings,
  handleWriteError,
  resetState,
  formatResultForDisplay,
  updateProgress
} = useDataProcessor();

// 接收用户信息
const props = defineProps({
  user: {
    type: Object,
    required: true
  }
});

// 获取路由
const router = useRouter();

// 定义事件
const emit = defineEmits(['data-collected', 'transcribe-selected', 'open-membership']);

// 是否有提取权限
const hasExtractPermission = computed(() => {
  // 优先检查新的权限命名
  return props.user.permissions.includes('douyin:basic') || 
         props.user.permissions.includes('douyin_collect') ||
         props.user.permissions.includes('extract');
});

// 是否有高级提取权限（作者模式，需要批量权限）
const hasAuthorExtractPermission = computed(() => {
  // 优先检查新的权限命名
  return props.user.permissions.includes('douyin:batch') ||
         props.user.permissions.includes('batch');
});

// 用于开发环境和模板渲染的标志
const isDev = import.meta.env.DEV;

// 提取模式 - 单视频 vs 作者主页
const extractMode = ref('author'); // 'video' 或 'author'

// 定义字段选择配置 - 更新为与后端API一致的字段名
const fields = reactive({
  title: { selected: true, label: '标题', id: 'title', backendField: 'title' },
  awemeId: { selected: true, label: '视频ID', id: 'awemeId', backendField: 'aweme_id' },
  shareUrl: { selected: true, label: '视频链接', id: 'shareUrl', backendField: 'share_url' },
  authorNickname: { selected: true, label: '作者昵称', id: 'authorNickname', backendField: 'author_nickname' },
  authorId: { selected: false, label: '作者ID', id: 'authorId', backendField: 'author_id' },
  createTimeFormatted: { selected: true, label: '发布时间', id: 'createTimeFormatted', backendField: 'create_time_formatted' },
  diggCount: { selected: true, label: '点赞数', id: 'diggCount', backendField: 'digg_count' },
  commentCount: { selected: true, label: '评论数', id: 'commentCount', backendField: 'comment_count' },
  shareCount: { selected: true, label: '分享数', id: 'shareCount', backendField: 'share_count' },
  duration: { selected: true, label: '视频时长', id: 'duration', backendField: 'duration' },
  playCount: { selected: true, label: '播放量', id: 'playCount', backendField: 'play_count' },
  // 可选字段（需要在请求中指定）
  videoUrl: { selected: false, label: '视频播放链接', id: 'videoUrl', backendField: 'video_url' },
  coverUrl: { selected: false, label: '视频封面链接', id: 'coverUrl', backendField: 'cover_url' },
  createTime: { selected: false, label: '发布时间戳', id: 'createTime', backendField: 'create_time' },
  // 转写字段
  transcription: { selected: false, label: '视频转写内容', id: 'transcription', backendField: 'transcription' }
});

// 字段映射函数：将前端字段ID转换为后端字段名
const mapFieldsToBackend = (frontendFields) => {
  return frontendFields.map(fieldId => {
    const field = Object.values(fields).find(f => f.id === fieldId);
    return field ? field.backendField : fieldId;
  }).filter(field => field); // 过滤掉无效字段
};

// 获取需要请求的可选字段
const getOptionalFields = (selectedFieldIds) => {
  const optionalFieldIds = ['videoUrl', 'coverUrl', 'createTime', 'authorId'];
  return selectedFieldIds
    .filter(fieldId => optionalFieldIds.includes(fieldId))
    .map(fieldId => {
      const field = Object.values(fields).find(f => f.id === fieldId);
      return field ? field.backendField : fieldId;
    })
    .filter(field => field);
};

// 抖音数据状态
const douyinData = reactive({
  inputUrl: '',
  secUserId: '',
  extractMode: 'author', // 'video' 或 'author'
  isLoading: false,
  error: null,
  creatorInfo: null,
  videos: [],
  previewVideos: []
});

// 预览状态
const activeView = ref('form'); // 'form' 或 'preview'
const selectedPreviewVideos = ref([]);

// 组件状态
const loading = ref(false);
const error = ref(null);

// 是否使用模拟数据（正式环境不使用）
const useMockData = ref(false);

// 字段选择区域是否展开
const fieldSelectExpanded = ref(false);

// 多链接输入列表
const inputUrls = ref(['']);

// 为单视频模式和作者模式创建独立的输入框列表
const videoInputUrls = ref(['']);
const authorInputUrls = ref(['']);

// 根据当前模式获取对应的输入框列表
const getCurrentInputUrls = () => {
  return extractMode.value === 'video' ? videoInputUrls : authorInputUrls;
};

// 获取当前用户可以添加的最大链接数量
const getMaxInputCount = computed(() => {
  if (props.user.memberLevel === 'enterprise') {
    return 10; // 专业会员最多10个链接
  } else if (props.user.memberLevel === 'pro') {
    return 10; // 高级会员最多10个链接
  } else {
    return 1; // 基础会员只能单链接
  }
});

// 检查是否有添加多链接的权限
const hasMultiLinkPermission = computed(() => {
  return props.user.memberLevel === 'pro' || props.user.memberLevel === 'enterprise';
});

// 检查是否有指定等级的会员权限
const hasMemberPermission = (level) => {
  const levelOrder = { free: 0, basic: 1, pro: 2, enterprise: 3 };
  const userLevel = props.user.memberLevel || 'free';
  return levelOrder[userLevel] >= levelOrder[level];
};

// 获取基础字段组
const getBasicFields = () => {
  return Object.values(fields).filter(field => 
    ['title', 'awemeId', 'shareUrl', 'authorNickname', 'createTimeFormatted', 'diggCount', 'commentCount', 'shareCount'].includes(field.id)
  );
};

// 获取数据字段组
const getDataFields = () => {
  const dataFields = Object.values(fields).filter(field => 
    !['title', 'awemeId', 'shareUrl', 'authorNickname', 'createTimeFormatted', 'diggCount', 'commentCount', 'shareCount'].includes(field.id)
  );
  
  // 添加会员权限属性
  return dataFields.map(field => {
    if (['authorId', 'authorFollowerCount'].includes(field.id)) {
      return { ...field, memberOnly: true, requiredLevel: 'basic' };
    } else {
      return { ...field, memberOnly: true, requiredLevel: 'pro' };
    }
  });
};


// 表格选择相关变量
const tableOption = ref('current');
const selectedTable = ref('');
const selectedView = ref('');
const newTableName = ref('抖音视频数据');
const isLoadingTables = ref(false);
const isLoadingViews = ref(false);
const availableTables = ref([]);
const availableViews = ref([]);

// 生成唯一表名函数
const generateUniqueTableName = () => {
  const now = new Date();
  const timestamp = `${now.getMonth()+1}${now.getDate()}_${now.getHours()}${now.getMinutes()}`;
  return `${newTableName.value}_${timestamp}`;
};

// 从飞书多维表格获取数据表 - 只使用bitable SDK直接获取
const loadAvailableTables = async () => {
  console.log('=== loadAvailableTables 函数开始执行 ===');
  isLoadingTables.value = true;
  
  try {
    // 检查SDK状态
    console.log('检查SDK状态:');
    console.log('  - bitable存在:', !!bitable);
    console.log('  - bitable.base存在:', !!(bitable && bitable.base));
    console.log('  - getTableMetaList方法存在:', !!(bitable && bitable.base && bitable.base.getTableMetaList));
    
    // 使用SDK直接获取表格列表
    if (bitable && bitable.base) {
      console.log('🚀 调用 bitable.base.getTableMetaList()...');
      
      const tables = await bitable.base.getTableMetaList();
      console.log('📥 SDK返回的原始数据:', tables);
      console.log('📝 数据类型:', typeof tables);
      console.log('📝 是否为数组:', Array.isArray(tables));
      console.log('📝 数据长度:', tables ? tables.length : 'undefined');
      
      if (tables && Array.isArray(tables) && tables.length > 0) {
        // 处理每个表格的元数据
        console.log('🔍 开始处理表格数据，总数:', tables.length);
        
        const processedTables = tables.map((tableMeta, index) => {
          console.log(`处理表格 ${index + 1}:`, {
            id: tableMeta.id,
            name: tableMeta.name,
            isSync: tableMeta.isSync,
            fullMeta: tableMeta
          });
          
          // 检查表格名称是否包含数字开头
          const startsWithNumber = /^\d/.test(tableMeta.name);
          console.log(`表格 "${tableMeta.name}" 是否以数字开头:`, startsWithNumber);
          
          return {
            id: tableMeta.id,
            name: tableMeta.name
          };
        });
        
        console.log('🔍 处理完成的表格列表:', processedTables);
        console.log('🔍 数字开头的表格:', processedTables.filter(t => /^\d/.test(t.name)));
        
        availableTables.value = processedTables;
        console.log('✅ 成功处理的表格列表:', availableTables.value);
        
        // 如果有数据表，默认选择第一个
        if (availableTables.value.length > 0) {
          selectedTable.value = availableTables.value[0].id;
          console.log('✅ 默认选择表格:', selectedTable.value);
        }
        
        console.log('✅ 通过SDK成功获取到', availableTables.value.length, '个数据表');
      } else {
        // 没有获取到表格时提供空数组
        console.warn('⚠️ SDK返回的数据为空或格式不正确');
        console.warn('  - tables值:', tables);
        console.warn('  - 是否为数组:', Array.isArray(tables));
        console.warn('  - 长度:', tables ? tables.length : 'N/A');
        
        availableTables.value = [];
        console.warn('❌ 没有找到可用的数据表');
      }
    } else {
      console.error('❌ 飞书SDK检查失败:');
      console.error('  - bitable存在:', !!bitable);
      console.error('  - bitable.base存在:', !!(bitable && bitable.base));
      
      availableTables.value = [];
    }
  } catch (error) {
    console.error('❌ 获取数据表失败:', error);
    console.error('❌ 错误详情:', error.message);
    console.error('❌ 错误堆栈:', error.stack);
    
    // 不向用户显示错误消息，但在控制台详细记录
    availableTables.value = [];
  } finally {
    isLoadingTables.value = false;
    console.log('=== loadAvailableTables 函数执行完成 ===');
    console.log('最终结果 - 表格数量:', availableTables.value.length);
  }
};

// 更新视图列表 - 直接使用SDK获取视图
const updateViewsList = async () => {
  if (!selectedTable.value) {
    availableViews.value = [];
    selectedView.value = '';
    return;
  }
  
  isLoadingViews.value = true;
  try {
    // 使用bitable SDK获取视图列表
    if (bitable && bitable.base) {
      try {
        const table = await bitable.base.getTableById(selectedTable.value);
        if (table) {
          const viewList = await table.getViewList();
          // 获取每个视图的元数据
          const viewMetaList = [];
          for (const view of viewList) {
            const meta = await view.getMeta();
            viewMetaList.push(meta);
          }
          availableViews.value = viewMetaList;
          
          // 如果有视图，默认选择第一个
          if (viewMetaList && viewMetaList.length > 0) {
            selectedView.value = viewMetaList[0].id;
          } else {
            selectedView.value = '';
          }
          
          console.log('通过SDK成功获取到', availableViews.value.length, '个视图');
          return;
        }
      } catch (sdkError) {
        console.warn('通过SDK获取视图列表失败，尝试使用备选方式:', sdkError);
      }
    }
    
    // 备选方案1：尝试使用table.getViewMetaList
    try {
      const table = await bitable.base.getTableById(selectedTable.value);
      if (table) {
        const viewMetaList = await table.getViewMetaList();
        availableViews.value = viewMetaList || [];
        
        // 如果有视图，默认选择第一个
        if (viewMetaList && viewMetaList.length > 0) {
          selectedView.value = viewMetaList[0].id;
        } else {
          selectedView.value = '';
        }
        
        console.log('通过getViewMetaList成功获取到', availableViews.value.length, '个视图');
        return;
      }
    } catch (metaError) {
      console.warn('通过getViewMetaList获取视图列表失败:', metaError);
    }
    
    // 所有方式都失败时，使用默认视图
    console.warn('所有方式获取视图列表均失败，使用默认视图');
    availableViews.value = [{ id: 'default', name: '默认视图' }];
    selectedView.value = 'default';
    
  } catch (error) {
    console.error('获取视图列表失败:', error);
    // 不向用户显示错误，仅在控制台记录
    availableViews.value = [{ id: 'default', name: '默认视图' }];
    selectedView.value = 'default';
  } finally {
    isLoadingViews.value = false;
  }
};

// 处理表格选择变更 - 只使用自己的实现，不调用后端接口
const handleTableChange = async (value) => {
  selectedTable.value = value;
  selectedView.value = '';
  availableViews.value = [];
  
  if (value) {
    // 先使用bitable.ui.switchToTable方法切换到用户选择的表格
    try {
      if (bitable && bitable.ui && bitable.ui.switchToTable) {
        console.log('正在切换到用户选择的表格:', value);
        const switchResult = await bitable.ui.switchToTable(value);
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
    
    // 然后更新视图列表
    updateViewsList();
  }
};

// 处理视图选择变更
const handleViewChange = (value) => {
  selectedView.value = value;
};

// 监听表格选择变化，更新视图列表
watch(selectedTable, () => {
  updateViewsList();
});

// 获取预计完成时间
const getEstimatedTime = () => {
  const urlCount = getAllInputUrls().length;
  const isAuthorMode = extractMode.value === 'author';
  
  if (isAuthorMode) {
    // 作者模式下每个链接会获取多个视频，处理时间更长
    const baseTime = urlCount * 8; // 基础时间，单位秒
    
    if (props.user.memberLevel === 'enterprise') {
      return `约 ${Math.max(5, Math.ceil(baseTime * 0.5))} 秒`;
    } else if (props.user.memberLevel === 'pro') {
      return `约 ${Math.max(10, Math.ceil(baseTime * 0.7))} 秒`;
    } else {
      return `约 ${Math.max(15, baseTime)} 秒`;
    }
  } else {
    // 单视频模式
    const baseTime = urlCount * 3; // 基础时间，单位秒
    
    if (props.user.memberLevel === 'enterprise') {
      return `约 ${Math.max(2, Math.ceil(baseTime * 0.5))} 秒`;
    } else if (props.user.memberLevel === 'pro') {
      return `约 ${Math.max(5, Math.ceil(baseTime * 0.7))} 秒`;
    } else {
      return `约 ${Math.max(8, baseTime)} 秒`;
    }
  }
};

// 添加一个新的链接输入框
const addUrlInput = () => {
  // 作者模式不允许添加多个链接
  if (extractMode.value === 'author') {
    ElMessage.warning('作者主页采集仅支持单链接');
    return;
  }
  
  // 检查是否有多链接权限
  if (!hasMultiLinkPermission.value) {
    ElMessage.warning('基础会员仅支持单链接采集，请升级会员');
    return;
  }
  
  // 检查是否达到最大链接数量
  const currentUrls = getCurrentInputUrls();
  if (currentUrls.value.length >= getMaxInputCount.value) {
    ElMessage.warning(`最多支持${getMaxInputCount.value}个链接同时采集`);
    return;
  }
  
  // 只在单视频模式下添加输入框
  if (extractMode.value === 'video') {
    videoInputUrls.value.push('');
  }
};

// 移除链接输入框
const removeUrlInput = (index) => {
  // 作者模式不允许删除（因为只有一个输入框）
  if (extractMode.value === 'author') {
    return;
  }
  
  // 只在单视频模式下处理删除
  if (extractMode.value === 'video') {
    if (videoInputUrls.value.length > 1) {
      videoInputUrls.value.splice(index, 1);
    } else {
      videoInputUrls.value = [''];
    }
  }
};

// 调用后端API采集视频数据 - 根据模式选择同步或异步采集
const collectVideoData = async (urls, selectedFieldIds, withTranscription = false) => {
  logger.info('开始采集', { mode: extractMode.value, urls, selectedFieldIds, withTranscription });
  
  try {
    // 获取需要请求的可选字段
    const optionalFields = getOptionalFields(selectedFieldIds);
    logger.info('映射后的可选字段', { selectedFieldIds, optionalFields });
    
    if (extractMode.value === 'video') {
      // 单视频模式：使用同步采集
      logger.info('使用同步采集服务');
      const syncService = getSyncVideoCollectionService();
      
      // 使用同步采集服务的带进度回调方法
      const result = await syncService.collectWithProgress(
        urls,
        optionalFields, // 使用映射后的字段名
        withTranscription,
        {
          onStart: () => {
            logger.info('同步采集任务启动');
            updateProgress('preparing', 10, 100, '正在启动采集任务...');
          },
          
          onProgress: (progress) => {
            logger.info('同步采集进度更新', progress);
            updateProgress('processing', progress.progress || 50, 100, progress.message || '正在采集中...');
          },
          
          onComplete: (result) => {
            logger.info('同步采集完成', { total: result.total });
            updateProgress('processing', 90, 100, '采集完成，正在处理数据...');
          },
          
          onError: (error) => {
            logger.error('同步采集失败', error);
            throw error;
          }
        }
      );
      
      logger.info('同步采集成功', { total: result.total });
      return result;
      
    } else {
      // 作者模式：使用异步采集
      logger.info('使用异步采集服务');
      const manager = getAsyncCollectionManager();
      
      // 根据会员等级设置最大视频数量
      let maxVideos = 5; // 默认值
      if (props.user.memberLevel === 'enterprise') {
        maxVideos = 50;
      } else if (props.user.memberLevel === 'pro') {
        maxVideos = 20;
      } else if (props.user.memberLevel === 'basic') {
        maxVideos = 10;
      }
      
      // 更新管理器的最大视频数量
      manager.maxVideosPerAuthor = maxVideos;
      
      // 使用异步采集
      const result = await manager.collectWithProgress(
        urls,
        optionalFields, // 使用映射后的字段名
        withTranscription,
        extractMode.value, // 'author'
        {
          onStart: () => {
            logger.info('异步采集任务启动');
            updateProgress('preparing', 10, 100, '正在启动采集任务...');
          },
          
          onProgress: (progress) => {
            logger.info('异步采集进度更新', progress);
            
            // 计算进度百分比
            const progressPercent = Math.min(30 + (progress.pollCount * 5), 80);
            
            // 格式化时间
            const elapsedSeconds = Math.floor(progress.elapsedTime / 1000);
            const timeStr = elapsedSeconds > 60 
              ? `${Math.floor(elapsedSeconds / 60)}分${elapsedSeconds % 60}秒`
              : `${elapsedSeconds}秒`;
            
            // 更新进度显示
            const message = progress.message || `正在采集中... (第${progress.pollCount}次查询，已用时${timeStr})`;
            updateProgress('processing', progressPercent, 100, message);
          },
          
          onComplete: (result) => {
            logger.info('异步采集完成', { total: result.total });
            updateProgress('processing', 90, 100, '采集完成，正在处理数据...');
          },
          
          onError: (error) => {
            logger.error('异步采集失败', error);
            throw error;
          }
        }
      );
      
      logger.info('异步采集成功', { total: result.total });
      return result;
    }
    
  } catch (error) {
    logger.error('采集失败', error);
    
    // 处理特定错误
    if (error.message.includes('任务处理超时')) {
      throw new Error('采集任务处理时间较长，请稍后重试或减少采集数量');
    } else if (error.message.includes('未找到认证令牌')) {
      throw new Error('认证已过期，请刷新页面重新登录');
    } else {
      throw error;
    }
  }
};

// 更新搜索创作者函数，使用真实API替代模拟数据
const searchCreator = async () => {
  if (!validateSelections()) {
    return;
  }
  
  // 重置状态
  resetState();
  
  // 收集当前选中的字段
  const selectedFields = getSelectedFields();
  const selectedFieldIds = selectedFields.map(field => field.id);
  
  // 收集输入的链接
  const inputUrls = getAllInputUrls();
  if (inputUrls.length === 0) {
    ElMessage.warning('请至少输入一个链接');
    return;
  }
  
  // 开始数据收集过程
  loading.value = true;
  
  try {
    // 1. 调用异步采集API
    const collectionResult = await collectVideoData(inputUrls, selectedFieldIds, false);
    
    // 提取视频数据
    const videos = collectionResult.videos || [];
    
    if (videos.length === 0) {
      ElMessage.warning('未找到任何视频数据');
      loading.value = false;
      return;
    }
    
    // 保存作者信息（如果有）
    if (collectionResult.authors && collectionResult.authors.length > 0) {
      douyinData.creatorInfo = collectionResult.authors[0];
    }
    
    // 2. 准备写入配置
    const writeConfig = {
      mode: tableOption.value, // 'new' 或 'current'
      extractMode: extractMode.value, // 'video' 或 'author'
      fields: selectedFieldIds,
      withTranscription: false
    };
    
    if (tableOption.value === 'new') {
      // 创建新表格
      writeConfig.tableName = generateUniqueTableName();
    } else {
      // 使用现有表格
      writeConfig.tableId = selectedTable.value;
      writeConfig.viewId = selectedView.value;
      writeConfig.tableName = availableTables.value.find(t => t.id === selectedTable.value)?.name || '未知表格';
      writeConfig.viewName = availableViews.value.find(v => v.id === selectedView.value)?.name || '默认视图';
    }
    
    // 3. 前端处理并写入表格
    const writeResult = await processAndWrite(collectionResult, writeConfig, handleTableCreated);
    
    // 4. 保存采集到的视频数据
    douyinData.videos = videos;
    
    // 5. 显示成功消息
    const displayResult = formatResultForDisplay(writeResult);
    if (displayResult) {
      const successMsg = `${displayResult.title}！成功处理 ${displayResult.successRecords}/${displayResult.totalRecords} 条记录到表格 "${displayResult.tableName}"`;
      ElMessage.success(successMsg);
      
      // 如果有积分消耗，显示积分信息
      if (displayResult.pointsCost > 0) {
        ElMessage.info(`本次操作消耗 ${displayResult.pointsCost} 积分`);
      }
    }
    
    // 6. 发送采集的数据到父组件
    emit('data-collected', { 
      data: videos,
      config: writeConfig,
      result: writeResult
    });
    
  } catch (error) {
    console.error('采集过程出错:', error);
    handleWriteError(error);
  } finally {
    loading.value = false;
  }
};

// 根据字段ID获取适合的字段类型
const getFieldType = (fieldId) => {
  // 根据字段ID推断合适的字段类型
  const typeMap = {
    'title': 'text',
    'awemeId': 'text',
    'shareUrl': 'url',
    'authorNickname': 'text',
    'authorId': 'text',
    'authorFollowerCount': 'number',
    'createTime': 'date',
    'diggCount': 'number',
    'commentCount': 'number',
    'shareCount': 'number',
    'duration': 'text',
    'playCount': 'number',
    'transcription': 'text'
  };
  
  return typeMap[fieldId] || 'text'; // 默认为文本类型
};

// 生成模拟视频数据
const generateMockVideos = (urls, isTranscribe = false) => {
  // 决定生成多少条记录 (转写场景生成较少的视频)
  const count = isTranscribe ? 
    Math.min(urls.length * 3, 10) : // 转写场景：每个链接最多3个视频，总共最多10个
    Math.min(urls.length * 5, 20);  // 纯采集场景：每个链接最多5个视频，总共最多20个
  
  const videos = [];
  
  // 可能的标题前缀
  const titlePrefixes = [
    '如何用3分钟学会', '震惊！这才是', '专业老师教你', '这个技巧太厉害了', 
    '不看后悔系列：', '学会这招，轻松', '你不知道的秘密：', '大神分享：'
  ];
  
  // 可能的标题主题
  const titleTopics = [
    '抖音算法', '短视频制作', '视频剪辑技巧', '涨粉秘籍', 
    'AI绘画', '数据分析', '运营策略', '流量密码'
  ];
  
  // 可能的视频描述
  const descriptions = [
    '这个视频教你如何快速掌握核心技能，让你的账号快速增长粉丝！',
    '很多人都不知道这个小技巧，用了之后效果立竿见影！',
    '经过多年经验总结出来的方法，简单易上手，效果特别好！',
    '这是我用了三年才摸索出来的经验，今天无私分享给大家！',
    '按照视频的方法做，粉丝涨了10倍，赶紧收藏起来慢慢看！'
  ];
  
  // 生成随机的作者信息
  const authorNickname = ['抖音达人', '剪辑高手', 'AI专家', '数据分析师', '短视频教程'][Math.floor(Math.random() * 5)] + 
                        Math.floor(Math.random() * 1000).toString();
  const authorId = 'author_' + Math.random().toString(36).substring(2, 10);
  const authorFollowerCount = Math.floor(Math.random() * 1000000) + 1000;
  
  // 为每个视频生成数据
  for (let i = 0; i < count; i++) {
    const titlePrefix = titlePrefixes[Math.floor(Math.random() * titlePrefixes.length)];
    const titleTopic = titleTopics[Math.floor(Math.random() * titleTopics.length)];
    const title = `${titlePrefix}${titleTopic}${i+1}`;
    
    const createTime = new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const likeCount = Math.floor(Math.random() * 50000) + 100;
    const commentCount = Math.floor(Math.random() * 5000) + 10;
    const shareCount = Math.floor(Math.random() * 3000) + 5;
    const forwardCount = Math.floor(Math.random() * 1000) + 1;
    const downloadCount = Math.floor(Math.random() * 500);
    const duration = Math.floor(Math.random() * 60) + 15; // 15-75秒
    const playCount = Math.floor(Math.random() * 100000) + 500;
    
    // 使用链接或生成随机的视频ID和链接 - 确保是有效的URL字符串
    const urlIndex = i % urls.length;
    let videoUrl = urls[urlIndex] || '';
    
    // 确保URL是字符串格式，并且是有效的URL
    if (!videoUrl || typeof videoUrl !== 'string' || !videoUrl.trim()) {
      // 生成一个有效的抖音链接格式
      const randomId = Math.random().toString(36).substring(2, 10);
      videoUrl = `https://www.douyin.com/video/${randomId}`;
    } else if (!videoUrl.startsWith('http')) {
      // 如果用户输入的不是完整URL，添加协议前缀
      videoUrl = `https://www.douyin.com/video/${videoUrl.replace(/[^a-zA-Z0-9]/g, '')}`;
  }
    
    const videoId = 'v_' + Math.random().toString(36).substring(2, 10);
    
    // 如果是转写场景，添加转写文本
    let transcription = null;
    if (isTranscribe) {
      const transcriptionParts = [
        '大家好，今天我来分享一个实用技巧。',
        '首先，我们需要了解这个领域的基本知识。',
        '其次，掌握核心方法很重要。',
        '最后，持续练习才能取得进步。',
        '如果觉得有帮助，请点赞关注，谢谢大家！'
      ];
      transcription = transcriptionParts.join(' ');
    }
    
    // 生成一个完整的视频对象
    const video = {
      id: i + 1,
      videoId: videoId,
      videoUrl: videoUrl,
      title: title,
      description: descriptions[Math.floor(Math.random() * descriptions.length)],
      authorNickname: authorNickname,
      authorId: authorId,
      authorFollowerCount: authorFollowerCount,
      createTime: createTime,
      likeCount: likeCount,
      commentCount: commentCount,
      shareCount: shareCount,
      forwardCount: forwardCount,
      downloadCount: downloadCount,
      duration: `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`,
      playCount: playCount,
    };
    
    // 如果是转写场景，添加转写文本
    if (isTranscribe) {
      video.transcription = transcription;
    }
    
    videos.push(video);
  }
  
  return videos;
};

// 返回表单视图
const backToForm = () => {
  activeView.value = 'form';
  selectedPreviewVideos.value = [];
};

// 全选/取消全选预览视频
const toggleSelectAllVideos = () => {
  if (selectedPreviewVideos.value.length === douyinData.videos.length) {
    // 全部取消
    selectedPreviewVideos.value = [];
  } else {
    // 全部选择
    selectedPreviewVideos.value = [...douyinData.videos];
  }
};

// 选择/取消选择单个视频
const toggleSelectVideo = (video) => {
  const index = selectedPreviewVideos.value.findIndex(v => v.id === video.id);
  if (index === -1) {
    selectedPreviewVideos.value.push(video);
  } else {
    selectedPreviewVideos.value.splice(index, 1);
  }
};

// 复制选中视频的链接
const copySelectedLinks = async () => {
  if (selectedPreviewVideos.value.length === 0) {
    ElMessage.warning('请至少选择一个视频');
    return;
  }
  
  try {
    // 生成格式化文本
    const links = selectedPreviewVideos.value
      .map(video => video.videoUrl)
      .join('\n');
    
    await navigator.clipboard.writeText(links);
    ElMessage.success('已复制链接到剪贴板');
  } catch (error) {
    console.error('复制失败:', error);
    ElMessage.error('复制失败，请手动复制');
  }
};

// 复制选中视频的完整信息
const copySelectedInfo = async () => {
  if (selectedPreviewVideos.value.length === 0) {
    ElMessage.warning('请至少选择一个视频');
    return;
  }
  
  try {
    // 获取选中的字段
    const selectedFields = getSelectedFields();
    
    // 生成格式化文本
    let result = '';
    
    selectedPreviewVideos.value.forEach((video, index) => {
      if (index > 0) result += '\n\n--------------------\n\n';
      
      selectedFields.forEach(field => {
        if (video[field.id] !== undefined) {
          result += `${field.label}: ${video[field.id]}\n`;
        }
      });
    });
    
    await navigator.clipboard.writeText(result);
    ElMessage.success('已复制信息到剪贴板');
  } catch (error) {
    console.error('复制失败:', error);
    ElMessage.error('复制失败，请手动复制');
  }
};

// 组件挂载时的操作
onMounted(async () => {
  // 不使用模拟数据，强制使用真实API
  useMockData.value = false;
  console.log('DouyinView 组件挂载完成, 使用真实API模式');
  
  // 检查是否有作者采集权限，没有则切换到单视频模式
  if (!hasAuthorExtractPermission.value) {
    extractMode.value = 'video';
    douyinData.extractMode = 'video';
    console.log('用户没有作者采集权限，已切换到单视频模式');
  }
  
  // 检查飞书SDK是否可用
  console.log('=== 检查飞书SDK状态 ===');
  console.log('bitable SDK导入状态:', !!bitable);
  console.log('bitable.base存在:', !!(bitable && bitable.base));
  console.log('getTableMetaList方法存在:', !!(bitable && bitable.base && bitable.base.getTableMetaList));
  
  if (!bitable || !bitable.base) {
    console.error('飞书SDK未正确加载，无法获取数据表');
    ElMessage.warning('飞书SDK未加载，无法获取数据表列表');
    return;
  }
  
  // 检查认证状态，确保用户已认证
  const token = localStorage.getItem('access_token'); // 使用正确的token key
  if (!token) {
    console.warn('用户未认证，无法加载数据表');
    ElMessage.warning('请先完成认证');
    return;
  }
  
  // 获取API基础URL - 从localStorage或使用默认值
  const backendUrl = localStorage.getItem('api_base_url') || 'https://fsbk.dy2bcsm.cn/api';
  
  // 验证令牌有效性 - 使用正确的API路径
  try {
    console.log('验证认证状态，API路径:', `${backendUrl}/plugin-auth/user`);
    const response = await fetch(`${backendUrl}/plugin-auth/user`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.warn('认证令牌无效，状态码:', response.status);
      ElMessage.warning('认证已过期，请重新登录');
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_info');
      return;
    }
    
    const userInfo = await response.json();
    console.log('认证验证成功，用户信息:', userInfo);
  } catch (error) {
    console.error('验证认证状态失败:', error);
    ElMessage.warning('无法验证认证状态，请刷新页面重试');
    return;
  }
  
  // 加载可用数据表
  try {
    console.log('=== 开始加载数据表 ===');
    await loadAvailableTables();
    console.log('加载到', availableTables.value.length, '个数据表');
    console.log('数据表列表:', availableTables.value);
    
    // 如果有数据表，默认选择第一个
    if (availableTables.value.length > 0) {
      selectedTable.value = availableTables.value[0].id;
      console.log('默认选择表格ID:', selectedTable.value);
      
      // 加载视图列表
      await updateViewsList();
      console.log('默认选择表格:', selectedTable.value, '加载到视图数量:', availableViews.value.length);
      console.log('视图列表:', availableViews.value);
    } else {
      console.warn('没有找到任何数据表');
    }
  } catch (error) {
    console.error('初始化表格和视图数据失败:', error);
    // 不显示错误消息给用户，只在控制台记录
  }
});

// 组件激活时的处理
onActivated(() => {
  console.log('DouyinView 组件被激活');
  console.log('用户权限:', props.user.permissions);
  console.log('提取权限状态:', hasExtractPermission.value);
  console.log('作者提取权限状态:', hasAuthorExtractPermission.value);
  
  // 检查是否有作者采集权限，没有则显示提示
  if (extractMode.value === 'author' && !hasAuthorExtractPermission.value) {
    ElMessage.warning('作者模式需要批量会员权限，已为您切换到单视频模式');
    extractMode.value = 'video';
    douyinData.extractMode = 'video';
  }
});

// 切换模拟数据模式（仅开发环境可用）
const toggleMockDataMode = () => {
  useMockData.value = !useMockData.value;
  localStorage.setItem('use_mock_data', useMockData.value ? 'true' : 'false');
  ElMessage.success(useMockData.value ? '已切换到模拟数据模式' : '已切换到真实API模式');
};

// 选择视频进行转写
const selectVideosForTranscription = () => {
  if (selectedPreviewVideos.value.length === 0) {
    ElMessage.warning('请选择要转写的视频');
    return;
  }
  
  // 发送事件，将选中的视频传递给父组件用于转写
  emit('transcribe-selected', selectedPreviewVideos.value);
  
  // 可选：切换到转写视图
  ElMessage.success(`已选择 ${selectedPreviewVideos.value.length} 个视频进行转写`);
};

// 打开会员中心
const openMembershipCenter = () => {
  emit('open-membership');
  router.push('/membership');
};

// 更新validateSelections函数
const validateSelections = () => {
  // 确保至少选中一个字段
  if (!getSelectedFields().length) {
    ElMessage.error('请至少选择一个抓取字段');
    return false;
  }
  
  // 检查表格选项
  if (tableOption.value === 'current') {
    if (!selectedTable.value) {
      ElMessage.error('请选择要导入的数据表');
      return false;
    }
    
    // 视图可以使用默认值，不必强制要求
  } else if (tableOption.value === 'new' && !newTableName.value.trim()) {
    ElMessage.error('请输入新表格名称');
    return false;
  }
  
  return true;
}

// 搜索创作者时收集所有链接
const getAllInputUrls = () => {
  if (extractMode.value === 'video') {
    return videoInputUrls.value.filter(url => url.trim() !== '');
  } else {
    // 作者模式只返回第一个链接
    const firstUrl = authorInputUrls.value[0] || '';
    return firstUrl.trim() !== '' ? [firstUrl.trim()] : [];
  }
};

// 获取选中的字段
const getSelectedFields = () => {
  return Object.values(fields).filter(field => field.selected);
};

// 切换提取模式
const toggleExtractMode = (mode) => {
  extractMode.value = mode;
  douyinData.extractMode = mode;
  douyinData.error = null;
  
  // 如果切换到作者模式，但用户没有权限
  if (mode === 'author' && !hasAuthorExtractPermission.value) {
    ElMessage.warning('作者模式需要会员权限，请升级后使用');
    extractMode.value = 'video';
    douyinData.extractMode = 'video';
  }
};

// 重新实现滚动表格功能，使用记录选择和延迟执行的方式
const scrollTableToBottom = async () => {
  try {
    if (bitable && bitable.base) {
      // 首先切换到当前选中的表格
      if (bitable.ui && bitable.ui.switchToTable) {
        await bitable.ui.switchToTable(selectedTable.value);
      }
      
      // 等待UI更新
      await new Promise(resolve => setTimeout(resolve, 300));
      
      console.log('表格已切换, 准备滚动');
    }
  } catch (scrollError) {
    console.warn('准备滚动表格失败:', scrollError);
  }
};

// 一个新的实现，在添加记录后选择并关注新记录，实现类似滚动的效果
const focusOnNewRecord = async (recordId, tableId, isNewTable = false) => {
  try {
    if (!recordId || !tableId) return;
    
    // 确保使用正确的表格ID
    const targetTableId = tableId || selectedTable.value;
    
    if (bitable && bitable.ui) {
      // 根据是否是新表格，显示不同的提示
      if (!isNewTable) {
        // 对现有表格，提示数据从底部添加
        ElMessage({
          message: '数据开始添加，记录将从表格底部增加',
          type: 'success',
          duration: 5000
        });
      }
      
      // 尝试聚焦到特定记录
      if (bitable.ui.scrollToRecord) {
        console.log('尝试滚动到记录:', recordId);
        await bitable.ui.scrollToRecord(targetTableId, recordId);
        return;
      }
      
      // 尝试选择记录作为备选方案
      try {
        const table = await bitable.base.getTableById(targetTableId);
        if (table && table.setSelection) {
          console.log('尝试选择记录:', recordId);
          await table.setSelection({
            recordIds: [recordId]
          });
        }
      } catch (selectError) {
        console.warn('选择记录失败:', selectError);
      }
    }
  } catch (error) {
    console.warn('聚焦到新记录失败:', error);
  }
};

// 改进用于模拟滚动的函数，只显示一次提示
const simulateScrolling = async (tableId, delay = 200, isFirstRecord = false, isNewTable = false) => {
  // 只在添加第一条记录时显示提示
  if (isFirstRecord) {
    // 根据是否是新表格显示不同提示
    if (isNewTable) {
      // 新表格场景下不提示底部添加，而是提示采集进行中
      ElMessage({
        message: '正在进行数据采集，请稍候...',
        type: 'info',
        duration: 6000
      });
    } else {
      // 现有表格场景提示底部添加
      ElMessage({
        message: '数据正在添加中，记录将从表格底部开始增加',
        type: 'info',
        duration: 6000
      });
    }
  }
  
  // 简单延迟，给用户视觉反馈
  await new Promise(resolve => setTimeout(resolve, delay));
};

// 添加变量跟踪是否是批次中的第一条记录
let isAddingFirstRecord = true;

// 新增一个表格创建过程提示函数
const showTableCreationMessage = () => {
  ElMessage({
    message: '正在创建新表格并配置字段，请稍候...',
    type: 'info',
    duration: 8000
  });
};

// 添加表格创建完成的提示函数
const showTableCreatedMessage = (tableName) => {
  ElMessage({
    message: `表格"${tableName}"创建成功，开始添加数据...`,
    type: 'success',
    duration: 5000
  });
};

// 处理新表格创建后的回调
const handleTableCreated = async (tableInfo) => {
  logger.info('收到新表格创建通知', tableInfo);
  
  try {
    // 1. 将新表格添加到可用表格列表
    const newTable = {
      id: tableInfo.tableId,
      name: tableInfo.tableName
    };
    
    // 检查表格是否已存在，避免重复添加
    const existingIndex = availableTables.value.findIndex(t => t.id === newTable.id);
    if (existingIndex === -1) {
      availableTables.value.push(newTable);
      logger.info('新表格已添加到列表', { newTable, totalTables: availableTables.value.length });
    } else {
      logger.info('表格已存在，跳过添加', { existingTable: availableTables.value[existingIndex] });
    }
    
    // 2. 自动选择新创建的表格
    selectedTable.value = tableInfo.tableId;
    logger.info('已自动选择新创建的表格', { tableId: tableInfo.tableId });
    
    // 3. 更新视图列表
    await updateViewsList();
    logger.info('已更新新表格的视图列表', { viewCount: availableViews.value.length });
    
    // 4. 显示成功提示
    ElMessage.success(`表格 "${tableInfo.tableName}" 创建成功并已自动选择`);
    
  } catch (error) {
    logger.error('处理新表格创建回调失败', error);
    ElMessage.warning('表格创建成功，但自动选择失败，请手动刷新页面');
  }
};

// 手动刷新表格列表
const refreshTableList = async () => {
  logger.info('手动刷新表格列表');
  
  try {
    isLoadingTables.value = true;
    const currentSelectedTable = selectedTable.value; // 保存当前选择
    
    // 重新加载表格列表
    await loadAvailableTables();
    
    // 如果之前有选择的表格，尝试保持选择
    if (currentSelectedTable && availableTables.value.find(t => t.id === currentSelectedTable)) {
      selectedTable.value = currentSelectedTable;
      await updateViewsList();
    }
    
    ElMessage.success(`已刷新表格列表，共找到 ${availableTables.value.length} 个表格`);
    
  } catch (error) {
    logger.error('刷新表格列表失败', error);
    ElMessage.error('刷新表格列表失败，请稍后重试');
  } finally {
    isLoadingTables.value = false;
  }
};

// ==================== 转写功能辅助函数 ====================

/**
 * 准备转写视频记录（按照新API格式）
 * @param {Object} writeResult - 写入结果
 * @param {Object} collectionResult - 采集结果
 * @returns {Promise<Array>} 视频记录数组
 */
const prepareVideoRecordsForTranscription = async (writeResult, collectionResult) => {
  try {
    logger.info('准备转写视频记录', { writeResult, collectionResult });
    
    // 从writeResult中提取记录ID
    let recordIds = [];
    
    // 处理不同的writeResult结构
    if (writeResult.writeResult && writeResult.writeResult.records) {
      recordIds = writeResult.writeResult.records.map(record => record.recordId);
    } else if (writeResult.records) {
      recordIds = writeResult.records.map(record => record.recordId);
    } else {
      logger.error('无法从writeResult中提取记录ID', { writeResult });
      throw new Error('写入结果中缺少记录ID信息');
    }
    
    // 验证视频数据
    if (!collectionResult.videos || !Array.isArray(collectionResult.videos)) {
      logger.error('采集结果中缺少视频数据', { collectionResult });
      throw new Error('采集结果中缺少有效的视频列表');
    }
    
    // 准备转写记录（按照后端API要求的格式）
    const videoRecords = [];
    const limit = Math.min(recordIds.length, collectionResult.videos.length);
    
    for (let i = 0; i < limit; i++) {
      const recordId = recordIds[i];
      const videoData = collectionResult.videos[i];
      
      // 检查视频是否有aweme_id
      if (videoData && videoData.aweme_id) {
        videoRecords.push({
          record_id: recordId,
          aweme_id: videoData.aweme_id,
          // 可选字段，根据后端需求添加
          title: videoData.title || '未知标题',
          estimated_duration: videoData.duration || 60
        });
        
        logger.info('准备转写记录', {
          recordId,
          awemeId: videoData.aweme_id,
          title: videoData.title
        });
      } else {
        logger.warn('跳过无效的视频数据', { 
          index: i, 
          recordId, 
          hasAwemeId: !!videoData?.aweme_id 
        });
      }
    }
    
    logger.info('转写记录准备完成', { 
      totalRecords: videoRecords.length,
      originalVideos: collectionResult.videos.length,
      recordIds: recordIds.length
    });
    
    return videoRecords;
    
  } catch (error) {
    logger.error('准备转写记录失败', error);
    throw error;
  }
};

// 检查用户积分是否足够转写（含错误处理）
const checkUserPointsForTranscription = async (transcribeData) => {
  const backendUrl = localStorage.getItem('api_base_url') || 'https://fsbk.dy2bcsm.cn';
  const token = localStorage.getItem('access_token');
  
  // 估算所需积分（基于视频数量和平均时长）
  const estimatedDuration = transcribeData.records.length * 60; // 假设每个视频60秒
  const requiredPoints = estimatedDuration; // 1积分/秒
  
  const result = await makeApiRequest(`${backendUrl}/api/points/check`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      required_points: requiredPoints,
      operation_type: 'transcription'
    })
  });
  
  return {
    sufficient: result.data.sufficient,
    current: result.data.current_points,
    required: requiredPoints
  };
};

// 准备转写数据 - 记录每行的ID和音频URL
const prepareTranscribeData = async (writeResult, collectionResult) => {
  try {
    logger.info('准备转写数据', { writeResult, collectionResult });
    
    // 处理写入结果，兼容不同的数据结构
    let recordIds = [];
    let tableId = '';
    let viewId = '';
    
    // 检查 writeResult 是否是包装对象 (来自 processAndWrite 返回的结构)
    if (writeResult && typeof writeResult === 'object') {
      if (writeResult.records && Array.isArray(writeResult.records)) {
        // 直接结构
        recordIds = writeResult.records.map(record => record.recordId);
        tableId = writeResult.tableId;
        viewId = writeResult.viewId;
        
        logger.info('从直接结构中提取记录ID', { 
          recordIdsCount: recordIds.length,
          tableId,
          viewId
        });
      } else if (writeResult.writeResult && typeof writeResult.writeResult === 'object') {
        // 嵌套结构 (writeResult.writeResult)
        const innerResult = writeResult.writeResult;
        
        if (innerResult.records && Array.isArray(innerResult.records)) {
          recordIds = innerResult.records.map(record => record.recordId);
          tableId = innerResult.tableId;
          viewId = innerResult.viewId;
          
          logger.info('从嵌套结构中提取记录ID', { 
            recordIdsCount: recordIds.length,
            tableId,
            viewId
          });
        }
      }
    }
    
    // 验证提取的数据有效性
    if (!recordIds || recordIds.length === 0) {
      logger.error('无法提取有效的记录ID列表', { writeResult });
      throw new Error('写入结果中缺少有效的记录ID列表');
    }
    
    if (!tableId) {
      logger.error('无法提取有效的表格ID', { writeResult });
      throw new Error('写入结果中缺少有效的表格ID');
    }
    
    logger.info('提取的记录和表格信息', {
      recordIdsCount: recordIds.length,
      tableId,
      viewId,
      sampleRecordIds: recordIds.slice(0, 3)
    });
    
    // 获取表格和视图实例
    let table;
    try {
      table = await bitable.base.getTableById(tableId);
      if (!table) {
        throw new Error('表格实例为空');
      }
      logger.info('成功获取表格实例', { tableId });
    } catch (tableError) {
      logger.error('获取表格实例失败', { 
        tableId, 
        error: tableError.message,
        errorStack: tableError.stack 
      });
      throw new Error(`无法获取表格实例: ${tableError.message}`);
    }
    
    // 获取转写字段ID
    const transcriptionFieldId = await getTranscriptionFieldId(table);
    
    // 准备转写记录列表
    const transcribeRecords = [];
    
    // 验证视频数据的有效性
    if (!collectionResult.videos || !Array.isArray(collectionResult.videos)) {
      logger.error('collectionResult.videos 无效', { videos: collectionResult.videos });
      throw new Error('采集结果中缺少有效的视频列表');
    }
    
    // 遍历写入的记录，提取视频ID
    // 注意：recordIds 和 videos 应该一一对应
    const limit = Math.min(recordIds.length, collectionResult.videos.length);
    for (let i = 0; i < limit; i++) {
      const recordId = recordIds[i];
      const videoData = collectionResult.videos[i];
      
      // 使用 aweme_id (视频ID)
      if (videoData && videoData.aweme_id) { 
        transcribeRecords.push({
          record_id: recordId,
          aweme_id: videoData.aweme_id, // 确保使用 aweme_id
          title: videoData.title || '未知标题'
          // estimated_duration 字段根据后端需求决定是否保留
        });
      } else {
        logger.warn('跳过无效的视频数据', { index: i, videoData, recordId });
      }
    }
    
    if (transcribeRecords.length === 0) {
      logger.warn('没有找到有效的转写记录');
      throw new Error('没有找到可以转写的有效视频记录');
    }
    
    logger.info('转写数据准备完成', { 
      transcribeRecords,
      transcriptionFieldId,
      tableId,
      viewId
    });
    
    return {
      records: transcribeRecords,
      tableId,
      viewId,
      transcriptionFieldId
    };
    
  } catch (error) {
    logger.error('准备转写数据失败', error);
    throw error;
  }
};

// 获取转写字段ID
const getTranscriptionFieldId = async (table) => {
  try {
    const fieldMetaList = await table.getFieldMetaList();
    
    // 查找转写字段
    const transcriptionField = fieldMetaList.find(field => 
      field.name === '视频转写内容' || 
      field.name === 'transcription' ||
      field.name.includes('转写')
    );
    
    if (transcriptionField) {
      logger.info('找到转写字段', { fieldId: transcriptionField.id, fieldName: transcriptionField.name });
      return transcriptionField.id;
    } else {
      // 如果没有找到，创建转写字段
      logger.info('未找到转写字段，正在创建...');
      const newFieldId = await table.addField({
        type: 1, // FieldType.Text
        name: '视频转写内容'
      });
      logger.info('转写字段创建成功', { fieldId: newFieldId });
      return newFieldId;
    }
    
  } catch (error) {
    logger.error('获取转写字段ID失败', error);
    throw error;
  }
};

// 选择转写策略
const selectTranscriptionStrategy = (recordCount) => {
  // 根据记录数量和阿里云ASR能力选择策略
  if (recordCount <= 10) {
    // 少量记录使用批量策略（录音文件识别）
    return 'batch';
  } else if (recordCount <= 50) {
    // 中等数量记录使用批量策略，但分批处理
    return 'batch';
  } else {
    // 大量记录使用单线程策略，避免触发限流
    return 'sequential';
  }
};

  });
  
  logger.info('批量转写任务启动成功', { taskId: result.data.task_id });
  return result.data;
};

// 单线程转写任务启动（含错误处理）
const startSequentialTranscriptionTask = async (transcribeData) => {
  const backendUrl = localStorage.getItem('api_base_url') || 'https://fsbk.dy2bcsm.cn';
  const token = localStorage.getItem('access_token');
  
  // 准备单线程转写请求参数
  const requestData = {
    video_records: transcribeData.records.map(record => ({
      record_id: record.record_id,
      aweme_id: record.aweme_id
    })),
    strategy: 'sequential',
    max_concurrent: 1
  };
  
  logger.info('启动单线程转写任务', { requestData });
  
  const result = await makeApiRequest(`${backendUrl}/api/transcription/start-by-video-ids`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestData)
  });
  
  logger.info('单线程转写任务启动成功', { taskId: result.data.task_id });
  return result.data;
};

// 检查转写状态（含错误处理）
const checkTranscriptionStatus = async (taskId) => {
  const backendUrl = localStorage.getItem('api_base_url') || 'https://fsbk.dy2bcsm.cn';
  const token = localStorage.getItem('access_token');
  
  const result = await makeApiRequest(`${backendUrl}/api/transcription/status/${taskId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  return result.data;
};

// 获取转写结果（含错误处理）
const getTranscriptionResults = async (taskId) => {
  const backendUrl = localStorage.getItem('api_base_url') || 'https://fsbk.dy2bcsm.cn';
  const token = localStorage.getItem('access_token');
  
  const result = await makeApiRequest(`${backendUrl}/api/transcription/result/${taskId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  logger.info('获取转写结果成功', { 
    taskId, 
    resultsCount: result.data.results.length 
  });
  return result.data.results;
};

// 处理积分扣费（含错误处理）
const handlePointsDeduction = async (completedRecords) => {
  const backendUrl = localStorage.getItem('api_base_url') || 'https://fsbk.dy2bcsm.cn';
  const token = localStorage.getItem('access_token');
  
  for (const record of completedRecords) {
    if (record.status === 'completed' && record.duration) {
      try {
        // 根据实际音频时长扣费
        const pointsToDeduct = Math.ceil(record.duration); // 向上取整
        
        const result = await makeApiRequest(`${backendUrl}/api/points/deduct`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            points: pointsToDeduct,
            operation_type: 'transcription',
            record_id: record.record_id,
            duration: record.duration
          })
        });
        
        logger.info('积分扣费成功', {
          recordId: record.record_id,
          pointsDeducted: pointsToDeduct,
          remainingPoints: result.data.remaining_points
        });
        
      } catch (error) {
        if (error instanceof BusinessError) {
          logger.error('积分扣费失败', {
            recordId: record.record_id,
            errorCode: error.code,
            errorMessage: error.message
          });
          
          // 积分扣费失败不影响转写继续进行
          if (error.code === ERROR_CODES.POINTS_DEDUCTION_FAILED) {
            // 记录扣费失败，但不中断流程
            continue;
          }
        } else {
          logger.error('积分扣费网络错误', {
            recordId: record.record_id,
            error: error.message
          });
        }
      }
    }
  }
};

// 最终积分扣费确认（含错误处理）
const finalizePointsDeduction = async (taskId) => {
  try {
    const backendUrl = localStorage.getItem('api_base_url') || 'https://fsbk.dy2bcsm.cn';
    const token = localStorage.getItem('access_token');
    
    const result = await makeApiRequest(`${backendUrl}/api/transcription/finalize-points/${taskId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    logger.info('最终积分扣费确认完成', {
      taskId,
      totalPointsDeducted: result.data.total_points_deducted,
      remainingPoints: result.data.remaining_points
    });
    
  } catch (error) {
    if (error instanceof BusinessError) {
      logger.error('最终积分扣费确认失败', {
        taskId,
        errorCode: error.code,
        errorMessage: error.message
      });
      } else {
      logger.error('最终积分扣费确认网络错误', {
        taskId,
        error: error.message
      });
    }
    // 最终确认失败不影响整体流程
  }
};

// 批量更新转写结果到表格（核心实现）
const batchUpdateTranscriptionResults = async (table, transcriptionFieldId, results) => {
  try {
    logger.info('开始批量更新转写结果', { 
      transcriptionFieldId, 
      resultsCount: results.length 
    });
    
    // 准备批量更新数据
    const updateRecords = [];
    
    for (const result of results) {
      if (result.status === 'completed' && result.transcription_text) {
        updateRecords.push({
          recordId: result.record_id,
          fields: {
            [transcriptionFieldId]: result.transcription_text
          }
        });
        
        logger.info('准备更新记录', {
          recordId: result.record_id,
          textLength: result.transcription_text.length,
          wordCount: result.word_count
        });
      } else {
        logger.warn('跳过失败的转写记录', {
          recordId: result.record_id,
          status: result.status,
          error: result.error
        });
      }
    }
    
    if (updateRecords.length === 0) {
      logger.warn('没有需要更新的记录');
      return;
    }
    
    // 执行批量更新
    logger.info('执行批量更新', { updateCount: updateRecords.length });

    // 分批更新，避免一次更新太多记录
    const batchSize = 10;
    for (let i = 0; i < updateRecords.length; i += batchSize) {
      const batch = updateRecords.slice(i, i + batchSize);
      
      try {
        await table.setRecords(batch);
        logger.info(`批次 ${Math.floor(i/batchSize) + 1} 更新成功`, { 
          batchSize: batch.length,
          recordIds: batch.map(r => r.recordId)
        });
        
        // 添加延迟避免请求过快
        if (i + batchSize < updateRecords.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
      } catch (batchError) {
        logger.error(`批次 ${Math.floor(i/batchSize) + 1} 更新失败`, batchError);
        
        // 如果批量更新失败，尝试逐个更新
        for (const record of batch) {
          try {
            await table.setRecord(record.recordId, record.fields);
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
    
    logger.info('批量更新转写结果完成', { 
      totalRecords: updateRecords.length,
      transcriptionFieldId 
    });
    
  } catch (error) {
    logger.error('批量更新转写结果失败', error);
    throw error;
  }
};

// 轮询转写进度并实时更新表格（含积分扣费和错误处理）
const pollTranscriptionProgressAndUpdate = async (taskId, writeResult, strategy) => {
  const maxPollingTime = strategy === 'batch' ? 10 * 60 * 1000 : 30 * 60 * 1000; // 批量10分钟，单线程30分钟
  const pollingInterval = strategy === 'batch' ? 3000 : 5000; // 批量3秒，单线程5秒
  const startTime = Date.now();
  
  // 处理写入结果，兼容不同的数据结构
  let tableId = '';
  
  // 检查 writeResult 是否是包装对象 (来自 processAndWrite 返回的结构)
  if (writeResult && typeof writeResult === 'object') {
    if (writeResult.tableId) {
      // 直接结构
      tableId = writeResult.tableId;
    } else if (writeResult.writeResult && typeof writeResult.writeResult === 'object') {
      // 嵌套结构 (writeResult.writeResult)
      tableId = writeResult.writeResult.tableId;
    }
  }
  
  if (!tableId) {
    logger.error('无法提取有效的表格ID', { writeResult });
    throw new Error('写入结果中缺少有效的表格ID');
  }
  
  // 获取表格实例和转写字段ID
  const table = await bitable.base.getTableById(tableId);
  const transcriptionFieldId = await getTranscriptionFieldId(table);

  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        // 检查是否超时
        if (Date.now() - startTime > maxPollingTime) {
          reject(new Error('转写任务超时'));
          return;
        }
        
        const status = await checkTranscriptionStatus(taskId);
        
        // 更新进度显示
        const progressPercent = 60 + (status.progress * 0.4); // 60-100%
        updateProgress('transcribing', progressPercent, 100, 
          status.message || `正在转写 ${status.completed_count}/${status.total_count} 个视频...`);
        
        // 处理积分扣费（每完成一个视频就扣费）
        if (status.completed_records && status.completed_records.length > 0) {
          await handlePointsDeduction(status.completed_records);
        }
        
        if (status.status === 'completed') {
          // 转写完成，获取结果并批量更新表格
          logger.info('转写任务完成，开始更新表格', { taskId });
          
          const results = await getTranscriptionResults(taskId);
          await batchUpdateTranscriptionResults(table, transcriptionFieldId, results);
          
          // 最终积分扣费确认
          await finalizePointsDeduction(taskId);
          
          logger.info('表格更新完成', { taskId, updatedCount: results.length });
          resolve(status);
          
        } else if (status.status === 'failed') {
          reject(new Error(status.error || '转写任务失败'));
        } else if (status.status === 'insufficient_points') {
          // 积分不足，任务中断
          logger.warn('转写任务因积分不足中断', { taskId });
          
          // 获取已完成的结果并更新表格
          const partialResults = await getTranscriptionResults(taskId);
          if (partialResults && partialResults.length > 0) {
            await batchUpdateTranscriptionResults(table, transcriptionFieldId, partialResults);
          }
          
          ElMessage.warning('积分不足，转写任务已中断。已完成的视频转写结果已保存。');
          resolve(status);
        } else {
          // 继续轮询
          setTimeout(poll, pollingInterval);
        }
        
      } catch (error) {
        if (error instanceof BusinessError) {
          // 业务错误，根据错误类型处理
          switch (error.code) {
            case ERROR_CODES.TRANSCRIPTION_TASK_NOT_FOUND:
              reject(error);
              break;
            case ERROR_CODES.TRANSCRIPTION_TASK_FAILED:
              reject(error);
              break;
            case ERROR_CODES.TRANSCRIPTION_TASK_TIMEOUT:
              reject(error);
              break;
            case ERROR_CODES.ALIYUN_RATE_LIMIT:
              // 阿里云限流，延长轮询间隔后重试
              setTimeout(poll, pollingInterval * 2);
              break;
            default:
              logger.error('轮询转写状态出现业务错误', error);
              reject(error);
          }
        } else {
          logger.error('轮询转写状态失败', error);
          reject(error);
        }
      }
    };
    
    // 开始轮询
    poll();
  });
};

// 统一错误处理函数
const handleTranscriptionError = (error) => {
  if (error instanceof BusinessError) {
    // 业务错误已经在ErrorHandler中处理过了
    logger.error('业务错误', { code: error.code, message: error.message, errorInfo: error.errorInfo });
    
    // 根据错误类型更新进度状态
    switch (error.errorInfo.type) {
      case 'insufficient_points':
        updateProgress('completed', 100, 100, '采集完成，积分不足');
        break;
      case 'task_failed':
        updateProgress('completed', 100, 100, '采集完成，转写失败');
        break;
      case 'task_timeout':
        updateProgress('completed', 100, 100, '采集完成，转写超时');
        break;
      default:
        updateProgress('completed', 100, 100, '采集完成，转写出现问题');
    }
  } else if (error instanceof NetworkError) {
    // 网络错误
    ElMessage.error('网络连接失败，请检查网络后重试');
    updateProgress('completed', 100, 100, '网络错误，操作中断');
  } else {
    // 其他未知错误
    ElMessage.error('操作失败，请稍后重试');
    updateProgress('completed', 100, 100, '操作失败');
    logger.error('未知错误', error);
  }
};

// ==================== 主要功能函数 ====================

// 采集并转写功能（使用新的转写服务）
const searchCreatorAndTranscribe = async () => {
  if (!validateSelections()) {
    return;
  }
  
  // 重置状态
  resetState();
  
  // 收集当前选中的字段
  const selectedFields = getSelectedFields();
  const selectedFieldIds = selectedFields.map(field => field.id);
  
  // 收集输入的链接
  const inputUrls = getAllInputUrls();
  if (inputUrls.length === 0) {
    ElMessage.warning('请至少输入一个链接');
    return;
  }
  
  // 开始数据收集和转写过程
  loading.value = true;
  
  try {
    // ==================== 阶段一：数据采集 ====================
    updateProgress('collecting', 20, 100, '正在采集视频数据...');
    
    // 确保包含转写字段
    if (!selectedFieldIds.includes('transcription')) {
      selectedFieldIds.push('transcription');
    }
    
    // 调用现有采集功能
    const collectionResult = await collectVideoData(inputUrls, selectedFieldIds, false);
    
    // 提取视频数据
    const videos = collectionResult.videos || [];
    
    if (videos.length === 0) {
      ElMessage.warning('未找到任何视频数据');
      loading.value = false;
      return;
    }
    
    // 保存作者信息（如果有）
    if (collectionResult.authors && collectionResult.authors.length > 0) {
      douyinData.creatorInfo = collectionResult.authors[0];
    }
    
    // ==================== 阶段二：写入表格 ====================
    updateProgress('writing', 40, 100, '正在写入表格...');
    
    const writeConfig = {
      mode: tableOption.value,
      extractMode: extractMode.value,
      fields: selectedFieldIds,
      withTranscription: true // 标记为转写模式
    };
    
    if (tableOption.value === 'new') {
      writeConfig.tableName = generateUniqueTableName();
    } else {
      writeConfig.tableId = selectedTable.value;
      writeConfig.viewId = selectedView.value;
      writeConfig.tableName = availableTables.value.find(t => t.id === selectedTable.value)?.name || '未知表格';
      writeConfig.viewName = availableViews.value.find(v => v.id === selectedView.value)?.name || '默认视图';
    }
    
    // 前端处理并写入表格
    const writeResult = await processAndWrite(collectionResult, writeConfig, handleTableCreated);
    
    // ==================== 阶段三：准备转写数据 ====================
    updateProgress('preparing', 60, 100, '正在准备转写数据...');
    
    // 准备转写记录（按照新API格式）
    const videoRecords = await prepareVideoRecordsForTranscription(writeResult, collectionResult);
    
    if (videoRecords.length === 0) {
      updateProgress('completed', 100, 100, '采集完成，但没有可转写的视频');
      ElMessage.warning('没有找到可转写的视频记录');
      return;
    }
    
    // ==================== 阶段四：执行转写 ====================
    updateProgress('transcribing', 70, 100, '正在启动转写任务...');
    
    // 使用新的转写服务
    const transcriptionResults = await transcriptionService.performTranscription(
      videoRecords,
      {
        strategy: videoRecords.length <= 10 ? 'batch' : 'sequential',
        maxConcurrent: 10
      },
      (progressInfo) => {
        // 转写进度回调
        if (progressInfo.stage === 'processing' && progressInfo.progress) {
          const overallProgress = 70 + (progressInfo.progress * 0.25); // 70-95%
          updateProgress('transcribing', overallProgress, 100, progressInfo.message);
        }
      }
    );
    
    // ==================== 阶段五：更新表格 ====================
    updateProgress('updating', 95, 100, '正在更新转写结果到表格...');
    
    // 获取表格ID
    const tableId = writeResult.writeResult?.tableId || writeResult.summary?.tableId;
    
    if (tableId && transcriptionResults.length > 0) {
      await tableUpdateService.updateTranscriptionResults(tableId, transcriptionResults);
    }
    
    // ==================== 完成 ====================
    updateProgress('completed', 100, 100, '采集并转写完成！');
    
    // 保存采集到的视频数据
    douyinData.videos = videos;
    
    // 显示成功消息
    const displayResult = formatResultForDisplay(writeResult);
    if (displayResult) {
      const successCount = transcriptionResults.filter(r => r.status === 'completed').length;
      ElMessage.success(`${displayResult.title}！成功处理 ${displayResult.successRecords} 条记录，转写完成 ${successCount} 个视频`);
    }
    
    // 发送数据到父组件
    emit('data-collected', { 
      data: videos,
      config: writeConfig,
      result: writeResult,
      transcriptionResults
    });
    
  } catch (error) {
    logger.error('采集并转写过程出错:', error);
    handleTranscriptionError(error);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="douyin-container">
    <!-- 移除PermissionWrapper组件，直接显示内容 -->
    <div v-if="activeView === 'form'" class="extract-form-container">
      <!-- 采集模式选择区 -->
      <div class="mode-select-area">
        <div class="tab-container">
          <div 
            class="tab-item" 
            :class="{ active: extractMode === 'author', disabled: !hasAuthorExtractPermission }" 
            @click="hasAuthorExtractPermission && toggleExtractMode('author')"
          >
            <el-tooltip v-if="!hasAuthorExtractPermission" content="需要高级会员权限" placement="top">
              <div class="locked-option">
                <!-- <el-icon><Lock /></el-icon> -->
                作者主页采集
              </div>
              </el-tooltip>
            <span v-else>作者主页采集</span>
          </div>
          <div 
            class="tab-item" 
            :class="{ active: extractMode === 'video' }" 
            @click="toggleExtractMode('video')"
          >
            单视频采集
          </div>
        </div>
      </div>
      
      <!-- 链接输入区 -->
      <div class="section-container">
        <h3 class="section-title">输入链接</h3>
        
        <!-- 视频链接输入 -->
        <div v-if="extractMode === 'video'">
          <div v-for="(url, index) in videoInputUrls" :key="'video-'+index" class="url-input-row">
            <el-input 
              v-model="videoInputUrls[index]" 
              placeholder="请输入抖音视频链接或ID"
              :disabled="douyinData.isLoading"
              class="url-input"
            ></el-input>
            <div class="url-input-actions">
              <!-- 基础会员提示 -->
              <el-tooltip v-if="!hasMultiLinkPermission && index === videoInputUrls.length - 1" content="基础会员仅支持单链接采集，请升级会员" placement="top">
                <el-button 
                  circle 
                  type="primary" 
                  @click="addUrlInput"
                  :disabled="douyinData.isLoading || !hasMultiLinkPermission"
                  title="添加链接"
                  class="add-btn"
                >
                  <el-icon><Plus /></el-icon>
                </el-button>
              </el-tooltip>
              
              <!-- 高级会员添加按钮 -->
              <el-button 
                v-if="hasMultiLinkPermission && index === videoInputUrls.length - 1"
                circle 
                type="primary" 
                @click="addUrlInput"
                :disabled="douyinData.isLoading"
                title="添加链接"
                class="add-btn"
              >
                <el-icon><Plus /></el-icon>
              </el-button>
              
              <!-- 删除按钮 -->
              <el-button 
                v-if="videoInputUrls.length > 1 && index !== videoInputUrls.length - 1" 
                circle 
                type="danger" 
                @click="removeUrlInput(index)"
                :disabled="douyinData.isLoading"
                title="删除链接"
                class="delete-btn"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>
        </div>
        
        <!-- 作者链接输入 -->
        <div v-else>
          <div class="url-input-row">
            <el-input 
              v-model="authorInputUrls[0]" 
              placeholder="请输入抖音作者主页链接"
              :disabled="douyinData.isLoading"
              class="url-input"
            ></el-input>
          </div>
        </div>
        
        <!-- 会员限制提示 -->
        <div class="member-limit-hint">
          作者主页采集仅支持单链接，单视频采集支持多链接（高级会员和专业会员最多10个链接）
        </div>
      </div>
      
      <!-- 字段选择区 -->
      <div class="section-container" v-if="false">
          <div class="field-select-header" @click="fieldSelectExpanded = !fieldSelectExpanded">
          <h3 class="section-title">选择采集字段</h3>
              <el-icon :class="{'is-expanded': fieldSelectExpanded}"><ArrowDown /></el-icon>
          </div>
          
          <div v-show="fieldSelectExpanded" class="field-options-container">
          <!-- 基础字段组 -->
          <div class="field-group">
            <h4 class="field-group-title">基础字段</h4>
            <div class="field-options">
              <div 
                v-for="field in getBasicFields()" 
                :key="field.id" 
                class="field-option-item"
              >
                <el-checkbox v-model="field.selected" :disabled="douyinData.isLoading || field.id === 'awemeId' || field.id === 'shareUrl'">
                  {{ field.label }}
                  <el-tag v-if="field.id === 'awemeId' || field.id === 'shareUrl'" size="small" type="success" style="margin-left: 4px; font-size: 10px; padding: 0 4px;">必选</el-tag>
                </el-checkbox>
              </div>
            </div>
          </div>
          
          <!-- 数据字段组 -->
          <div class="field-group">
            <h4 class="field-group-title">数据字段</h4>
            <div class="field-options">
              <div 
                v-for="field in getDataFields()" 
                :key="field.id" 
                class="field-option-item"
              >
                <el-checkbox 
                  v-model="field.selected" 
                  :disabled="douyinData.isLoading || (field.memberOnly && !hasMemberPermission(field.requiredLevel || 'basic'))"
                >
                  {{ field.label }}
                  <el-tag 
                    v-if="field.memberOnly" 
                    size="small" 
                    :type="hasMemberPermission(field.requiredLevel || 'basic') ? 'warning' : 'info'" 
                    style="margin-left: 4px; font-size: 10px; padding: 0 4px;"
                  >
                    {{ field.requiredLevel || '会员' }}
                  </el-tag>
                </el-checkbox>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 表格选择区 -->
      <div class="section-container">
        <h3 class="section-title">选择导入位置</h3>
        <div class="select-item">
          <el-radio-group v-model="tableOption" class="radio-group-horizontal">
            <el-radio :value="'current'">导入到现有表格</el-radio>
            <el-radio :value="'new'">创建新表格</el-radio>
          </el-radio-group>
          
          <template v-if="tableOption === 'current'">
            <!-- 选择数据表 -->
            <div class="select-item">
              <div class="select-label">
                数据表：{{ availableTables.length }}个
                <el-button 
                  type="text" 
                  size="small" 
                  @click="refreshTableList"
                  :loading="isLoadingTables"
                  style="margin-left: 8px; font-size: 12px;"
                  title="刷新表格列表"
                >
                  刷新
                </el-button>
              </div>
              <el-select 
                v-model="selectedTable" 
                placeholder="选择数据表" 
                class="full-width-select"
                :loading="isLoadingTables"
                filterable
                @change="handleTableChange"
              >
                <el-option 
                  v-for="table in availableTables" 
                  :key="table.id" 
                  :label="table.name" 
                  :value="table.id"
                />
              </el-select>
            </div>
            
            <!-- 选择视图 -->
            <div class="select-item">
              <div class="select-label">视图</div>
              <el-select 
                v-model="selectedView" 
                placeholder="选择视图" 
                class="full-width-select"
                :loading="isLoadingViews"
                :disabled="!selectedTable"
                filterable
                @change="handleViewChange"
              >
                <el-option 
                  v-for="view in availableViews" 
                  :key="view.id" 
                  :label="view.name" 
                  :value="view.id"
                />
              </el-select>
            </div>
          </template>
          
          <template v-else>
            <div class="select-item">
              <div class="select-label">表格名称</div>
              <el-input 
                v-model="newTableName" 
                placeholder="表格名称" 
                class="full-width-select"
              />
            </div>
          </template>
        </div>
      </div>
      
      <!-- 错误信息 -->
      <div v-if="douyinData.error" class="error-message">
        {{ douyinData.error }}
      </div>
      
      <!-- 异步采集进度显示 -->
      <div v-if="writeProgress.isActive" class="section-container">
        <div class="progress-card">
          <div class="progress-header">
            <div class="progress-icon">
              <el-icon v-if="writeProgress.stage === 'preparing'" class="is-loading"><Loading /></el-icon>
              <el-icon v-else-if="writeProgress.stage === 'processing'" class="is-loading"><Loading /></el-icon>
              <el-icon v-else-if="writeProgress.stage === 'completed'"><Check /></el-icon>
              <el-icon v-else><Loading /></el-icon>
            </div>
            <div class="progress-title">
              {{ writeProgress.stage === 'preparing' ? '准备中' : 
                 writeProgress.stage === 'processing' ? '采集中' : 
                 writeProgress.stage === 'completed' ? '完成' : '处理中' }}
            </div>
          </div>
          
          <el-progress 
            :percentage="writeProgress.current" 
            :status="writeProgress.stage === 'completed' ? 'success' : null"
            class="progress-bar"
          />
          
          <div class="progress-message">
            {{ writeProgress.message }}
          </div>
          
          <div v-if="writeProgress.stage === 'processing'" class="progress-tips">
            <p>💡 采集大量数据需要时间，请耐心等待</p>
            <p>📊 系统正在后台处理，您可以继续其他操作</p>
          </div>
        </div>
      </div>
      
      <!-- 采集按钮区 -->
      <div class="section-container">
        <div class="action-buttons-container">
          <el-button 
            type="primary" 
            class="action-btn" 
            @click="searchCreator" 
            :loading="loading"
            :disabled="getAllInputUrls().length === 0 || (tableOption === 'current' && !selectedTable) || (tableOption === 'new' && !newTableName.trim())"
          >
            只采集数据
          </el-button>
        <el-button 
            type="primary" 
            class="action-btn" 
            @click="searchCreatorAndTranscribe" 
            :loading="loading"
            :disabled="getAllInputUrls().length === 0 || (tableOption === 'current' && !selectedTable) || (tableOption === 'new' && !newTableName.trim())"
          >
            采集并转写
        </el-button>
        </div>
        <div class="operation-tip">请输入链接并选择数据表</div>
      </div>
    </div>
    
    <!-- 预览视图 -->
    <div v-else class="preview-container">
      <!-- 作者信息 -->
      <InfoCard v-if="douyinData.creatorInfo" title="作者信息">
        <div class="creator-info">
          <div class="creator-header">
            <div class="creator-avatar">
              <img :src="douyinData.creatorInfo.avatar" alt="作者头像">
            </div>
            <div class="creator-details">
              <h3 class="creator-name">{{ douyinData.creatorInfo.nickname }}</h3>
              <div class="creator-stats">
                <span>粉丝: {{ douyinData.creatorInfo.followers }}</span>
                <span>获赞: {{ douyinData.creatorInfo.likes }}</span>
              </div>
            </div>
          </div>
          <p v-if="douyinData.creatorInfo.bio" class="creator-bio">
            {{ douyinData.creatorInfo.bio }}
          </p>
        </div>
      </InfoCard>
      
      <!-- 视频列表 -->
      <InfoCard title="视频列表">
        <div class="videos-header">
          <div class="videos-count">
            找到 {{ douyinData.videos.length }} 个视频
          </div>
          <div class="action-buttons">
            <el-button 
              type="primary" 
              size="small" 
              @click="toggleSelectAllVideos"
            >
              {{ selectedPreviewVideos.length === douyinData.videos.length ? '取消全选' : '全选' }}
            </el-button>
            
            <el-button 
              type="success" 
              size="small" 
              :disabled="selectedPreviewVideos.length === 0"
              @click="copySelectedLinks"
            >
              复制链接
            </el-button>
            
            <el-button 
              type="warning" 
              size="small" 
              :disabled="selectedPreviewVideos.length === 0"
              @click="copySelectedInfo"
            >
              复制信息
            </el-button>
          </div>
        </div>
        
        <!-- 视频表格 -->
        <el-table 
          :data="douyinData.videos" 
          style="width: 100%"
          @selection-change="(val) => selectedPreviewVideos = val"
        >
          <el-table-column type="selection" width="55" />
          
          <el-table-column label="标题">
            <template #default="scope">
              <div class="video-title-cell">
                <span class="video-title">{{ scope.row.title }}</span>
                <div class="video-stats">
                  <span>👍 {{ scope.row.digg_count }}</span>
                  <span>💬 {{ scope.row.comment_count }}</span>
                </div>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column label="视频ID" prop="aweme_id" width="120" />
          
          <el-table-column label="发布时间" prop="create_time_formatted" width="120" />
          
          <el-table-column label="表格记录ID" width="120">
            <template #default="scope">
              <el-tooltip v-if="scope.row.bitable_record_id" :content="scope.row.bitable_record_id" placement="top">
                <span class="record-id">{{ scope.row.bitable_record_id.substring(0, 6) }}...</span>
              </el-tooltip>
              <span v-else class="no-record-id">未同步</span>
            </template>
          </el-table-column>
          
          <el-table-column label="操作" width="150">
            <template #default="scope">
              <el-button 
                type="text" 
                size="small" 
                @click="copySelectedInfo([scope.row])"
              >
                复制信息
              </el-button>
              <el-button 
                type="text" 
                size="small" 
                @click="navigator.clipboard.writeText(scope.row.share_url)"
              >
                复制链接
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        
        <!-- 返回按钮 -->
        <div class="preview-actions">
          <el-button @click="backToForm">返回</el-button>
        </div>
      </InfoCard>
    </div>
  </div>
</template>

<style scoped>
.douyin-container {
  padding: 20px;
}

.page-title {
  margin-bottom: 20px;
  color: #303133;
}

.extract-form-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.extract-form {
  background-color: #fff;
  padding: 20px;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.mode-select-area {
  margin-bottom: 20px;
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

.input-area {
  margin-bottom: 20px;
  background-color: #fff;
  border-radius: 8px;
  padding: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  margin-bottom: 12px;
  color: #303133;
}

.url-input-row {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  align-items: center;
  width: 100%;
}

.url-input {
  height: 36px;
}

.url-input-actions {
  display: flex;
  gap: 5px;
  flex-shrink: 0;
}

.add-btn, .delete-btn {
  width: 36px;
  height: 36px;
  padding: 0;
}

.member-limit-hint {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
  line-height: 18px;
}

.field-select-card {
  margin-bottom: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 16px;
  background-color: #fff;
}

.field-select-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.field-select-header .is-expanded {
  transform: rotate(180deg);
  transition: transform 0.3s;
}

.field-options-container {
  margin-top: 16px;
  transition: all 0.3s;
}

.field-group {
  margin-bottom: 16px;
}

.field-group-title {
  font-size: 13px;
  font-weight: 500;
  color: #606266;
  margin-bottom: 12px;
}

.field-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.field-option-item {
  height: 32px;
  display: flex;
  align-items: center;
}

.table-select-area {
  margin-bottom: 20px;
  background-color: #fff;
  border-radius: 8px;
  padding: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.table-options {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.select-label {
  font-size: 13px;
  color: #606266;
  margin-top: 12px;
  margin-bottom: 8px;
}

.table-select + .select-label {
  margin-top: 16px;
}

.table-select, .table-input {
  margin-top: 0;
  width: 100%;
  height: 36px;
}

.action-button-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 20px 0;
  background-color: #fff;
  border-radius: 8px;
  padding: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.action-buttons-container {
  display: flex;
  gap: 16px;
  justify-content: center;
  width: 100%;
}

.action-btn {
  flex: 1;
  max-width: 45%;
  height: 44px;
  font-size: 14px;
  font-weight: 500;
  line-height: 22px;
  color: #ffffff; /* 确保按钮文字为白色 */
}

.operation-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
  line-height: 18px;
}

.time-estimate {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
  line-height: 18px;
}

/* 添加section-container样式，与TranscribeView保持一致 */
.section-container {
  margin-bottom: 12px;
  background-color: #fff;
  border-radius: 8px;
  padding: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

/* 修复select-item样式 */
.select-item {
  margin-bottom: 10px;
}

/* 修复full-width-select样式 */
.full-width-select {
  width: 100%;
}

.preview-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.creator-info {
  background-color: #f8f8f8;
  border-radius: 8px;
  padding: 15px;
}

.creator-header {
  display: flex;
  gap: 15px;
}

.creator-avatar img {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
}

.creator-stats {
  display: flex;
  gap: 15px;
  margin: 5px 0;
  font-size: 14px;
  color: #606266;
}

.creator-bio {
  font-size: 14px;
  color: #606266;
  margin-top: 5px;
}

.videos-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.video-title-cell {
  display: flex;
  flex-direction: column;
}

.video-stats {
  display: flex;
  gap: 10px;
  margin-top: 5px;
  font-size: 12px;
  color: #606266;
}

.preview-actions {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.locked-option {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.error-message {
  color: #f56c6c;
  margin-top: 10px;
  font-size: 14px;
  padding: 8px 12px;
  background-color: #fef0f0;
  border-radius: 4px;
}

.radio-group-horizontal {
  display: flex;
  flex-direction: row;
  gap: 24px;
}

.record-id {
  color: #67c23a;
  font-family: monospace;
  font-size: 12px;
  background-color: #f0f9eb;
  padding: 2px 6px;
  border-radius: 3px;
  cursor: pointer;
}

.no-record-id {
  color: #909399;
  font-size: 12px;
  font-style: italic;
}

.write-progress-container {
  margin-top: 20px;
}

.progress-card {
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 16px;
}

.progress-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.progress-icon {
  margin-right: 8px;
}

.progress-title {
  font-size: 14px;
  font-weight: 500;
  color: #606266;
}

.progress-bar {
  width: 100%;
}

.progress-message {
  margin-top: 12px;
  font-size: 12px;
  color: #606266;
}

.progress-success {
  display: flex;
  align-items: center;
  margin-top: 12px;
}

.success-icon {
  margin-right: 8px;
}

.async-progress-container {
  margin-top: 20px;
}

.progress-tips {
  font-size: 12px;
  color: #909399;
  margin-top: 10px;
}

.progress-tips p {
  margin: 4px 0;
  line-height: 1.4;
}

.progress-card {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 20px;
  border: 1px solid #e4e7ed;
}

.progress-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.progress-icon {
  margin-right: 8px;
  font-size: 16px;
}

.progress-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.progress-bar {
  margin-bottom: 12px;
}

.progress-message {
  font-size: 13px;
  color: #606266;
  line-height: 1.4;
}
</style> 