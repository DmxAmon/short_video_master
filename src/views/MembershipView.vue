<!--
 * @Version    : v1.00
 * @Author     : Amon
 * @Date       : 2024-07-15
 * @desc       : 会员中心组件
-->
<template>
  <div class="membership-container">
    <div class="page-header">
      <h2 class="page-title">会员中心</h2>
      <el-button @click="goBack" class="back-button">返回</el-button>
    </div>
    
    <!-- 当前会员信息 -->
    <InfoCard title="当前会员状态">
      <div class="membership-status">
        <div class="membership-level">
          <div class="level-badge" :class="user.memberLevel">
            {{ memberLevelDisplay }}
          </div>
          <div class="level-expire" v-if="user.memberLevel !== 'free' && user.memberExpireTime">
            有效期至: {{ formattedExpireTime }}
            <span v-if="isExpiringSoon" class="expire-soon">即将到期</span>
          </div>
        </div>
        
        <div class="membership-points">
          <el-icon><Medal /></el-icon>
          <span>当前积分: {{ user.points }}</span>
          <el-tooltip content="更多积分信息" placement="top">
            <el-icon class="info-icon" @click="showPointsDetails"><InfoFilled /></el-icon>
          </el-tooltip>
        </div>
      </div>
    </InfoCard>
    
    <!-- 积分信息卡片 -->
    <InfoCard title="积分余额">
      <div class="points-info">
        <div class="points-balance">
          <span class="balance-number">{{ user.points }}</span>
          <span class="balance-label">可用积分</span>
        </div>
        
        <div class="points-details">
        <!-- 这里暂时注释掉，暂时不显示用户消费的积分 -->
       <!--    <div class="points-item">
            <span class="item-label">本月已消费积分:</span>
            <span class="item-value">{{ monthlyPointsUsed }}</span>
          </div> -->
          <div class="points-item">
            <span class="item-label">积分充值优惠:</span>
            <span class="item-value" :class="{ 'highlight': isMember }">
              {{ isMember ? '6.9折优惠' : '无优惠（原价）' }}
            </span>
          </div>
          <div class="points-item" v-if="isMember">
            <span class="item-label">会员特权:</span>
            <span class="item-value highlight">充值积分享受6.9折优惠</span>
          </div>
          
          <el-button 
            type="primary" 
            class="recharge-btn"
            @click="showPointsRecharge"
          >
            充值积分
          </el-button>
        </div>
      </div>
    </InfoCard>
    
    <!-- 会员特权 -->
    <InfoCard title="会员特权对比">
      <div class="tier-tabs">
        <el-radio-group v-model="activeTier" @change="handleTierChange" class="tier-selector">
          <el-radio-button label="normal">普通会员</el-radio-button>
          <el-radio-button label="professional">专业会员</el-radio-button>
        </el-radio-group>
        
        <div class="tier-content">
          <!-- 普通会员 -->
          <div v-if="activeTier === 'normal'" class="tier-details">
            <h3 class="tier-name">普通会员<span class="tier-tag free">免费</span></h3>
           <!-- <div class="tier-price">0 <small>元</small></div> -->
            <div class="tier-points">
              <div class="points-label">积分充值</div>
              <div class="points-value">原价</div>
            </div>
            <ul class="tier-features">
              <li><el-icon color="#67C23A"><Check /></el-icon> 抖音单视频数据提取</li>
              <li><el-icon color="#67C23A"><Check /></el-icon> 视频转写功能</li>
              <li><el-icon color="#67C23A"><Check /></el-icon> 基础视频监控</li>
              <li><el-icon color="#67C23A"><Check /></el-icon> 基础Markdown功能</li>
              <li><el-icon color="#909399"><Close /></el-icon> 积分充值无折扣</li>
              <li><el-icon color="#909399"><Close /></el-icon> 按原价购买积分</li>
            </ul>
            <el-button 
              v-if="user.memberLevel === 'normal' || user.memberLevel === 'free'"
              disabled
              class="tier-action" 
            >
              当前等级
            </el-button>
            <el-button 
              v-else
              class="tier-action" 
              @click="switchToFree"
            >
              降级到普通会员
            </el-button>
          </div>
          

          
          <!-- 专业会员 -->
          <div v-if="activeTier === 'professional'" class="tier-details">
            <h3 class="tier-name">专业会员<span class="tier-tag pro">推荐</span></h3>
            <div class="tier-price">{{ getProfessionalMemberPrice() }} <small>元/年</small></div>
            <div class="tier-points">
              <div class="points-label">积分充值优惠</div>
              <div class="points-value">6.9折</div>
            </div>
            <ul class="tier-features">
              <li><el-icon color="#67C23A"><Check /></el-icon> 升级额外赠送10000积分</li>
              <li><el-icon color="#67C23A"><Check /></el-icon> 每月赠送10w积分</li>
              <li><el-icon color="#67C23A"><Check /></el-icon> 抖音单视频数据提取</li>
              <li><el-icon color="#67C23A"><Check /></el-icon> 抖音作者主页批量采集转写</li>
              <li><el-icon color="#67C23A"><Check /></el-icon> 抖音多链接批量提取转写</li>
              <li><el-icon color="#67C23A"><Check /></el-icon> 基础视频转写功能</li>
              <li><el-icon color="#67C23A"><Check /></el-icon> 高级视频转写功能</li>
              <li><el-icon color="#67C23A"><Check /></el-icon> 高级Markdown功能</li>
              <li><el-icon color="#67C23A"><Check /></el-icon> <b>积分充值6.9折优惠</b></li>
            </ul>
            <el-button 
              type="primary" 
              class="tier-action" 
              :disabled="user.memberLevel === 'professional' || user.memberLevel === 'premium' || user.memberLevel === 'pro'"
              @click="upgradeMembership('professional')"
            >
              {{ user.memberLevel === 'professional' || user.memberLevel === 'premium' || user.memberLevel === 'pro' ? '当前等级' : '立即升级' }}
            </el-button>
          </div>
        </div>
      </div>
    </InfoCard>
    
    <!-- 积分充值套餐 -->
    <InfoCard title="积分充值套餐">
      <div class="points-packages">
        <div class="packages-intro">
          充值积分可用于各项功能的消费，充值的积分永久有效不会清零<br>
          <span v-if="isMember" class="member-discount-tip">🎉 您是会员用户，充值积分享受6.9折优惠！</span>
          <span v-else class="normal-user-tip">💡 升级会员后充值积分可享受6.9折优惠</span>
        </div>
        
        <div class="packages-list">
          <div 
            v-for="(pkg, index) in pointsPackages" 
            :key="pkg.id || index" 
            class="package-item" 
            :class="{ 'selected': selectedPackage === index }"
            @click="selectPackage(index)"
          >
            <div class="package-points">{{ pkg.points }}</div>
            <div class="package-label">积分</div>
            <div class="package-price-container">
              <!-- 会员用户显示优惠价格 -->
              <div v-if="isMember" class="member-price">
                <div class="original-price">原价¥{{ pkg.price }}</div>
                <div class="current-price">会员价¥{{ pkg.member_price }}</div>
                <div class="discount-badge">6.9折</div>
              </div>
              <!-- 普通用户显示原价和会员优惠提示 -->
              <div v-else class="normal-price">
                <div class="current-price">¥{{ pkg.price }}</div>
                <div class="member-hint">会员价¥{{ pkg.member_price }}</div>
                <div class="upgrade-hint">升级享6.9折</div>
              </div>
            </div>
            <div v-if="pkg.popular" class="package-tag">热门推荐</div>
          </div>
        </div>
        
        <div class="package-action">
          <el-button 
            type="primary" 
            :disabled="selectedPackage === null"
            @click="purchasePoints"
          >
            立即购买
          </el-button>
        </div>
      </div>
    </InfoCard>
    
    <!-- 积分使用规则 -->
    <InfoCard title="积分使用规则">
      <div class="points-rules">
        <el-collapse>
          <el-collapse-item title="功能积分消耗规则" name="1">
            <ul class="rules-list">
              <li>单视频采集：10积分/个视频</li>
              <li>作者主页采集：1积分/个视频</li>
              <li>视频转写：1积分/秒钟</li>
              <li>高级格式导出：5积分/次</li>
            </ul>
          </el-collapse-item>
          
          <el-collapse-item title="积分获取方式" name="2">
            <ul class="rules-list">
              <li>新用户注册：赠送100积分</li>
              <li>专业会员：每月赠送100000积分</li>
              <li>积分充值：可随时购买积分套餐</li>
            </ul>
          </el-collapse-item>
          
          <el-collapse-item title="积分使用说明" name="3">
            <ul class="rules-list">
              <li>专业会员：积分充值享6.9折优惠</li>
              <li>充值的积分永久有效不会清零</li>
              <li>会员赠送的积分每月赠送</li>
            </ul>
          </el-collapse-item>
        </el-collapse>
      </div>
    </InfoCard>
    
    <!-- 支付模态框 -->
    <PaymentModal
      v-model="showPaymentModal"
      :package="selectedPackageForPayment"
      :is-member="isMember"
      @payment-success="handlePaymentSuccess"
      @payment-cancel="handlePaymentCancel"
    />

    <!-- 会员升级模态框 -->
    <MembershipUpgradeModal
      v-model="showUpgradeModal"
      :current-member-level="user.memberLevel"
      :member-expire-time="user.memberExpireTime"
      :target-level="targetUpgradeLevel"
      @upgrade-success="handleUpgradeSuccess"
      @membership-updated="handleMembershipUpdated"
    />

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Check, Close, Medal, InfoFilled } from '@element-plus/icons-vue';
import InfoCard from '../components/common/InfoCard.vue';
import PaymentModal from '../components/payment/PaymentModal.vue';
import MembershipUpgradeModal from '../components/membership/MembershipUpgradeModal.vue';
import { getMembershipStatus, getPointsTransactions, getMembershipLevelsNew } from '../api/membership';
import { getPointsPackages, createPointsOrder } from '../api/points';

const props = defineProps({
  user: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['refresh-user-info']);

const router = useRouter();
const activeTier = ref('professional');
const selectedPackage = ref(null);
const monthlyPointsUsed = ref(0);

// 支付相关状态
const showPaymentModal = ref(false);
const selectedPackageForPayment = ref(null);

// 会员升级相关状态
const showUpgradeModal = ref(false);
const targetUpgradeLevel = ref('professional');

// 会员等级数据
const membershipLevels = ref([]);

// 会员等级显示
const memberLevelDisplay = computed(() => {
  const levels = {
    'normal': '普通会员',
    'free': '普通会员',
    'advanced': '高级会员',
    'standard': '高级会员',
    'basic': '高级会员',
    'professional': '专业会员',
    'premium': '专业会员',
    'pro': '专业会员'
  };
  return levels[props.user.memberLevel] || '普通会员';
});

// 积分套餐
const pointsPackages = ref([
  // 生产环境真实套餐价格 - 初始显示，确保用户一进来就能看到套餐
  { id: 1, name: '10000积分', points: 10000, price: 9.9, member_price: 6.90, popular: false },
  { id: 2, name: '50000积分', points: 50000, price: 39.9, member_price: 27.5, popular: false },
  { id: 3, name: '100000积分', points: 100000, price: 59.9, member_price: 40.9, popular: true }
]);

// 是否为会员
const isMember = computed(() => {
  const memberLevel = props.user.memberLevel;
  return memberLevel === 'professional' || memberLevel === 'premium' || memberLevel === 'pro';
});

// 下月可获得积分
const nextMonthPoints = computed(() => {
  const memberLevel = props.user.memberLevel;
  if (memberLevel === 'professional' || memberLevel === 'premium' || memberLevel === 'pro') return 100000;
  return 0;
});

// 会员过期时间格式化
const formattedExpireTime = computed(() => {
  if (!props.user.memberExpireTime) return '';
  
  try {
    const expireDate = new Date(props.user.memberExpireTime);
    const year = expireDate.getFullYear();
    const month = String(expireDate.getMonth() + 1).padStart(2, '0');
    const day = String(expireDate.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (e) {
    console.error('日期格式化错误:', e);
    return '日期无效';
  }
});

// 下月积分发放日期
const nextPointsReleaseDate = computed(() => {
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const year = nextMonth.getFullYear();
  const month = String(nextMonth.getMonth() + 1).padStart(2, '0');
  const day = '01';
  
  return `${year}-${month}-${day}`;
});

// 会员过期计算
const isExpiringSoon = computed(() => {
  if (!props.user.memberExpireTime) return false;
  const expireDate = new Date(props.user.memberExpireTime);
  const now = new Date();
  const diffDays = Math.floor((expireDate - now) / (24 * 60 * 60 * 1000));
  return diffDays >= 0 && diffDays <= 7;
});

onMounted(async () => {
  // 默认显示专业会员页面，引导用户充值
  activeTier.value = 'professional';
  
  let hasTokenError = false; // 标记是否遇到token错误
  
  // 获取会员等级列表和价格信息
  try {
    const response = await getMembershipLevelsNew();
    if (response && response.data && response.data.levels) {
      membershipLevels.value = response.data.levels;
      console.log('会员等级数据:', membershipLevels.value);
      
      // 专门查找专业会员并打印信息
      const professionalMember = response.data.levels.find(level => 
        level.name === '专业会员' || level.id === 11
      );
      console.log('找到的专业会员:', professionalMember);
    }
  } catch (error) {
    console.error('获取会员等级失败:', error);
    
    // 检查是否为token过期错误
    if (error.message && (error.message.includes('Token') || error.message.includes('登录') || error.message.includes('过期'))) {
      hasTokenError = true;
      console.log('检测到token过期，停止后续API调用');
      return; // 立即停止执行
    }
    
    // 设置默认数据
    membershipLevels.value = [
      {
        id: 1,
        name: '普通会员',
        level: 0,
        description: '享受基础功能服务',
        price: 0,
        duration_days: 0,
        recharge_discount_rate: 1.0,
        discount_percentage: 0,
        color: '#666666',
        features: []
      },
      {
        id: 11,
        name: '专业会员',
        level: 11,
        description: '享受6.9折充值优惠及更多特权',
        price: 298,
        duration_days: 365,
        recharge_discount_rate: 0.69,
        discount_percentage: 31,
        color: '#1890ff',
        features: ['充值优惠', '优先客服', '专属标识']
      }
    ];
  }
  
  // 如果前面已经检测到token错误，停止后续API调用
  if (hasTokenError) {
    return;
  }
  
  // 获取积分套餐列表 - 后台异步更新，不影响初始显示
  getPointsPackages().then(response => {
    if (response && response.data && response.data.packages) {
      // 成功获取后端数据时，更新套餐列表
      pointsPackages.value = response.data.packages.map(pkg => ({
        id: pkg.id,
        name: pkg.name,
        points: pkg.points,
        price: pkg.original_price || pkg.price,
        member_price: pkg.member_price,
        popular: pkg.popular,
        description: pkg.description,
        bonus_description: pkg.bonus_description
      }));
      console.log('积分套餐数据已从后端更新:', pointsPackages.value);
    }
  }).catch(error => {
    console.error('获取积分套餐失败，请刷新页面', error);
    // 发生错误时保持使用初始的真实套餐数据，不改变显示
  });
  
  // 获取本月积分消费
  try {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const response = await getPointsTransactions({
      startDate: firstDay.toISOString().split('T')[0],
      endDate: lastDay.toISOString().split('T')[0],
      type: 'consume'
    });
    
    if (response && response.data && response.data.transactions) {
      let total = 0;
      response.data.transactions.forEach(trans => {
        total += Math.abs(trans.points);
      });
      monthlyPointsUsed.value = total;
    }
  } catch (error) {
    console.error('获取积分消费记录失败:', error);
    // 检查是否为token过期错误，如果是则不设置模拟数据
    if (error.message && (error.message.includes('Token') || error.message.includes('登录') || error.message.includes('过期'))) {
      console.log('积分消费API也检测到token过期');
      return;
    }
    // 设置模拟数据
    monthlyPointsUsed.value = 12680;
  }
});

// 处理会员等级标签切换
const handleTierChange = (tab) => {
  console.log('切换到会员等级:', tab);
};

// 选择积分套餐
const selectPackage = (index) => {
  selectedPackage.value = index;
};

// 升级会员
const upgradeMembership = (level) => {
  console.log('[会员升级] 开始升级到:', level);
  
  // 设置目标升级等级
  targetUpgradeLevel.value = level;
  
  // 打开升级模态框
  showUpgradeModal.value = true;
};

// 降级到免费版
const switchToFree = () => {
  ElMessageBox.confirm(
    '降级到普通会员将失去当前会员特权和每月赠送积分，确定要降级吗？',
    '降级确认',
    {
      confirmButtonText: '确定降级',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
  .then(() => {
    ElMessage.success('会员已降级到普通会员');
  })
  .catch(() => {
    // 用户取消
  });
};

// 购买积分
const purchasePoints = () => {
  if (selectedPackage.value === null) {
    ElMessage.warning('请先选择积分套餐');
    return;
  }
  
  const pkg = pointsPackages.value[selectedPackage.value];
  if (!pkg) {
    ElMessage.error('套餐信息异常，请重新选择');
    return;
  }
  
  console.log('[积分购买] 选中的套餐:', pkg);
  console.log('[积分购买] 用户会员状态:', isMember.value);
  console.log('[积分购买] 实际支付价格:', isMember.value ? pkg.member_price : pkg.price);
  
  // 创建一个新的套餐对象，确保普通用户不会看到会员价格
  const packageForPayment = {
    ...pkg,
    // 如果不是会员，完全移除member_price字段，确保不会被误用
    member_price: isMember.value ? pkg.member_price : undefined,
    // 确保原价字段存在
    price: pkg.price || pkg.original_price,
    original_price: pkg.price || pkg.original_price
  };
  
  // 二次验证：如果用户不是会员，确保没有会员价格
  if (!isMember.value && packageForPayment.member_price !== undefined) {
    console.warn('[积分购买] 警告：普通用户套餐包含会员价格，强制移除');
    delete packageForPayment.member_price;
  }
  
  console.log('[积分购买] 传递给支付组件的套餐:', packageForPayment);
  console.log('[积分购买] 最终验证 - 普通用户是否有会员价格:', !isMember.value && packageForPayment.member_price !== undefined);
  
  // 设置选中的套餐并打开支付模态框
  selectedPackageForPayment.value = packageForPayment;
  showPaymentModal.value = true;
};

// 显示积分详情
const showPointsDetails = () => {
  ElMessageBox.alert(
    `当前积分：${props.user.points}
    本月已消费：${monthlyPointsUsed.value}
    ${props.user.memberLevel !== 'normal' && props.user.memberLevel !== 'free' ? `下月将获得：${nextMonthPoints.value}` : ''}
    
    高级会员每月赠送：50000积分
    专业会员每月赠送：100000积分
    
    高级会员积分消费享9折优惠
    专业会员积分消费享8折优惠`,
    '积分详情',
    {
      confirmButtonText: '确定'
    }
  );
};

// 显示积分充值页面
const showPointsRecharge = () => {
  // 滚动到积分充值套餐区域
  const packageSection = document.querySelector('.points-packages');
  if (packageSection) {
    packageSection.scrollIntoView({ behavior: 'smooth' });
  }
};

// 获取专业会员价格
const getProfessionalMemberPrice = () => {
  // 优先按名称精确匹配，然后按ID匹配
  const professionalLevel = membershipLevels.value.find(level => 
    level.name === '专业会员' || level.id === 11
  );
  console.log('查找专业会员:', professionalLevel);
  return professionalLevel ? professionalLevel.price : 298;
};

// 支付成功处理
const handlePaymentSuccess = (result) => {
  console.log('[支付成功]', result);
  
  // 不显示具体充值数量，避免误导用户
  // ElMessage.success(`支付成功！已充值${points}积分`);
  
  // 刷新用户信息（在父组件中处理）
  emit('refresh-user-info');
  
  // 重置选中的套餐
  selectedPackage.value = null;
  selectedPackageForPayment.value = null;
};

// 支付取消处理
const handlePaymentCancel = () => {
  console.log('[支付取消]');
  selectedPackageForPayment.value = null;
};

// 会员升级成功处理
const handleUpgradeSuccess = (result) => {
  console.log('[会员升级成功]', result);
  
  // 不显示具体升级信息，避免误导用户
  // const packageName = result.package_info?.name || result.package?.name || '新会员等级';
  // ElMessage.success(`恭喜您成功升级到${packageName}！`);
  
  // 刷新用户信息
  emit('refresh-user-info');
  
  // 重置状态
  targetUpgradeLevel.value = 'professional';
};

// 会员信息更新处理
const handleMembershipUpdated = (membershipData) => {
  console.log('[会员信息更新]', membershipData);
  
  // 通知父组件刷新用户信息
  emit('refresh-user-info');
};

// 返回上一页
const goBack = () => {
  console.log('[会员中心] 返回首页，刷新用户信息');
  
  // 通知父组件刷新用户信息
  emit('refresh-user-info');
  
  // 延迟一下再返回，确保刷新完成
  setTimeout(() => {
    router.back();
  }, 100);
};
</script>

<style scoped>
.membership-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  margin: 0;
}

.back-button {
  margin-left: auto;
}

.membership-status {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  align-items: center;
  text-align: center;
}

.membership-level {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  align-items: center;
  text-align: center;
}

.level-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
}

.level-badge.free, .level-badge.normal {
  background-color: #f4f4f5;
  color: var(--member-free, #909399);
}

.level-badge.advanced, .level-badge.standard, .level-badge.basic {
  background-color: #ecf5ff;
  color: var(--member-basic, #2E6BE6);
}

.level-badge.professional, .level-badge.premium, .level-badge.pro {
  background-color: #f0f9eb;
  color: var(--member-pro, #67C23A);
}

.level-expire {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.expire-soon {
  color: var(--danger-color);
  margin-left: 4px;
}

.membership-points {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  color: var(--warning-color);
  font-weight: var(--font-weight-bold);
}

.info-icon {
  cursor: pointer;
  margin-left: 5px;
}

/* 积分信息卡片 */
.points-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.points-balance {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.balance-number {
  font-size: 32px;
  font-weight: var(--font-weight-bold);
  color: var(--primary-color);
}

.balance-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-top: 4px;
}

.points-details {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.points-item {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-sm);
}

.item-label {
  color: var(--text-secondary);
}

.item-value {
  font-weight: var(--font-weight-bold);
}

.item-value.highlight {
  color: var(--success-color);
}

.recharge-btn {
  margin-top: 12px;
  align-self: center;
}

/* 会员特权 */
.tier-tabs {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.tier-selector {
  align-self: center;
  margin-bottom: var(--spacing-md);
}

.tier-details {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-md) 0;
}

.tier-name {
  font-size: 18px;
  display: flex;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.tier-tag {
  margin-left: 8px;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: normal;
}

.tier-tag.free {
  background-color: #f4f4f5;
  color: var(--member-free, #909399);
}

.tier-tag.advanced {
  background-color: #ecf5ff;
  color: var(--member-basic, #2E6BE6);
}

.tier-tag.pro, .tier-tag.professional {
  background-color: #f5f0fe;
  color: var(--member-enterprise, #8A2BE2);
}

.tier-price {
  font-size: 28px;
  color: var(--primary-color);
  margin-bottom: var(--spacing-md);
}

.tier-price small {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.tier-points {
  background-color: #FFF9EC;
  border-radius: var(--border-radius-md);
  padding: 8px 16px;
  margin-bottom: var(--spacing-md);
  text-align: center;
}

.points-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.points-value {
  font-size: 18px;
  font-weight: var(--font-weight-bold);
  color: var(--warning-color);
}

.tier-features {
  list-style: none;
  padding: 0;
  margin: 0 0 var(--spacing-lg);
  width: 100%;
  max-width: 400px;
}

.tier-features li {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
  padding: var(--spacing-xs) 0;
}

.tier-action {
  width: 160px;
}

/* 积分充值套餐 */
.points-packages {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.packages-intro {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  text-align: center;
}

.member-discount-tip {
  color: var(--success-color);
  font-weight: var(--font-weight-bold);
  margin-top: 8px;
  display: inline-block;
}

.normal-user-tip {
  color: var(--warning-color);
  margin-top: 8px;
  display: inline-block;
}

.packages-list {
  display: flex;
  gap: var(--spacing-md);
  overflow-x: auto;
  padding: var(--spacing-sm) 0;
}

.package-item {
  flex: 0 0 auto;
  width: 120px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  position: relative;
  transition: all 0.3s;
}

.package-item.selected {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 1px var(--primary-color);
}

.package-points {
  font-size: 24px;
  font-weight: var(--font-weight-bold);
  color: var(--primary-color);
}

.package-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.package-price-container {
  margin-top: 8px;
  text-align: center;
}

.member-price .original-price {
  font-size: 12px;
  color: #999;
  text-decoration: line-through;
  margin-bottom: 2px;
}

.member-price .current-price {
  font-weight: var(--font-weight-bold);
  color: var(--success-color);
  font-size: 16px;
}

.member-price .discount-badge {
  background-color: var(--success-color);
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 8px;
  margin-top: 4px;
  display: inline-block;
}

.normal-price .current-price {
  font-weight: var(--font-weight-bold);
  font-size: 16px;
  color: var(--text-primary);
}

.normal-price .member-hint {
  font-size: 10px;
  color: var(--success-color);
  margin-top: 2px;
}

.normal-price .upgrade-hint {
  font-size: 9px;
  color: var(--warning-color);
  margin-top: 2px;
  font-weight: var(--font-weight-bold);
}

.package-tag {
  position: absolute;
  top: -10px;
  right: -10px;
  background-color: var(--warning-color);
  color: white;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  transform: scale(0.8);
}

.package-action {
  display: flex;
  justify-content: center;
  margin-top: var(--spacing-md);
}

/* 积分规则 */
.points-rules {
  margin: var(--spacing-md) 0;
}

.rules-list {
  padding-left: 20px;
  margin: var(--spacing-xs) 0;
}

.rules-list li {
  margin-bottom: 8px;
}



@media (min-width: 768px) {
  .membership-status {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
  
  .points-info {
    flex-direction: row;
  }
  
  .points-balance {
    flex: 0 0 30%;
  }
  
  .points-details {
    flex: 1;
    border-left: 1px solid var(--border-color);
    padding-left: var(--spacing-lg);
  }
}

@media (max-width: 768px) {
  .packages-list {
    justify-content: flex-start;
  }
}
</style> 