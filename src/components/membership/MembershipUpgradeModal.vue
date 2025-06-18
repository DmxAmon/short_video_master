<!--
 * @Version    : v1.00
 * @Author     : Amon
 * @Date       : 2025-01-02
 * @desc       : 会员升级模态框组件
-->
<template>
  <el-dialog
    v-model="visible"
    title="会员升级"
    :width="dialogWidth"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    @closed="handleClose"
    center
  >
    <!-- 当前步骤：0-扫码支付 1-升级完成 -->
    <div class="upgrade-steps">
      <el-steps :active="currentStep" simple>
        <el-step title="扫码支付" />
        <el-step title="升级完成" />
      </el-steps>
    </div>

    <!-- 步骤1: 扫码支付 -->
    <div v-if="currentStep === 0" class="step-content">
      <!-- 创建订单加载状态 -->
      <div v-if="upgradeStatus === 'pending'" class="order-loading">
        <div class="loading-container">
          <el-icon class="is-loading" size="40"><Loading /></el-icon>
          <h3>正在创建订单...</h3>
          <p class="loading-tip">请稍候，正在为您准备支付信息</p>
        </div>
      </div>
      
      <!-- 支付二维码界面 -->
      <div v-else-if="paymentData" class="qr-payment">
        <!-- 订单信息 -->
        <div class="order-summary">
          <div class="order-info">
            <span>订单号：{{ paymentData.order_no }}</span>
            <span>金额：¥{{ paymentData.amount }}</span>
          </div>
          <div class="countdown-display">
            <span class="time-left">剩余时间：{{ formatCountdown(countdown) }}</span>
          </div>
        </div>

        <!-- 二维码区域 -->
        <div class="qr-container">
          <div class="qr-code">
            <img v-if="qrCodeUrl" :src="qrCodeUrl" alt="支付二维码" />
            <div v-else class="qr-loading">
              <el-icon class="spinning"><Loading /></el-icon>
              <p>正在生成二维码...</p>
            </div>
          </div>
          <div class="qr-tips">
            <p class="main-tip">
              <img v-if="paymentData.payment_type === 'alipay'" 
                   src="/alipay-logo.svg" 
                   alt="支付宝" 
                   class="payment-icon" />
              请使用{{ paymentData.payment_type === 'alipay' ? '支付宝' : '微信' }}扫描二维码完成支付
            </p>
            <p class="sub-tip">
              请在{{ formatCountdown(countdown) }}内完成支付，超时订单将自动取消
            </p>
          </div>
        </div>

        <!-- 支付状态 -->
        <div class="payment-status">
          <div class="status-item">
            <el-icon class="spinning"><Loading /></el-icon>
            <span>正在等待支付...</span>
          </div>
          <div class="status-tips">
            <p class="tip-item">⏰ 如果支付后状态未更新，请点击"支付成功"按钮</p>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="step-actions compact-buttons">
        <!-- 
          <el-button size="small" @click="refreshPaymentStatus">刷新</el-button>
          -->
          <el-button size="small" type="success" @click="handlePaymentSuccess">支付成功</el-button>
          <el-button size="small" @click="cancelPayment">取消</el-button>
        </div>
      </div>
    </div>

    <!-- 步骤2: 升级结果 -->
    <div v-if="currentStep === 1" class="step-content">
      <div class="upgrade-result">
        <!-- 升级成功 -->
        <div v-if="upgradeStatus === 'success'" class="result-success">
          <div class="result-icon success-icon">
            <el-icon><Check /></el-icon>
          </div>
          <h3>支付成功！</h3>
          <div class="success-details">
            <p>您已支付成功，请稍等3-5分钟，发放会员权限</p>
            <p class="redirect-tip">{{ redirectCountdown }}秒后自动关闭</p>
          </div>
        </div>

        <!-- 升级失败 -->
        <div v-else class="result-failed">
          <div class="result-icon failed-icon">
            <el-icon><Close /></el-icon>
          </div>
          <h3>升级失败</h3>
          <p>{{ upgradeError || '升级过程中出现异常，请重试或联系客服' }}</p>
        </div>
      </div>

      <div class="step-actions">
        <el-button v-if="upgradeStatus === 'success'" type="primary" @click="handleClose">
          完成
        </el-button>

        <template v-else>
          <el-button @click="handleClose">关闭</el-button>
          <el-button type="primary" @click="retryUpgrade">重新下单</el-button>
        </template>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Check, Close, Loading } from '@element-plus/icons-vue';
import PaymentIcons from '../icons/PaymentIcons.vue';
import { generateQRCode, generateQRCodeUrl } from '../../utils/qrcode';
import { createMembershipUpgradeOrder, getMembershipPackages, getOrderStatus, getCurrentMembership, cancelMembershipUpgradeOrder } from '../../api/membership';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  currentMemberLevel: {
    type: String,
    default: 'normal'
  },
  memberExpireTime: {
    type: String,
    default: null
  },
  targetLevel: {
    type: String,
    default: 'professional'
  }
});

const emit = defineEmits(['update:modelValue', 'upgrade-success', 'membership-updated']);

// 响应式数据
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const currentStep = ref(0); // 0: 扫码支付, 1: 支付完成
const upgrading = ref(false);
const upgradeStatus = ref('pending'); // pending, success, failed
const upgradeError = ref('');
const redirectCountdown = ref(3);
const paymentData = ref(null); // 支付订单数据
const retryCount = ref(0); // 重试计数器
const maxRetries = 3; // 最大重试次数
const qrCodeUrl = ref(''); // 二维码URL
const countdown = ref(1800); // 30分钟倒计时

// 响应式宽度
const dialogWidth = computed(() => {
  if (typeof window !== 'undefined') {
    const width = window.innerWidth;
    if (width < 576) return '95%';
    if (width < 768) return '90%';
    if (width < 1024) return '70%';
    return '600px';
  }
  return '600px';
});

// 套餐相关
const availablePackages = ref([]);
const selectedPackage = ref(null);
const selectedPaymentMethod = ref('alipay');

// 定时器
let redirectTimer = null;

// 会员等级映射
const levelNames = {
  'normal': '普通会员',
  'free': '普通会员',
  'advanced': '高级会员',
  'standard': '高级会员',
  'professional': '专业会员',
  'premium': '专业会员',
  'pro': '专业会员'
};

// 获取当前等级名称
const getCurrentLevelName = () => {
  return levelNames[props.currentMemberLevel] || '普通会员';
};

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN');
};

// 加载会员套餐
const loadMembershipPackages = async () => {
  try {
    console.log('[会员升级] 开始加载会员套餐列表');
    const response = await getMembershipPackages();
    console.log('[会员升级] 会员套餐响应:', response);
    
    if (response.code === 0 && response.data) {
      console.log('[会员升级] 后端返回的原始套餐数据:', response.data);
      
      // 过滤出比当前等级高的套餐，并确保数据格式正确
      availablePackages.value = response.data.filter(pkg => {
        return pkg.level_code !== props.currentMemberLevel && pkg.status === 1;
      }).map(pkg => {
        console.log('[会员升级] 处理套餐数据:', {
          原始数据: pkg,
          duration_months: pkg.duration_months,
          duration_days: pkg.duration_days,
          计算后的天数: pkg.duration_months ? pkg.duration_months * 30 : (pkg.duration_days || 365)
        });
        
        return {
          id: pkg.id,
          name: pkg.level_name || pkg.name,
          level_code: pkg.level_code,
          description: pkg.description,
          price: pkg.price,
          // 优先使用 duration_days，如果没有则使用 duration_months 计算，最后默认365天
          duration_days: pkg.duration_days || (pkg.duration_months ? pkg.duration_months * 30 : 365),
          popular: pkg.level_code === 'professional',
          features: [
            '专业会员功能',
            '优先客服支持',
            '特殊权限'
          ],
          discount: pkg.price > 0 ? '限时优惠' : ''
        };
      });
      
      console.log('[会员升级] 处理后的套餐列表:', availablePackages.value);
      
      // 自动选择目标等级的套餐
      if (props.targetLevel) {
        const targetPackage = availablePackages.value.find(pkg => 
          pkg.level_code === props.targetLevel
        );
        if (targetPackage) {
          selectedPackage.value = targetPackage;
          console.log('[会员升级] 自动选择目标套餐:', targetPackage);
        }
      }
      
      // 如果没有套餐或自动选择失败，选择第一个套餐
      if (!selectedPackage.value && availablePackages.value.length > 0) {
        selectedPackage.value = availablePackages.value[0];
        console.log('[会员升级] 默认选择第一个套餐:', selectedPackage.value);
      }
    } else {
      throw new Error(response.message || '获取套餐列表失败');
    }
  } catch (error) {
    console.error('[会员升级] 加载会员套餐失败:', error);
    ElMessage.warning('套餐数据加载失败，使用默认套餐');
    
    // 使用默认套餐数据 - 修改为年度会员
    availablePackages.value = [
      {
        id: 2,
        name: '专业会员',
        level_code: 'professional',
        description: '专业版功能',
        price: 2,
        duration_days: 365, // 修改为365天（1年）
        popular: true,
        features: [
          '专业会员功能',
          '优先客服支持',
          '特殊权限'
        ],
        discount: '限时优惠'
      }
    ];
    
    if (props.targetLevel === 'professional') {
      selectedPackage.value = availablePackages.value[0];
    }
  }
};

// 选择套餐
const selectPackage = (pkg) => {
  selectedPackage.value = pkg;
};

// 下一步
const nextStep = () => {
  if (currentStep.value < 2) {
    currentStep.value++;
  }
};

// 上一步
const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
};

// 确认升级
const confirmUpgrade = async () => {
  if (!selectedPackage.value) {
    ElMessage.error('请选择升级套餐');
    return;
  }

  upgrading.value = true;
  try {
    console.log('[会员升级] 创建升级订单:', {
      level_id: selectedPackage.value.id,
      payment_method: selectedPaymentMethod.value
    });

    // 按照后端API要求，只传递 level_id 和 payment_method
    const response = await createMembershipUpgradeOrder({
      level_id: selectedPackage.value.id,  // 必需：会员等级ID
      payment_method: selectedPaymentMethod.value  // 必需：支付方式
    });

    console.log('[会员升级] 升级订单响应:', response);

    if (response.code === 0 && response.data) {
      // 订单创建成功，重置重试计数器
      retryCount.value = 0;
      console.log('[会员升级] 完整响应数据:', JSON.stringify(response.data, null, 2));
      console.log('[会员升级] 完整响应对象:', response.data);
      console.log('[会员升级] 响应数据类型:', typeof response.data);
      console.log('[会员升级] 响应数据键:', Object.keys(response.data));
      
      // 尝试多种可能的数据结构
      let finalPaymentUrl = null;
      let finalOrderNo = null;
      
      // 方式1: 直接在data中查找各种可能的字段名
      const possibleUrlFields = ['jump_url', 'qr_code', 'payurl', 'payment_url', 'pay_url', 'qrcode', 'url'];
      for (const field of possibleUrlFields) {
        if (response.data[field]) {
          finalPaymentUrl = response.data[field];
          console.log(`[会员升级] 找到支付链接字段: ${field} = ${finalPaymentUrl}`);
          break;
        }
      }
      
      // 方式2: 在嵌套对象中查找
      const nestedObjects = ['paymentResponse', 'payment_response', 'paymentData', 'payment_data'];
      if (!finalPaymentUrl) {
        for (const objField of nestedObjects) {
          if (response.data[objField]) {
            for (const urlField of possibleUrlFields) {
              if (response.data[objField][urlField]) {
                finalPaymentUrl = response.data[objField][urlField];
                console.log(`[会员升级] 在嵌套对象中找到支付链接: ${objField}.${urlField} = ${finalPaymentUrl}`);
                break;
              }
            }
            if (finalPaymentUrl) break;
          }
        }
      }
      
      // 获取订单号 - 尝试多种可能的字段名
      const possibleOrderFields = ['order_no', 'orderNo', 'order_id', 'orderId', 'trade_no', 'tradeNo', 'id'];
      for (const field of possibleOrderFields) {
        if (response.data[field]) {
          finalOrderNo = response.data[field];
          console.log(`[会员升级] 找到订单号字段: ${field} = ${finalOrderNo}`);
          break;
        }
      }
      
      // 在嵌套对象中查找订单号
      if (!finalOrderNo) {
        for (const objField of nestedObjects) {
          if (response.data[objField]) {
            for (const orderField of possibleOrderFields) {
              if (response.data[objField][orderField]) {
                finalOrderNo = response.data[objField][orderField];
                console.log(`[会员升级] 在嵌套对象中找到订单号: ${objField}.${orderField} = ${finalOrderNo}`);
                break;
              }
            }
            if (finalOrderNo) break;
          }
        }
      }
      
      console.log('[会员升级] 最终支付链接:', finalPaymentUrl);
      console.log('[会员升级] 最终订单号:', finalOrderNo);
      
      if (finalPaymentUrl) {
        // 需要用户支付，显示二维码
        console.log('[会员升级] 生成支付二维码:', finalPaymentUrl);
        
        ElMessage.success('订单创建成功，请扫码支付');
        
        // 保存支付数据
        paymentData.value = {
          ...response.data,
          order_id: finalOrderNo, // 确保订单ID字段存在
          order_no: finalOrderNo, // 兼容不同的字段名
          payment_url: finalPaymentUrl, // 统一字段名
          payment_type: selectedPaymentMethod.value,
          amount: response.data.amount || '0.01' // 确保有金额字段
        };
        
        console.log('[会员升级] 保存的支付数据:', paymentData.value);
        
        // 设置为等待支付状态
        upgradeStatus.value = 'waiting_payment';
        
        // 保持在当前步骤（扫码支付）
        currentStep.value = 0;
        
        // 生成二维码
        await generateQRCodeImage(finalPaymentUrl);
        
        // 开始倒计时
        startCountdown();
        
        // 开始轮询支付状态
        if (finalOrderNo) {
          startPaymentStatusPolling(finalOrderNo);
        } else {
          console.warn('[会员升级] 未找到订单号，无法开始轮询');
        }
        
      } else {
        // 没有支付链接，可能是数据结构问题
        console.log('[会员升级] 没有支付链接，检查数据结构');
        console.log('[会员升级] 可能的支付相关字段:', {
          payment_url: response.data.payment_url,
          payurl: response.data.payurl,
          qr_code: response.data.qr_code,
          pay_url: response.data.pay_url
        });
        
        // 遍历所有属性查找可能包含URL的字段
        console.log('[会员升级] 遍历所有字段查找URL:');
        for (const [key, value] of Object.entries(response.data)) {
          if (typeof value === 'string' && (
            value.includes('http') || 
            value.includes('pay') || 
            value.includes('qr') ||
            value.includes('api.kuaixiaopu.com')
          )) {
            console.log(`[会员升级] 可能的URL字段: ${key} = ${value}`);
          }
        }
        
        upgradeStatus.value = 'failed';
        upgradeError.value = '支付信息获取失败，请重新尝试';
        currentStep.value = 1;
        
        // 友好的重试提示
        ElMessage.error('支付信息获取失败，请点击"重新下单"重试');
      }
    } else {
      upgradeStatus.value = 'failed';
      upgradeError.value = '订单创建失败，请重新尝试';
      currentStep.value = 1;
      
      // 友好的错误提示
      ElMessage.error('订单创建失败，请点击"重新下单"重试');
    }
  } catch (error) {
    console.error('[会员升级] 升级失败:', error);
    
    // 检查是否是网络错误或超时错误
    const isNetworkError = error.code === 'ECONNABORTED' || 
                          error.message?.includes('timeout') || 
                          error.message?.includes('Network Error') ||
                          error.name === 'AxiosError';
    
    if (isNetworkError && retryCount.value < maxRetries) {
      retryCount.value++;
      console.log(`[会员升级] 检测到网络错误，准备自动重试... (第${retryCount.value}/${maxRetries}次)`);
      
      // 延迟2秒后自动重试，给用户看到加载状态
      setTimeout(async () => {
        console.log(`[会员升级] 开始自动重试... (第${retryCount.value}/${maxRetries}次)`);
        await confirmUpgrade(); // 递归调用自己进行重试
      }, 2000);
      
      // 不设置失败状态，保持加载状态
      return;
    } else if (isNetworkError && retryCount.value >= maxRetries) {
      // 超过最大重试次数
      console.log(`[会员升级] 已达到最大重试次数(${maxRetries})，停止重试`);
      upgradeStatus.value = 'failed';
      upgradeError.value = '网络连接不稳定，请稍后重试';
      currentStep.value = 1;
      ElMessage.error('网络连接不稳定，请稍后重试');
      retryCount.value = 0; // 重置重试计数器
    } else {
      // 非网络错误，显示错误信息
      upgradeStatus.value = 'failed';
      upgradeError.value = '订单创建失败，请重新尝试';
      currentStep.value = 1;
      
      // 友好的错误提示
      ElMessage.error('订单创建失败，请点击"重新下单"重试');
    }
  } finally {
    // 只有在非网络错误时才停止加载状态
    if (upgradeStatus.value === 'failed') {
      upgrading.value = false;
    }
  }
};

// 支付状态轮询
let statusPollingTimer = null;
let countdownTimer = null;
let pollCount = 0;
const maxPollCount = 180; // 最多轮询15分钟（180次 * 5秒）- 考虑支付通知延迟

const startPaymentStatusPolling = (orderNo) => {
  console.log('[会员升级] 开始轮询支付状态:', orderNo);
  
  // 清除之前的轮询
  if (statusPollingTimer) {
    clearInterval(statusPollingTimer);
    statusPollingTimer = null;
  }
  
  // 重置轮询计数
  pollCount = 0;
  
  // 立即检查一次状态
  checkPaymentStatus(orderNo);
  
  // 每5秒检查一次支付状态（按照文档建议的3-5秒频率）
  statusPollingTimer = setInterval(async () => {
    pollCount++;
    const remainingTime = Math.floor((maxPollCount - pollCount) * 5 / 60); // 剩余分钟数
    console.log(`[会员升级] 轮询第${pollCount}次，剩余${remainingTime}分钟 (${pollCount}/${maxPollCount})`);
    
    // 检查是否超过最大轮询次数
    if (pollCount >= maxPollCount) {
      console.log('[会员升级] 轮询超时，停止轮询');
      clearInterval(statusPollingTimer);
      statusPollingTimer = null;
      
      if (upgradeStatus.value === 'waiting_payment') {
        upgradeStatus.value = 'failed';
        upgradeError.value = '支付检查超时，请手动刷新页面或重新发起支付';
        currentStep.value = 1;
        ElMessage.warning('支付检查超时，请手动刷新页面确认支付状态');
      }
      return;
    }
    
    // 检查支付状态
    await checkPaymentStatus(orderNo);
    
    // 如果状态已经不是等待支付，停止轮询
    if (upgradeStatus.value !== 'waiting_payment') {
      console.log(`[会员升级] 支付状态已变更为: ${upgradeStatus.value}，停止轮询`);
      clearInterval(statusPollingTimer);
      statusPollingTimer = null;
    }
  }, 5000);
};

// 检查支付状态
const checkPaymentStatus = async (orderId) => {
  try {
    const response = await getOrderStatus(orderId);
    console.log('[会员升级] 订单状态检查:', response);
    
    if (response.code === 0 && response.data) {
      const orderData = response.data;
      const { payment_status, upgrade_status, amount_paid, start_date, end_date, level_name } = orderData;
      
      console.log('[会员升级] 当前状态:', {
        payment_status,
        upgrade_status,
        amount_paid,
        start_date,
        end_date
      });
      
      // ✅ 关键判断：同时检查支付状态和升级状态（按照文档要求）
      if (payment_status === 'paid' && upgrade_status === 'success') {
        console.log('[会员升级] 支付完成，升级成功！');
        console.log(`会员等级: ${level_name}`);
        console.log(`有效期: ${start_date} 至 ${end_date}`);
        console.log(`支付金额: ${amount_paid}`);
        
        // 停止轮询
        if (statusPollingTimer) {
          clearInterval(statusPollingTimer);
          statusPollingTimer = null;
        }
        
        // 更新状态
        upgradeStatus.value = 'success';
        currentStep.value = 1;
        ElMessage.success('支付成功，会员升级完成！');
        
        // 停止倒计时
        if (countdownTimer) {
          clearInterval(countdownTimer);
          countdownTimer = null;
        }
        
        // 开始重定向倒计时
        startRedirectCountdown();
        
        // 刷新会员信息
        await refreshMembershipInfo();
        
        // 通知父组件升级成功
        emit('upgrade-success', {
          package: selectedPackage.value,
          newLevel: selectedPackage.value.level_code || selectedPackage.value.level_name,
          orderData: orderData,
          membershipInfo: {
            levelName: level_name,
            startDate: start_date,
            endDate: end_date,
            amountPaid: amount_paid
          }
        });
        
      } else if (payment_status === 'failed' || upgrade_status === 'failed') {
        console.log('[会员升级] 支付或升级失败');
        
        // 停止轮询
        if (statusPollingTimer) {
          clearInterval(statusPollingTimer);
          statusPollingTimer = null;
        }
        
        upgradeStatus.value = 'failed';
        upgradeError.value = payment_status === 'failed' ? '支付失败，请重新发起支付' : '会员升级失败，请联系客服';
        currentStep.value = 1;
        
        ElMessage.error(upgradeError.value);
        
      } else if (payment_status === 'cancelled' || payment_status === 'expired') {
        console.log('[会员升级] 支付已取消或过期');
        
        // 停止轮询
        if (statusPollingTimer) {
          clearInterval(statusPollingTimer);
          statusPollingTimer = null;
        }
        
        upgradeStatus.value = 'failed';
        upgradeError.value = payment_status === 'cancelled' ? '支付已取消' : '支付已过期，请重新发起支付';
        currentStep.value = 1;
        
        ElMessage.warning(upgradeError.value);
        
      } else {
        // ⏳ 仍在处理中（pending状态），继续轮询
        console.log('[会员升级] 支付处理中...', {
          payment_status,
          upgrade_status
        });
      }
    }
  } catch (error) {
    console.error('[会员升级] 检查订单状态失败:', error);
    // 网络错误时不停止轮询，继续尝试
  }
};

// 刷新会员信息
const refreshMembershipInfo = async () => {
  try {
    const response = await getCurrentMembership();
    console.log('[会员升级] 当前会员信息:', response);
    // 这里可以通知父组件更新会员信息
    if (response.code === 0) {
      emit('membership-updated', response.data);
    }
  } catch (error) {
    console.error('[会员升级] 获取会员信息失败:', error);
  }
};

// 生成二维码
const generateQRCodeImage = async (paymentUrl) => {
  try {
    console.log('[会员升级] 开始生成二维码:', paymentUrl);
    
    // 使用支付链接生成二维码（与积分充值不同，这里直接用链接生成二维码）
    const qrDataUrl = await generateQRCode(paymentUrl, {
      width: 200,
      height: 200
    });
    
    qrCodeUrl.value = qrDataUrl;
    console.log('[会员升级] 二维码生成成功');
  } catch (error) {
    console.error('[会员升级] 二维码生成失败:', error);
    
    // 使用备用方式
    try {
      qrCodeUrl.value = generateQRCodeUrl(paymentUrl, {
        width: 200,
        height: 200
      });
      console.log('[会员升级] 使用备用方式生成二维码成功');
    } catch (backupError) {
      console.error('[会员升级] 备用二维码生成也失败:', backupError);
      ElMessage.error('二维码生成失败，请重试');
    }
  }
};

// 开始倒计时
const startCountdown = () => {
  countdown.value = 1800; // 30分钟
  
  if (countdownTimer) {
    clearInterval(countdownTimer);
  }
  
  countdownTimer = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      clearInterval(countdownTimer);
      countdownTimer = null;
      
      // 支付超时
      if (statusPollingTimer) {
        clearInterval(statusPollingTimer);
        statusPollingTimer = null;
      }
      
      upgradeStatus.value = 'failed';
      upgradeError.value = '支付超时，请重新发起支付';
      currentStep.value = 1;
    }
  }, 1000);
};

// 格式化倒计时显示
const formatCountdown = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// 刷新支付状态
const refreshPaymentStatus = async () => {
  if (paymentData.value?.order_id || paymentData.value?.order_no) {
    const orderId = paymentData.value.order_id || paymentData.value.order_no;
    console.log('[会员升级] 手动刷新支付状态:', orderId);
    
    ElMessage.info('正在检查支付状态...');
    await checkPaymentStatus(orderId);
    
    // 如果状态仍然是等待支付，给用户一些提示
    if (upgradeStatus.value === 'waiting_payment') {
      ElMessage.warning('支付状态仍在处理中，请稍后再试或联系客服');
    }
  } else {
    ElMessage.error('订单信息丢失，请重新发起支付');
  }
};

// 取消支付
const cancelPayment = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要取消支付吗？取消后将停止支付状态检查并通知后端取消订单。',
      '取消支付',
      {
        confirmButtonText: '确定取消',
        cancelButtonText: '继续支付',
        type: 'warning'
      }
    );
    
    console.log('[会员升级] 用户确认取消支付，停止所有轮询并取消订单');
    
    // 立即停止轮询和倒计时
    if (statusPollingTimer) {
      clearInterval(statusPollingTimer);
      statusPollingTimer = null;
      console.log('[会员升级] 已停止支付状态轮询');
    }
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
      console.log('[会员升级] 已停止倒计时');
    }
    
    // 调用后端取消订单API
    if (paymentData.value?.order_id) {
      try {
        console.log('[会员升级] 调用后端取消订单API:', paymentData.value.order_id);
        await cancelMembershipUpgradeOrder(paymentData.value.order_id, '用户主动取消支付');
        console.log('[会员升级] 后端订单取消成功');
      } catch (apiError) {
        console.error('[会员升级] 后端订单取消失败:', apiError);
        // 即使后端取消失败，前端也要停止轮询
      }
    }
    
    upgradeStatus.value = 'failed';
    upgradeError.value = '支付已取消';
    currentStep.value = 1;
    
    ElMessage.info('支付已取消');
    
  } catch (error) {
    console.log('[会员升级] 用户选择继续支付');
  }
};

// 返回上一步（现在相当于重新开始）
const goBack = () => {
  // 停止轮询和倒计时
  if (statusPollingTimer) {
    clearInterval(statusPollingTimer);
    statusPollingTimer = null;
  }
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
  
  // 重新初始化
  initializeUpgrade();
};

// 重试升级
const retryUpgrade = () => {
  // 清除轮询
  if (statusPollingTimer) {
    clearInterval(statusPollingTimer);
    statusPollingTimer = null;
  }
  
  // 重新初始化
  initializeUpgrade();
};

// 开始重定向倒计时
const startRedirectCountdown = () => {
  if (redirectTimer) {
    clearInterval(redirectTimer);
  }

  redirectTimer = setInterval(() => {
    redirectCountdown.value--;
    if (redirectCountdown.value <= 0) {
      clearInterval(redirectTimer);
      handleClose();
    }
  }, 1000);
};

// 关闭模态框
const handleClose = () => {
  console.log('[会员升级] 关闭模态框，清理所有定时器');
  
  // 清理定时器
  if (redirectTimer) {
    clearInterval(redirectTimer);
    redirectTimer = null;
    console.log('[会员升级] 已清理重定向定时器');
  }
  
  // 清理轮询定时器
  if (statusPollingTimer) {
    clearInterval(statusPollingTimer);
    statusPollingTimer = null;
    console.log('[会员升级] 已清理支付状态轮询定时器');
  }
  
  // 清理倒计时定时器
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
    console.log('[会员升级] 已清理倒计时定时器');
  }
  
  // 重置状态
  currentStep.value = 0;
  upgradeStatus.value = 'pending';
  upgradeError.value = '';
  redirectCountdown.value = 3;
  selectedPackage.value = null;
  paymentData.value = null;
  qrCodeUrl.value = '';
  countdown.value = 1800;
  retryCount.value = 0; // 重置重试计数器
  
  // 通知父组件关闭模态框
  emit('update:modelValue', false);
};

// 处理用户手动确认支付成功
const handlePaymentSuccess = () => {
  console.log('[会员升级] 用户手动确认支付成功', {
    order_id: paymentData.value?.order_id,
    package_id: selectedPackage.value?.id,
    package_name: selectedPackage.value?.name,
    amount: selectedPackage.value?.price
  });
  
  // 清理所有定时器
  if (statusPollingTimer) {
    clearInterval(statusPollingTimer);
    statusPollingTimer = null;
  }
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
  
  // 显示友好提示
  ElMessage.success('支付确认成功！会员权益将在3-5分钟内到账，请耐心等待');
  
  // 通知父组件升级成功
  emit('upgrade-success', {
    order_id: paymentData.value?.order_id,
    package_info: selectedPackage.value,
    manual_confirm: true // 标记为手动确认
  });
  
  // 通知会员状态更新
  emit('membership-updated');
  
  // 关闭对话框
  handleClose();
};

// 监听模态框打开
watch(visible, (newVal) => {
  if (newVal) {
    initializeUpgrade();
  }
});

// 初始化升级流程
const initializeUpgrade = async () => {
  // 重置状态
  currentStep.value = 0;
  upgradeStatus.value = 'pending'; // 初始状态为pending，显示加载
  upgradeError.value = '';
  redirectCountdown.value = 3;
  
  // 加载套餐数据
  await loadMembershipPackages();
  
  // 如果已经自动选择了套餐，直接创建订单并显示二维码
  if (selectedPackage.value) {
    console.log('[会员升级] 已选择套餐，开始创建订单:', selectedPackage.value);
    await confirmUpgrade();
  }
};

// 组件卸载时清理定时器
onUnmounted(() => {
  console.log('[会员升级] 组件卸载，清理所有定时器');
  
  if (redirectTimer) {
    clearInterval(redirectTimer);
    redirectTimer = null;
  }
  if (statusPollingTimer) {
    clearInterval(statusPollingTimer);
    statusPollingTimer = null;
  }
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
  
  // 如果有未完成的订单，尝试取消
  if (paymentData.value?.order_id && upgradeStatus.value === 'waiting_payment') {
    console.log('[会员升级] 组件卸载时发现未完成订单，尝试取消:', paymentData.value.order_id);
    cancelMembershipUpgradeOrder(paymentData.value.order_id, '页面关闭自动取消')
      .then(() => {
        console.log('[会员升级] 组件卸载时订单取消成功');
      })
      .catch((error) => {
        console.error('[会员升级] 组件卸载时订单取消失败:', error);
      });
  }
});
</script>

<style scoped>
.upgrade-steps {
  margin-bottom: 30px;
}

.step-content {
  min-height: 300px;
}

.order-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}

.loading-container {
  text-align: center;
  padding: 40px 20px;
}

.loading-container .el-icon {
  color: #409eff;
  margin-bottom: 20px;
}

.loading-container h3 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 18px;
  font-weight: 500;
}

.loading-tip {
  color: #666;
  font-size: 14px;
  margin: 0;
  line-height: 1.5;
}

.current-membership {
  margin-bottom: 30px;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
}

.current-membership h4 {
  margin: 0 0 15px 0;
  color: #333;
}

.current-level {
  display: flex;
  align-items: center;
  gap: 15px;
}

.level-badge {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 14px;
  font-weight: bold;
}

.level-badge.normal,
.level-badge.free {
  background-color: #f4f4f5;
  color: #909399;
}

.level-badge.advanced,
.level-badge.standard {
  background-color: #ecf5ff;
  color: #409eff;
}

.level-badge.professional,
.level-badge.premium,
.level-badge.pro {
  background-color: #f0f9eb;
  color: #67c23a;
}

.expire-time {
  color: #666;
  font-size: 14px;
}

.upgrade-packages h4 {
  margin: 0 0 20px 0;
  color: #333;
}

.packages-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.package-item {
  border: 2px solid #e4e7ed;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s;
}

.package-item:hover {
  border-color: #c6e2ff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.package-item.selected {
  border-color: #409eff;
  background-color: #f0f9ff;
}

.package-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.package-name {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.popular-tag {
  background: linear-gradient(135deg, #ff6b6b, #ffa500);
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.package-price {
  margin-bottom: 20px;
}

.price {
  font-size: 28px;
  font-weight: bold;
  color: #e6a23c;
}

.duration {
  color: #666;
  margin-left: 5px;
}

.package-features ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.package-features li {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  color: #666;
}

.package-discount {
  margin-top: 15px;
  text-align: center;
}

.discount-text {
  background: #fff2e8;
  color: #e6a23c;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
}

.payment-summary {
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 30px;
}

.payment-summary h4 {
  margin: 0 0 20px 0;
  color: #333;
}

.order-details {
  margin-bottom: 25px;
}

.order-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.order-item .label {
  color: #666;
}

.order-item .value {
  font-weight: 500;
}

.order-item .price {
  color: #e6a23c;
  font-size: 18px;
  font-weight: bold;
}

.payment-methods h5 {
  margin: 0 0 15px 0;
  color: #333;
}

.payment-option {
  display: block;
  margin-bottom: 15px;
}

.payment-method {
  display: flex;
  align-items: center;
  gap: 10px;
}

.payment-method-single {
  text-align: center;
}

.payment-method.selected {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 15px;
  border: 2px solid #67C23A;
  border-radius: 8px;
  background-color: #f0f9eb;
  margin-bottom: 10px;
}

.check-icon {
  margin-left: auto;
}

.payment-note {
  color: #909399;
  font-size: 12px;
  margin: 0;
}

.upgrade-result {
  text-align: center;
  padding: 20px;
}

.result-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  font-size: 40px;
}

.success-icon {
  background-color: #f0f9eb;
  color: #67c23a;
}

.failed-icon {
  background-color: #fef0f0;
  color: #f56c6c;
}

.waiting-icon {
  background-color: #f0f9ff;
  color: #409eff;
}

.result-success h3 {
  color: #67c23a;
  margin-bottom: 15px;
}

.result-failed h3 {
  color: #f56c6c;
  margin-bottom: 15px;
}

.result-waiting h3 {
  color: #409eff;
  margin-bottom: 15px;
}

.success-details p,
.waiting-details p {
  margin: 8px 0;
  color: #666;
}

.payment-tip {
  color: #409eff;
  font-weight: bold;
  margin-top: 15px !important;
}

.redirect-tip {
  color: #409eff;
  font-weight: bold;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 二维码支付样式 */
.qr-payment {
  text-align: center;
}

.order-summary {
  background: #f5f7fa;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.order-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 14px;
}

.countdown-display {
  text-align: center;
}

.time-left {
  color: #e6a23c;
  font-weight: bold;
  font-size: 16px;
}

.qr-container {
  background: white;
  padding: 30px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.qr-code {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  min-height: 200px;
}

.qr-code img {
  display: block;
  max-width: 200px;
  max-height: 200px;
  border: 1px solid #eee;
  border-radius: 4px;
}

.qr-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: #666;
}

.qr-loading p {
  margin: 0;
  font-size: 14px;
}

.qr-tips {
  color: #666;
}

.main-tip {
  font-size: 16px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.main-tip .payment-icon {
  width: 16px;
  height: 16px;
  vertical-align: middle;
}

.sub-tip {
  font-size: 14px;
  color: #909399;
}

.payment-status {
  margin-bottom: 20px;
}

.status-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #409eff;
}

.step-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.step-actions.compact-buttons {
  gap: 10px;
  margin-top: 20px;
  padding-top: 15px;
}

.step-actions.compact-buttons .el-button {
  min-width: auto;
  padding: 8px 16px;
}

/* 响应式样式 */
@media (max-width: 768px) {
  .step-content {
    min-height: auto;
    padding: 10px;
  }
  
  .upgrade-steps {
    margin-bottom: 20px;
  }
  
  .payment-summary {
    padding: 15px;
    margin-bottom: 20px;
  }
  
  .order-item {
    flex-direction: column;
    gap: 5px;
    margin-bottom: 15px;
  }
  
  .order-item .label {
    color: #909399;
    font-size: 14px;
  }
  
  .order-item .value {
    font-size: 16px;
  }
  
  .payment-method.selected {
    padding: 12px;
    flex-direction: column;
    gap: 8px;
  }
  
  .step-actions {
    flex-direction: column;
    gap: 10px;
    margin-top: 20px;
  }
  
  .step-actions .el-button {
    width: 100%;
  }
  
  .step-actions.compact-buttons {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    margin-top: 15px;
    padding-top: 10px;
  }
  
  .step-actions.compact-buttons .el-button {
    width: auto;
    flex: 0 0 auto;
    min-width: 70px;
    max-width: 90px;
    padding: 6px 10px;
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .qr-container {
    padding: 20px 15px;
    margin-bottom: 15px;
  }
  
  .qr-code {
    min-height: 160px;
  }
  
  .qr-code img {
    max-width: 160px;
    max-height: 160px;
  }
  
  .main-tip {
    font-size: 14px;
  }
  
  .main-tip .payment-icon {
    width: 14px;
    height: 14px;
  }
  
  .sub-tip {
    font-size: 12px;
  }
  
  .order-summary {
    padding: 12px;
    margin-bottom: 15px;
  }
  
  .order-info {
    flex-direction: column;
    gap: 8px;
    font-size: 13px;
  }
  
  .time-left {
    font-size: 14px;
  }
  
  .upgrade-result {
    padding: 15px;
  }
  
  .result-icon {
    width: 60px;
    height: 60px;
    font-size: 30px;
    margin-bottom: 15px;
  }
}

@media (max-width: 480px) {
  .payment-summary h4 {
    font-size: 16px;
    margin-bottom: 15px;
  }
  
  .order-item .value.price {
    font-size: 20px;
  }
  
  .payment-method.selected {
    padding: 10px;
  }
  
  .qr-container {
    padding: 15px 10px;
  }
  
  .qr-code {
    min-height: 140px;
  }
  
  .qr-code img {
    max-width: 140px;
    max-height: 140px;
  }
  
  .main-tip {
    font-size: 13px;
  }
  
  .main-tip .payment-icon {
    width: 13px;
    height: 13px;
  }
  
  .sub-tip {
    font-size: 11px;
  }
  
  .success-details p,
  .waiting-details p,
  .result-failed p {
    font-size: 14px;
  }
  
  .step-actions.compact-buttons {
    gap: 6px;
    margin-top: 12px;
    padding-top: 8px;
  }
  
  .step-actions.compact-buttons .el-button {
    min-width: 60px;
    max-width: 75px;
    padding: 5px 8px;
    font-size: 11px;
  }
}
</style> 