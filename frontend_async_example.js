// 前端异步采集功能示例代码
// 这个文件展示了如何在前端使用新的异步采集API

class AsyncCollectionManager {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl;
    this.token = token;
    this.pollingInterval = 3000; // 3秒轮询一次
    this.maxPollingTime = 300000; // 最多轮询5分钟
  }

  /**
   * 启动异步采集任务
   * @param {Array} urls - 作者链接数组
   * @param {Array} fields - 字段数组
   * @param {boolean} withTranscription - 是否转写
   * @returns {Promise<string>} 任务ID
   */
  async startCollection(urls, fields, withTranscription = false) {
    try {
      console.log('🚀 启动异步采集任务...');
      
      const response = await fetch(`${this.baseUrl}/collect/author`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          urls,
          fields,
          withTranscription
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.code !== 0) {
        throw new Error(data.message);
      }

      const taskId = data.data.taskId;
      console.log(`✅ 任务启动成功，任务ID: ${taskId}`);
      
      return taskId;
    } catch (error) {
      console.error('❌ 启动采集任务失败:', error.message);
      throw error;
    }
  }

  /**
   * 查询任务状态
   * @param {string} taskId - 任务ID
   * @returns {Promise<Object>} 任务状态和结果
   */
  async getTaskStatus(taskId) {
    try {
      const response = await fetch(`${this.baseUrl}/task/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('任务不存在或已过期');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.code !== 0) {
        throw new Error(data.message);
      }

      return data.data;
    } catch (error) {
      console.error('❌ 查询任务状态失败:', error.message);
      throw error;
    }
  }

  /**
   * 轮询等待任务完成
   * @param {string} taskId - 任务ID
   * @param {Function} onProgress - 进度回调函数
   * @returns {Promise<Object>} 最终结果
   */
  async waitForCompletion(taskId, onProgress = null) {
    const startTime = Date.now();
    let pollCount = 0;

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          pollCount++;
          const currentTime = Date.now();
          
          // 检查是否超时
          if (currentTime - startTime > this.maxPollingTime) {
            reject(new Error('任务处理超时'));
            return;
          }

          console.log(`🔄 第${pollCount}次查询任务状态...`);
          const result = await this.getTaskStatus(taskId);

          // 调用进度回调
          if (onProgress) {
            onProgress({
              status: result.status,
              pollCount,
              elapsedTime: currentTime - startTime
            });
          }

          if (result.status === 'completed') {
            console.log('🎉 任务完成！');
            resolve(result);
          } else if (result.status === 'failed') {
            reject(new Error(result.error || '任务处理失败'));
          } else if (result.status === 'processing') {
            // 继续轮询
            setTimeout(poll, this.pollingInterval);
          } else {
            reject(new Error(`未知的任务状态: ${result.status}`));
          }
        } catch (error) {
          reject(error);
        }
      };

      // 开始轮询
      poll();
    });
  }

  /**
   * 完整的异步采集流程
   * @param {Array} urls - 作者链接数组
   * @param {Array} fields - 字段数组
   * @param {boolean} withTranscription - 是否转写
   * @param {Object} callbacks - 回调函数集合
   * @returns {Promise<Object>} 采集结果
   */
  async collectWithProgress(urls, fields, withTranscription = false, callbacks = {}) {
    const {
      onStart = () => {},
      onProgress = () => {},
      onComplete = () => {},
      onError = () => {}
    } = callbacks;

    try {
      // 第一步：启动任务
      onStart();
      const taskId = await this.startCollection(urls, fields, withTranscription);

      // 第二步：等待完成
      const result = await this.waitForCompletion(taskId, (progress) => {
        onProgress({
          taskId,
          ...progress
        });
      });

      // 第三步：处理完成
      onComplete(result);
      return result;

    } catch (error) {
      onError(error);
      throw error;
    }
  }
}

// 使用示例
async function exampleUsage() {
  const manager = new AsyncCollectionManager(
    'https://fsbk.dy2bcsm.cn/api/douyin',
    'your_token_here'
  );

  try {
    const result = await manager.collectWithProgress(
      ['https://v.douyin.com/DO_Vm5rR024/'], // 作者链接
      ['video_url', 'cover_url'], // 字段
      false, // 不转写
      {
        onStart: () => {
          console.log('📋 开始采集...');
          // 显示loading状态
          showLoading('正在启动采集任务...');
        },
        
        onProgress: (progress) => {
          console.log(`⏳ 任务进行中... (第${progress.pollCount}次查询)`);
          // 更新进度显示
          updateProgress(`正在处理中，已查询${progress.pollCount}次...`);
        },
        
        onComplete: (result) => {
          console.log(`✅ 采集完成！共获得${result.total}个视频`);
          // 隐藏loading，显示结果
          hideLoading();
          displayResults(result);
        },
        
        onError: (error) => {
          console.error('❌ 采集失败:', error.message);
          // 显示错误信息
          hideLoading();
          showError(error.message);
        }
      }
    );

    return result;
  } catch (error) {
    console.error('采集过程出错:', error);
  }
}

// 模拟前端UI函数
function showLoading(message) {
  console.log(`🔄 Loading: ${message}`);
  // 实际项目中这里会操作DOM或状态管理
}

function updateProgress(message) {
  console.log(`📊 Progress: ${message}`);
  // 实际项目中这里会更新进度条
}

function hideLoading() {
  console.log('✅ Loading hidden');
  // 实际项目中这里会隐藏loading组件
}

function displayResults(result) {
  console.log('📋 显示结果:', {
    authors: result.authors?.length || 0,
    videos: result.total || 0,
    totalTime: result.totalTime ? `${(result.totalTime / 1000).toFixed(2)}秒` : '未知'
  });
  // 实际项目中这里会渲染结果到页面
}

function showError(message) {
  console.error(`❌ Error: ${message}`);
  // 实际项目中这里会显示错误提示
}

// Vue.js 组件示例
const VueAsyncCollectionExample = {
  data() {
    return {
      loading: false,
      progress: '',
      results: null,
      error: null,
      manager: null
    };
  },
  
  created() {
    this.manager = new AsyncCollectionManager(
      'https://fsbk.dy2bcsm.cn/api/douyin',
      this.$store.state.user.token // 从状态管理获取token
    );
  },
  
  methods: {
    async startCollection(urls, fields) {
      this.loading = true;
      this.error = null;
      this.results = null;
      
      try {
        const result = await this.manager.collectWithProgress(
          urls,
          fields,
          false,
          {
            onStart: () => {
              this.progress = '正在启动采集任务...';
            },
            
            onProgress: (progress) => {
              this.progress = `正在处理中，已查询${progress.pollCount}次...`;
            },
            
            onComplete: (result) => {
              this.results = result;
              this.progress = '';
              this.loading = false;
            },
            
            onError: (error) => {
              this.error = error.message;
              this.loading = false;
            }
          }
        );
      } catch (error) {
        this.error = error.message;
        this.loading = false;
      }
    }
  }
};

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AsyncCollectionManager, VueAsyncCollectionExample };
} 