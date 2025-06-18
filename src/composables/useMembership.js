/**
 * @Version    : v1.00
 * @Author     : Amon
 * @Date       : 20245-05-06
 * @desc       : 会员系统相关的可复用逻辑钩子
 */
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import * as membershipApi from '../api/membership';

export function useMembership(initialUserData = null) {
  // 会员信息
  const memberInfo = reactive({
    userId: '',
    levelId: 0,
    levelCode: 'free',
    levelName: '免费用户',
    startDate: null,
    endDate: null,
    isActive: true,
    daysLeft: 0,
    discount: 1.0,
    monthlyPoints: 0,
    currentMonthUsedPoints: 0
  });

  // 会员等级列表
  const memberLevels = ref([]);

  // 功能使用统计
  const usageStats = reactive({});

  // 积分余额
  const pointsBalance = ref(0);

  // 是否正在加载
  const loading = ref(false);

  // 错误信息
  const error = ref(null);

  // 计算属性：是否是付费会员
  const isPaidMember = computed(() => {
    return memberInfo.levelCode !== 'free' && memberInfo.isActive;
  });

  // 计算属性：是否即将到期（7天内）
  const isExpiringSoon = computed(() => {
    if (!memberInfo.endDate || !isPaidMember.value) return false;
    return memberInfo.daysLeft > 0 && memberInfo.daysLeft <= 7;
  });

  // 计算属性：是否已过期
  const isExpired = computed(() => {
    return memberInfo.levelCode !== 'free' && !memberInfo.isActive;
  });

  // 加载会员信息
  const loadMemberInfo = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await membershipApi.getMembershipStatus();
      if (response.code === 0) {
        Object.assign(memberInfo, response.data);
      } else {
        error.value = response.message || '获取会员信息失败';
      }
    } catch (err) {
      console.error('加载会员信息失败:', err);
      error.value = '网络错误，无法获取会员信息';
    } finally {
      loading.value = false;
    }
  };

  // 加载会员等级列表
  const loadMemberLevels = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await membershipApi.getMembershipLevels();
      if (response.code === 0) {
        memberLevels.value = response.data || [];
      } else {
        error.value = response.message || '获取会员等级列表失败';
      }
    } catch (err) {
      console.error('加载会员等级列表失败:', err);
      error.value = '网络错误，无法获取会员等级列表';
    } finally {
      loading.value = false;
    }
  };

  // 加载积分余额
  const loadPointsBalance = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await membershipApi.getPointsBalance();
      if (response.code === 0) {
        pointsBalance.value = response.data?.pointsBalance || 0;
      } else {
        error.value = response.message || '获取积分余额失败';
      }
    } catch (err) {
      console.error('加载积分余额失败:', err);
      error.value = '网络错误，无法获取积分余额';
    } finally {
      loading.value = false;
    }
  };

  // 检查功能使用权限
  const checkFeaturePermission = async (featureCode, amount = 1) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await membershipApi.checkFeaturePermission({
        featureCode,
        amount
      });

      if (response.code === 0) {
        return {
          hasPermission: response.data.hasPermission,
          quotaSource: response.data.quotaSource,
          quotaLeft: response.data.quotaLeft,
          consumedAmount: response.data.consumedAmount
        };
      } else {
        error.value = response.message || '权限检查失败';
        return {
          hasPermission: false,
          quotaSource: null,
          quotaLeft: null,
          error: response.message
        };
      }
    } catch (err) {
      console.error('检查功能权限失败:', err);
      error.value = '网络错误，无法检查功能权限';
      return {
        hasPermission: false,
        quotaSource: null,
        quotaLeft: null,
        error: '网络错误'
      };
    } finally {
      loading.value = false;
    }
  };

  // 记录功能使用
  const logFeatureUsage = async (featureCode, amount = 1, quotaSource = 'member') => {
    try {
      const response = await membershipApi.logFeatureUsage({
        featureCode,
        amount,
        quotaSource
      });

      return response.code === 0;
    } catch (err) {
      console.error('记录功能使用失败:', err);
      return false;
    }
  };

  // 查询功能使用额度
  const getFeatureQuota = async (featureCode) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await membershipApi.getUserQuota(featureCode);
      if (response.code === 0) {
        return response.data;
      } else {
        error.value = response.message || '获取功能额度失败';
        return null;
      }
    } catch (err) {
      console.error('查询功能额度失败:', err);
      error.value = '网络错误，无法查询功能额度';
      return null;
    } finally {
      loading.value = false;
    }
  };

  // 创建会员订单
  const createMemberOrder = async (levelId, durationMonths = 1) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await membershipApi.createMembershipOrder({
        levelId,
        durationMonths,
        isRenewal: false,
        isUpgrade: false
      });

      if (response.code === 0) {
        return response.data;
      } else {
        error.value = response.message || '创建会员订单失败';
        return null;
      }
    } catch (err) {
      console.error('创建会员订单失败:', err);
      error.value = '网络错误，无法创建会员订单';
      return null;
    } finally {
      loading.value = false;
    }
  };

  // 处理会员升级或续费
  const handleMemberUpgradeOrRenew = async (levelId, durationMonths = 1) => {
    try {
      // 1. 创建订单
      const orderInfo = await createMemberOrder(levelId, durationMonths);
      if (!orderInfo) {
        ElMessage.error('创建订单失败，请稍后重试');
        return false;
      }

      // 2. 跳转到支付页面
      if (orderInfo.paymentUrl) {
        window.location.href = orderInfo.paymentUrl;
        return true;
      } else {
        ElMessage.error('获取支付链接失败，请稍后重试');
        return false;
      }
    } catch (err) {
      console.error('处理会员升级/续费失败:', err);
      ElMessage.error('操作失败，请稍后重试');
      return false;
    }
  };

  // 处理功能包购买
  const handlePackagePurchase = async (packageId) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await membershipApi.createPackageOrder({
        packageId
      });

      if (response.code === 0) {
        if (response.data.paymentUrl) {
          window.location.href = response.data.paymentUrl;
          return true;
        } else {
          error.value = '获取支付链接失败';
          return false;
        }
      } else {
        error.value = response.message || '创建功能包订单失败';
        return false;
      }
    } catch (err) {
      console.error('购买功能包失败:', err);
      error.value = '网络错误，无法购买功能包';
      return false;
    } finally {
      loading.value = false;
    }
  };

  // 处理积分充值
  const handlePointsRecharge = async (points) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await membershipApi.createPointsPurchaseOrder({
        pointsAmount: points
      });

      if (response.code === 0) {
        if (response.data.paymentUrl) {
          window.location.href = response.data.paymentUrl;
          return true;
        } else {
          error.value = '获取支付链接失败';
          return false;
        }
      } else {
        error.value = response.message || '创建积分充值订单失败';
        return false;
      }
    } catch (err) {
      console.error('积分充值失败:', err);
      error.value = '网络错误，无法充值积分';
      return false;
    } finally {
      loading.value = false;
    }
  };

  // 检查功能权限并提供用户引导
  const checkAndGuideForFeature = async (featureCode, amount = 1) => {
    // 检查权限
    const permissionResult = await checkFeaturePermission(featureCode, amount);
    
    if (permissionResult.hasPermission) {
      // 有权限，记录使用
      await logFeatureUsage(featureCode, amount, permissionResult.quotaSource);
      return {
        hasPermission: true,
        ...permissionResult
      };
    } else {
      // 无权限，引导用户
      const quota = await getFeatureQuota(featureCode);
      
      // 弹窗提示
      try {
        const action = await ElMessageBox.confirm(
          `您的${featureCode}功能使用额度不足，请选择升级会员或购买功能包。`,
          '额度不足',
          {
            confirmButtonText: '升级会员',
            cancelButtonText: '购买功能包',
            type: 'warning',
            showClose: true,
            distinguishCancelAndClose: true,
            closeOnClickModal: false
          }
        );
        
        // 用户选择升级会员
        if (action === 'confirm') {
          // 获取推荐的会员等级
          const recommendedLevel = memberLevels.value.find(
            level => level.levelCode !== 'free' && level.levelCode !== memberInfo.levelCode
          );
          
          if (recommendedLevel) {
            await handleMemberUpgradeOrRenew(recommendedLevel.id);
          } else {
            ElMessage.warning('未找到合适的会员等级，请手动前往会员中心查看');
          }
        } else if (action === 'cancel') {
          // 用户选择购买功能包
          // 获取与功能对应的功能包(这里需要功能包列表API支持查询)
          const packages = await membershipApi.getFeaturePackages({ featureCode });
          
          if (packages.code === 0 && packages.data && packages.data.length > 0) {
            // 选择第一个包
            await handlePackagePurchase(packages.data[0].id);
          } else {
            ElMessage.warning('未找到合适的功能包，请手动前往功能商店查看');
          }
        }
      } catch (err) {
        if (err === 'close') {
          // 用户关闭弹窗
          console.log('用户关闭弹窗');
        } else {
          console.error('引导用户过程发生错误:', err);
        }
      }
      
      return {
        hasPermission: false,
        ...permissionResult,
        recommendedUpgrade: quota?.recommendedUpgrade,
        recommendedPackage: quota?.recommendedPackage
      };
    }
  };

  // 初始化数据
  if (initialUserData) {
    // 如果提供了初始数据，直接使用
    if (initialUserData.levelCode) {
      memberInfo.levelCode = initialUserData.levelCode;
    }
    if (initialUserData.levelName) {
      memberInfo.levelName = initialUserData.levelName;
    }
    if (initialUserData.memberLevel) {
      memberInfo.levelCode = initialUserData.memberLevel;
      // 根据级别设置名称
      const levelNameMap = {
        'free': '免费用户',
        'basic': '基础会员',
        'pro': '专业会员',
        'enterprise': '企业会员'
      };
      memberInfo.levelName = levelNameMap[initialUserData.memberLevel] || '未知';
    }
    if (initialUserData.memberExpireTime) {
      memberInfo.endDate = initialUserData.memberExpireTime;
      // 计算剩余天数
      const now = new Date();
      const endDate = new Date(initialUserData.memberExpireTime);
      const diffTime = endDate - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      memberInfo.daysLeft = diffDays > 0 ? diffDays : 0;
      memberInfo.isActive = diffDays > 0;
    }
    if (initialUserData.points) {
      pointsBalance.value = initialUserData.points;
    }
    if (initialUserData.usageStats) {
      Object.assign(usageStats, initialUserData.usageStats);
    }
  }

  // 组件挂载时加载数据
  onMounted(() => {
    // 如果没有初始数据，从API加载数据
    if (!initialUserData) {
      loadMemberInfo();
      loadPointsBalance();
    }
    
    // 无论如何都加载会员等级列表
    loadMemberLevels();
  });

  return {
    memberInfo,
    memberLevels,
    usageStats,
    pointsBalance,
    loading,
    error,
    isPaidMember,
    isExpiringSoon,
    isExpired,
    loadMemberInfo,
    loadMemberLevels,
    loadPointsBalance,
    checkFeaturePermission,
    logFeatureUsage,
    getFeatureQuota,
    createMemberOrder,
    handleMemberUpgradeOrRenew,
    handlePackagePurchase,
    handlePointsRecharge,
    checkAndGuideForFeature
  };
} 