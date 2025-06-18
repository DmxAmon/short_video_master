<script setup>
import { ref, reactive, onMounted, computed, markRaw } from 'vue';
import { useRouter } from 'vue-router';
import { Loading, VideoPlay, DocumentCopy, Document, DataLine } from '@element-plus/icons-vue';
import { ElMessage, ElTooltip } from 'element-plus';
import { envConfig } from './config/env';
import { initializeAuth, getCurrentUser, getLarkUser, callApi } from './services/auth';

// 导入视图组件
import DouyinView from './views/DouyinView.vue';
import TranscribeView from './views/TranscribeView.vue';
// import ResultsView from './views/ResultsView.vue';
import MembershipView from './views/MembershipView.vue';
import MonitorView from './views/MonitorView.vue';
import MarkdownView from './views/MarkdownView.vue';

// 获取路由
const router = useRouter();

// 检查是否在飞书环境中
const isInLarkEnvironment = ref(false);
const isDevMode = import.meta.env.DEV || import.meta.env.MODE === 'development';

// 用户认证状态 - 简化认证逻辑
const isAuthenticated = ref(false);

// 导航菜单
const navItems = ref([
  { key: 'douyin', name: '视频采集', to: '/', icon: markRaw(VideoPlay) },
  // 暂时隐藏视频转写页面
  // { key: 'transcribe', name: '视频转写', to: '/transcribe', icon: markRaw(DocumentCopy) },
  { key: 'content', name: '内容预览', to: '/content', icon: markRaw(Document) },
  // 暂时隐藏视频监控页面
  // { key: 'monitor', name: '视频监控', to: '/monitor', icon: markRaw(DataLine) }
]);

// 用户数据 - 移除默认模拟数据
const user = reactive({
  id: '',
  open_id: '', // 添加飞书open_id字段
  username: '',
  avatar: '',
  points: null, // 改为null，表示未加载
  email: '',
  isLoggedIn: false,
  memberLevel: null, // 改为null，表示未加载
  memberExpireTime: null,
  permissions: [], // 空数组，表示未加载
  usageStats: {
    videoExtract: { used: 0, limit: 0 },
    videoTranscribe: { used: 0, limit: 0 },
    videoBatch: { used: 0, limit: 0 }
  }
});

// 数据加载状态
const isUserDataLoaded = ref(false);

// 简化的用户信息更新函数
const updateUserInfo = (userData) => {
  if (userData && (userData.user || userData.id)) {
    const userInfo = userData.user || userData;
    user.id = userInfo.id || '';
    user.open_id = userInfo.open_id || userInfo.openId || ''; // 保存飞书open_id
    user.username = userInfo.username || userInfo.name || '用户';
    user.avatar = userInfo.avatar || '';
    user.points = userInfo.points || 0;
    user.email = userInfo.email || '';
    user.isLoggedIn = true;
    
    // 标记数据已加载
    isUserDataLoaded.value = true;
    
    // 更新权限信息
    if (userInfo.permissions && Array.isArray(userInfo.permissions)) {
      user.permissions = userInfo.permissions;
    }
    
    // 更新会员信息 - 优先从 membership 对象获取
    if (userData.membership) {
      const membership = userData.membership;
      // 使用后端返回的会员等级代码
      user.memberLevel = membership.levelCode || 'normal';
      
      // 如果有过期时间，设置过期时间
      if (membership.expire_date) {
        user.memberExpireTime = new Date(membership.expire_date);
      } else {
        // 如果没有过期时间，清除之前设置的默认过期时间
        user.memberExpireTime = null;
      }
      
      console.log('从 membership 对象更新会员信息:', {
        levelCode: membership.levelCode,
        level: membership.level,
        expire_date: membership.expire_date
      });
    } else if (userInfo.memberLevel) {
      // 兼容旧格式
      user.memberLevel = userInfo.memberLevel;
    }
    
    if (userInfo.memberExpireTime) {
      user.memberExpireTime = new Date(userInfo.memberExpireTime);
    }
    
    if (userInfo.usageStats) {
      user.usageStats = userInfo.usageStats;
    }
    
    console.log('用户信息已更新:', {
      id: user.id,
      open_id: user.open_id,
      username: user.username,
      memberLevel: user.memberLevel,
      permissions: user.permissions,
      memberExpireTime: user.memberExpireTime
    });
  }
};

// 计算属性：格式化过期日期
const formattedExpireDate = computed(() => {
  if (!user.memberExpireTime) return '';
  const date = new Date(user.memberExpireTime);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
});

// 计算属性：会员级别中文名
const memberLevelName = computed(() => {
  // 如果数据未加载或会员等级为空，返回空字符串
  if (!isUserDataLoaded.value || !user.memberLevel) {
    return '';
  }
  
  const levelMap = {
    'normal': '普通会员',
    'free': '普通会员',
    'basic': '基础会员',
    'advanced': '高级会员',
    'standard': '高级会员',
    'professional': '专业会员',
    'premium': '专业会员',
    'pro': '专业会员',
    'enterprise': '企业会员'
  };
  return levelMap[user.memberLevel] || '普通会员';
});

// 计算属性：会员级别颜色
const memberLevelColor = computed(() => {
  const colorMap = {
    'normal': '',
    'free': '',
    'basic': 'var(--el-color-primary)',
    'advanced': 'var(--el-color-primary)',
    'standard': 'var(--el-color-primary)',
    'professional': 'var(--el-color-success)',
    'premium': 'var(--el-color-success)',
    'pro': 'var(--el-color-success)',
    'enterprise': 'var(--el-color-danger)'
  };
  return colorMap[user.memberLevel] || '';
});

// 计算属性：是否即将到期（7天内）
const isExpiringSoon = computed(() => {
  if (!user.memberExpireTime) return false;
  const expireDate = new Date(user.memberExpireTime);
  const now = new Date();
  const diffDays = Math.floor((expireDate - now) / (24 * 60 * 60 * 1000));
  return diffDays >= 0 && diffDays <= 7;
});

// 计算属性：显示用户ID（飞书open_id的后10位）
const displayUserId = computed(() => {
  // 优先从larkUser对象获取飞书用户ID
  const larkUser = getLarkUser();
  if (larkUser && larkUser.id) {
    const userId = larkUser.id.toString();
    // 如果用户ID长度大于10位，取后10位；否则显示完整ID
    return userId.length > 10 ? userId.slice(-10) : userId;
  }
  
  // 如果larkUser不存在，则使用用户对象中的open_id或id
  const openId = user.open_id || user.id;
  if (!openId) return '';
  
  const userId = openId.toString();
  // 如果用户ID长度大于10位，取后10位；否则显示完整ID
  return userId.length > 10 ? userId.slice(-10) : userId;
});

// 检查是否在开发环境
const isDevEnvironment = envConfig.isDevelopment;

// 组件挂载后自动尝试认证
onMounted(async () => {
  console.log('应用初始化，环境配置:', envConfig);
  
  // 尝试检测飞书环境
  try {
    isInLarkEnvironment.value = window.self !== window.top;
  } catch (e) {
    isInLarkEnvironment.value = false;
  }
  
  // 直接显示主界面，认证在后台进行
  isAuthenticated.value = true;
  user.isLoggedIn = true;
  
  // 不再设置默认用户信息，保持空白状态直到获取到真实数据
  console.log('应用初始化完成，等待获取真实用户数据');
  
  // 在后台进行认证流程
  setTimeout(async () => {
    try {
      console.log('后台开始认证流程...');
      const authResult = await initializeAuth();
      
      if (authResult) {
        // 认证成功，同步用户信息
        const currentUser = getCurrentUser();
        if (currentUser) {
          updateUserInfo(currentUser);
        }
      } else {
        console.log('后台认证失败，但不影响用户界面');
        // 认证失败时也不影响用户界面，保持已登录状态
        // 可以在控制台记录错误，或者设置默认用户信息
      }
    } catch (error) {
      console.error('后台认证失败:', error);
      // 认证失败时也不影响用户界面，保持已登录状态
    }
  }, 100); // 延迟100ms开始后台认证，确保界面先显示
});

// 检查模块权限
const checkModulePermission = (moduleName) => {
  console.log(`[权限检查] 检查模块 ${moduleName} 的权限`);
  console.log(`[权限检查] 用户当前权限:`, user.permissions);
  console.log(`[权限检查] 数据加载状态:`, isUserDataLoaded.value);
  
  // 如果数据未加载，默认允许访问（避免阻塞用户操作）
  if (!isUserDataLoaded.value) {
    console.log(`[权限检查] 数据未加载，默认允许访问模块 ${moduleName}`);
    return true;
  }
  
  let hasPermission = false;
  
  switch (moduleName) {
    case 'douyin':
      hasPermission = user.permissions.includes('douyin:basic') || user.permissions.includes('extract');
      break;
    case 'transcribe':
      hasPermission = user.permissions.includes('transcribe:basic') || user.permissions.includes('transcribe');
      break;
    case 'markdown':
    case 'content':
      // 支持 markdown:column 或 markdown:preview 任一权限
      hasPermission = user.permissions.includes('markdown:column') || 
                     user.permissions.includes('markdown:preview') || 
                     user.permissions.includes('markdown:basic');
      break;
    case 'monitor':
      hasPermission = user.permissions.includes('monitor:basic') || user.permissions.includes('monitor');
      break;
    case 'stats':
      hasPermission = user.permissions.includes('stats:basic');
      break;
    case 'export':
      hasPermission = user.permissions.includes('export:basic');
      break;
    case 'admin':
      hasPermission = user.permissions.includes('admin:access');
      break;
    default:
      hasPermission = true;
      break;
  }
  
  console.log(`[权限检查] 模块 ${moduleName} 权限检查结果: ${hasPermission ? '通过' : '拒绝'}`);
  return hasPermission;
};

// 打开会员中心
const openMembershipCenter = () => {
  router.push('/membership');
};

// 添加令牌状态检查
const checkTokenStatus = () => {
  const token = localStorage.getItem('access_token');
  const refreshToken = localStorage.getItem('refresh_token');
  
  console.log('当前令牌状态:');
  console.log('- Access Token:', token ? '存在' : '不存在');
  console.log('- Refresh Token:', refreshToken ? '存在' : '不存在');
  
  if (token) {
    try {
      // 简单解析JWT令牌查看过期时间
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expTime = new Date(payload.exp * 1000);
      const now = new Date();
      
      console.log('- 令牌过期时间:', expTime.toLocaleString());
      console.log('- 当前时间:', now.toLocaleString());
      console.log('- 是否已过期:', now > expTime ? '是' : '否');
      
      if (now > expTime) {
        console.log('令牌已过期，建议刷新');
      }
    } catch (error) {
      console.log('- 令牌格式无效');
    }
  }
};

// 刷新用户信息
const refreshUserInfo = async () => {
  console.log('[用户信息刷新] 开始刷新用户信息...');
  
  // 重置加载状态，显示加载中
  isUserDataLoaded.value = false;
  
  try {
    // 重新从后端API获取最新用户信息
    console.log('[用户信息刷新] 调用后端API获取最新用户信息');
    const userInfo = await callApi('/plugin-auth/user');
    
    if (userInfo && userInfo.code === 0 && userInfo.data) {
      console.log('[用户信息刷新] 获取到最新用户信息:', userInfo.data);
      
      // 更新localStorage
      localStorage.setItem('user_info', JSON.stringify(userInfo.data));
      
      // 更新前端用户状态 - 传递userInfo.data而不是整个响应对象
      updateUserInfo(userInfo.data);
      
      console.log('[用户信息刷新] 用户信息已更新');
      ElMessage.success('用户信息已刷新');
    } else {
      console.log('[用户信息刷新] API返回数据异常，尝试重新认证');
      
      // 如果API返回异常，尝试重新认证
      const authResult = await initializeAuth();
      if (authResult) {
        const newUser = getCurrentUser();
        if (newUser) {
          updateUserInfo(newUser);
          console.log('[用户信息刷新] 重新认证后用户信息已更新');
        }
      }
    }
  } catch (error) {
    console.error('[用户信息刷新] 刷新用户信息失败:', error);
    
    // 如果API调用失败，尝试从localStorage获取
    console.log('[用户信息刷新] API调用失败，尝试从localStorage获取');
    const currentUser = getCurrentUser();
    if (currentUser) {
      updateUserInfo(currentUser);
      console.log('[用户信息刷新] 使用本地缓存更新用户信息');
    } else {
      ElMessage.error('刷新用户信息失败，请稍后重试');
      // 如果完全失败，保持加载状态为false，但不显示错误的默认数据
    }
  }
};
</script>

<template>
  <div class="app-container">
    <!-- 直接显示主界面，不再显示认证组件和加载状态 -->
    <div class="main-content">
      <!-- 顶部通用结构（所有页面保持一致） -->
      <!-- 1. 合并后的插件名称和用户状态区 -->
      <el-tooltip content="会员中心" placement="bottom" :show-after="500">
        <div class="plugin-header" @click="openMembershipCenter">
          <div class="title-section">
            <h1 class="plugin-title" style="font-size: 35px;">
              <img src="/short_video_master_shiliang.ico" alt="短视频通吃" class="title-icon" />
              短视频通吃
            </h1>
            <div v-if="displayUserId" class="user-id">ID：{{ displayUserId }}</div>
          </div>
          <div class="user-info-compact" style="margin-right: 0px;">
            <div v-if="isUserDataLoaded && user.points !== null" class="user-points">{{ user.points }} 积分</div>
            <div v-if="isUserDataLoaded && memberLevelName" class="user-membership" :style="{ color: memberLevelColor }">
              {{ memberLevelName }}
              <span v-if="user.memberLevel !== 'free' && formattedExpireDate">
                ({{ formattedExpireDate }})
              </span>
              <span v-if="isExpiringSoon" class="expire-soon">即将到期</span>
            </div>
            <!-- 数据加载中的占位符 -->
            <div v-if="!isUserDataLoaded" class="loading-placeholder">
              <div class="loading-text">加载中...</div>
            </div>
          </div>
        </div>
      </el-tooltip>

      <!-- 3. 导航栏 - 暂时隐藏所有导航模块 -->
      <!--
      <div class="navigation-bar">
        <div 
          v-for="item in navItems" 
          :key="item.key" 
          class="nav-item" 
          :class="{ active: $route.path === item.to, disabled: !checkModulePermission(item.key) }"
          @click="checkModulePermission(item.key) && $router.push(item.to)"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.name }}</span>
        </div>
      </div>
      -->
      
      <!-- 内容区域 -->
      <div class="content-area">
        <router-view :user="user" @refresh-user-info="refreshUserInfo"></router-view>
      </div>
    </div>
  </div>
</template>

<style>
.app-container {
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: #303133;
  width: 100%;
  min-width: 320px;
  max-width: 600px;
  margin: 0 auto;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  box-sizing: border-box;
}

/* 主内容区域 */
.main-content {
  display: flex;
  flex-direction: column;
  flex: 1;
}

/* 合并后的插件名称和用户状态区 */
.plugin-header {
  display: flex;
  align-items: center;
  height: 80px;
  width: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 15px 16px;
  border-bottom: 1px solid #DCDFE6;
  cursor: pointer;
  box-sizing: border-box;
  overflow: hidden;
}

.title-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.plugin-title {
  font-size: 35px;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1;
  display: flex;
  align-items: center;
}

.title-icon {
  width: 32px;
  height: 32px;
  margin-right: 8px;
  filter: brightness(1.1) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
  flex-shrink: 0;
}

.user-id {
  font-size: 11px;
  color: #E8F4FF;
  margin-top: 2px;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
  opacity: 0.8;
}

.user-info-compact {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin-left: 20px;
  flex-shrink: 0;
  min-width: 0;
}

.user-points {
  font-size: 14px;
  color: #FFE066;
  font-weight: 500;
  margin-bottom: 2px;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
}

.user-membership {
  font-size: 12px;
  color: #E8F4FF;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
}

.expire-soon {
  color: #FFE6E6;
  margin-left: 4px;
  background-color: rgba(255, 82, 82, 0.3);
  padding: 2px 6px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid rgba(255, 82, 82, 0.5);
}

.loading-placeholder {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.loading-text {
  font-size: 12px;
  color: #E8F4FF;
  opacity: 0.6;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
}

/* 插件名称区 - 旧样式保留但不再使用 */
.plugin-name-area {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60px;
  width: 100%;
  background-color: #ffffff;
  padding: 10px;
  border-bottom: 1px solid #DCDFE6;
}

.plugin-logo {
  height: 40px;
  width: 40px;
  margin-right: 10px;
}

.plugin-logo img {
  height: 100%;
  width: 100%;
  object-fit: contain;
}

/* 用户状态区域 */
.user-status {
  display: flex;
  align-items: center;
  height: 60px;
  padding: 10px 16px;
  background-color: #fff;
  border-bottom: 1px solid #DCDFE6;
  cursor: pointer;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 12px;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #2E6BE6;
  color: white;
  font-size: 18px;
  font-weight: bold;
}

.user-info {
  flex: 1;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
}

/* 导航栏 */
.navigation-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
  width: 100%;
  background-color: #ffffff;
  padding: 8px 0;
  border-bottom: 1px solid #DCDFE6;
  z-index: 10;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #606266;
}

.nav-item .el-icon {
  font-size: 20px;
  margin-bottom: 4px;
}

.nav-item span {
  font-size: 12px;
}

.nav-item.active {
  color: #2E6BE6;
}

.nav-item.disabled {
  color: #C0C4CC;
  cursor: not-allowed;
}

/* 内容区域 */
.content-area {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  overflow-x: hidden;
  box-sizing: border-box;
  width: 100%;
}

/* 适配小屏幕 */
@media (max-width: 480px) {
  .plugin-header {
    height: 80px;
    padding: 15px 12px;
  }
  
  .plugin-title {
    font-size: 28px !important;
  }
  
  .user-info-compact {
    margin-left: 12px;
  }
  
  .user-points {
    font-size: 12px;
  }
  
  .user-membership {
    font-size: 10px;
  }
  
  .expire-soon {
    font-size: 9px;
    padding: 1px 4px;
  }
}

@media (max-width: 358px) {
  .nav-item .el-icon {
    font-size: 20px;
  }
  
  .nav-item span {
    font-size: 10px;
  }
  
  .plugin-header {
    height: 80px;
    padding: 15px 10px;
  }
  
  .plugin-title {
    font-size: 24px !important;
  }
  
  .user-info-compact {
    margin-left: 8px;
  }
  
  .user-points {
    font-size: 11px;
  }
  
  .user-membership {
    font-size: 9px;
  }
  
  .expire-soon {
    font-size: 8px;
    padding: 1px 3px;
  }
}
</style>
