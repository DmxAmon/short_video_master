import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../views/Home.vue'
import MembershipView from '../views/MembershipView.vue'
import TranscribeView from '../views/TranscribeView.vue'
import MarkdownView from '../views/MarkdownView.vue'
import MonitorView from '../views/MonitorView.vue'
import MembershipTestView from '../views/MembershipTestView.vue'
import PaymentTestView from '../views/PaymentTestView.vue'
import { ElMessage } from 'element-plus'

// 权限映射表 - 用于处理新旧权限标识符
const permissionMappings = {
  // 旧权限标识符到新权限标识符的映射
  'extract': ['douyin:basic'],
  'transcribe': ['transcribe:basic'],
  'batch': ['douyin:batch'],
  'monitor': ['monitor:basic'],
  
  // 新权限标识符到旧权限标识符的映射
  'douyin:basic': ['extract'],
  'transcribe:basic': ['transcribe'],
  'douyin:batch': ['batch'],
  'monitor:basic': ['monitor']
}

// 路由配置
const routes = [
  {
    path: '/',
    name: 'home',
    component: Home,
    meta: {
      requiresAuth: true,
      title: '抖音视频采集',
      permissions: ['douyin:basic', 'extract'] // 抖音视频采集权限
    }
  },
  {
    path: '/transcribe',
    name: 'transcribe',
    component: TranscribeView,
    meta: {
      requiresAuth: true,
      title: '视频转写',
      permissions: ['transcribe:basic', 'transcribe'] // 视频转写权限
    }
  },
  {
    path: '/membership',
    name: 'membership',
    component: MembershipView,
    meta: {
      requiresAuth: true,
      title: '会员中心',
      permissions: [] // 会员中心不需要特殊权限
    }
  },
  {
    path: '/content',
    name: 'content',
    component: MarkdownView,
    meta: {
      requiresAuth: true,
      title: 'Markdown预览',
      permissions: ['markdown:basic', 'markdown:column', 'markdown:preview'] // Markdown相关权限
    }
  },
  {
    path: '/monitor',
    name: 'monitor',
    component: MonitorView,
    meta: {
      requiresAuth: true,
      title: '视频监控',
      permissions: ['monitor:basic', 'monitor'] // 监控权限
    }
  },
  {
    path: '/membership-test',
    name: 'membership-test',
    component: MembershipTestView,
    meta: {
      requiresAuth: false,
      title: '会员测试'
    }
  },
  {
    path: '/payment-test',
    name: 'payment-test',
    component: PaymentTestView,
    meta: {
      requiresAuth: false,
      title: '支付测试'
    }
  },
  {
    path: '/membership-upgrade-test',
    name: 'membership-upgrade-test',
    component: () => import('../views/MembershipUpgradeTestView.vue'),
    meta: {
      requiresAuth: false,
      title: '会员升级测试'
    }
  },
  {
    path: '/api-test',
    name: 'api-test',
    component: () => import('../views/APITestView.vue'),
    meta: {
      requiresAuth: false,
      title: 'API测试'
    }
  },
  {
    path: '/membership-debug',
    name: 'membership-debug',
    component: () => import('../views/MembershipDebugView.vue'),
    meta: {
      requiresAuth: false,
      title: '会员状态调试'
    }
  }
]

// 创建路由实例
const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 全局前置守卫 - 处理认证
router.beforeEach((to, from, next) => {
  console.log(`[路由] 导航到: ${to.path}, 来自: ${from.path}`)
  
  // 检查该路由是否需要认证
  if (to.matched.some(record => record.meta.requiresAuth)) {
    // 检查是否已经认证
    const token = localStorage.getItem('access_token') || localStorage.getItem('auth_token')
    
    if (!token) {
      console.log('[路由] 未找到认证令牌，但允许访问页面进行静默认证')
      // 允许访问页面，让App.vue中的认证逻辑处理
      next()
    } else {
      // 已认证，检查权限
      const userPermissions = getUserPermissions()
      const requiredPermissions = to.meta.permissions || []
      
      console.log(`[路由] 权限检查 - 用户权限: ${userPermissions.join(', ')}, 需要权限: ${requiredPermissions.join(', ')}`)
      
      // 如果路由不需要特殊权限，或者用户有权限，或者用户权限为空（静默认证中）
      if (requiredPermissions.length === 0 || 
          userPermissions.length === 0 || // 允许权限为空的情况，让页面组件自己处理权限
          hasPermission(userPermissions, requiredPermissions)) {
        // 允许访问
        console.log(`[权限通过] 用户访问 ${to.path}`)
        next() 
      } else {
        // 没有权限，显示提示并跳转到会员中心
        console.log(`[权限拒绝] 用户访问 ${to.path} 被拒绝`)
        ElMessage.warning(`您没有访问该页面的权限，需要 ${getMappedPermissionNames(requiredPermissions)} 权限`)
        next({ name: 'membership' })
      }
    }
  } else {
    // 不需要认证的路由，直接访问
    console.log(`[路由] 无需认证，直接访问: ${to.path}`)
    next()
  }
})

// 获取用户权限
function getUserPermissions() {
  try {
    const userInfo = localStorage.getItem('user_info')
    console.log('[权限] 从localStorage读取用户信息:', userInfo)
    
    if (userInfo && userInfo !== "undefined" && userInfo !== "null") {
      const userData = JSON.parse(userInfo)
      console.log('[权限] 解析后的用户数据:', userData)
      
      let permissions = []
      
      // 检查多个可能的权限字段
      if (userData.permissions && Array.isArray(userData.permissions)) {
        permissions = userData.permissions
      } else if (userData.user?.permissions && Array.isArray(userData.user.permissions)) {
        permissions = userData.user.permissions
      } else {
        // 根据会员等级或用户角色设置权限
        const memberLevel = userData.memberLevel || userData.membership?.levelCode || userData.role
        console.log('[权限] 根据会员等级/角色设置权限:', memberLevel)
        
        switch (memberLevel) {
          case 'admin':
            permissions = ['douyin:basic', 'extract', 'transcribe:basic', 'transcribe', 'douyin:batch', 'batch', 'monitor:basic', 'monitor', 'markdown:basic', 'markdown:column', 'markdown:preview']
            break
          case 'professional':
          case 'premium': 
          case 'pro':
            // 专业会员拥有所有权限
            permissions = ['douyin:basic', 'extract', 'transcribe:basic', 'transcribe', 'douyin:batch', 'batch', 'monitor:basic', 'monitor', 'markdown:basic', 'markdown:column', 'markdown:preview']
            break
          case 'advanced':
          case 'standard':
          case 'basic':
            // 高级会员拥有基础功能
            permissions = ['douyin:basic', 'extract', 'transcribe:basic', 'transcribe', 'markdown:basic', 'markdown:preview']
            break
          case 'normal':
          case 'free':
          case 'user':
          default:
            // 普通用户拥有基础权限
            permissions = ['douyin:basic', 'extract', 'transcribe:basic', 'transcribe', 'markdown:preview']
            break
        }
        
        console.log(`[权限] 会员等级 ${memberLevel} 获得权限:`, permissions)
      }
      
      console.log('[权限] 最终获取到用户权限:', permissions)
      return permissions
    }
  } catch (error) {
    console.error('[权限] 获取用户权限失败:', error)
    // 清除可能损坏的存储数据
    localStorage.removeItem('user_info')
  }
  
  // 返回默认权限，确保用户可以访问基本功能
  const defaultPermissions = ['douyin:basic', 'transcribe:basic', 'markdown:preview']
  console.log('[权限] 返回默认权限:', defaultPermissions)
  return defaultPermissions
}

// 获取权限的用户友好名称
function getMappedPermissionNames(permissions) {
  const permissionNameMap = {
    'douyin:basic': '抖音基础',
    'extract': '抖音基础',
    'transcribe:basic': '视频转写',
    'transcribe': '视频转写',
    'douyin:batch': '批量采集',
    'batch': '批量采集',
    'monitor:basic': '视频监控',
    'monitor': '视频监控',
    'markdown:basic': 'Markdown基础',
    'markdown:column': 'Markdown列',
    'markdown:preview': 'Markdown预览'
  }
  
  return permissions.map(p => permissionNameMap[p] || p).join('或')
}

// 检查用户是否有所需权限
function hasPermission(userPermissions, requiredPermissions) {
  console.log('[权限检查] 用户权限:', userPermissions, '需要权限:', requiredPermissions)
  
  // 检查用户是否有任一所需权限
  return requiredPermissions.some(permission => {
    // 直接匹配
    if (userPermissions.includes(permission)) {
      console.log(`[权限匹配] 用户拥有权限 ${permission}`)
      return true
    }
    
    // 通过映射表匹配
    const mappedPermissions = permissionMappings[permission]
    if (mappedPermissions) {
      const hasMappedPermission = mappedPermissions.some(p => userPermissions.includes(p))
      if (hasMappedPermission) {
        console.log(`[权限匹配] 用户拥有映射权限 ${permission} -> ${mappedPermissions.filter(p => userPermissions.includes(p)).join(', ')}`)
      }
      return hasMappedPermission
    }
    
    return false
  })
}

export default router 