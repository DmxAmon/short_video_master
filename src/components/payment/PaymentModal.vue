<!--
 * @Version    : v1.00
 * @Author     : Amon
 * @Date       : 2024-01-20
 * @desc       : 支付模态框组件，处理积分充值支付流程
-->
<template>
  <el-dialog
    v-model="visible"
    title="积分充值"
    :width="dialogWidth"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :before-close="handleClose"
    center
  >
    <!-- 步骤指示器 - 自定义设计 -->
    <div class="custom-steps">
      <div class="step-item" :class="{ active: currentStep >= 0 }">
        <div class="step-circle">1</div>
        <div class="step-title">扫码支付</div>
      </div>
      <div class="step-arrow">
        <svg width="24" height="16" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 1L23 8L16 15M23 8H1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="step-item" :class="{ active: currentStep >= 1 }">
        <div class="step-circle">2</div>
        <div class="step-title">支付完成</div>
      </div>
    </div>

    <!-- 步骤1: 扫码支付 -->
    <div v-if="currentStep === 0" class="step-content">
      <!-- 创建订单加载状态 -->
      <div v-if="loading" class="order-loading">
        <div class="loading-container">
          <!-- 套餐信息 - 简化版 -->
          <div class="package-info-loading">
            <h3>{{ selectedPackage?.name || '积分套餐' }}</h3>
            <div class="package-details">
              <span class="points">{{ selectedPackage?.points || 0 }} 积分</span>
              <span class="amount">¥{{ getActualPrice() }}</span>
              <span v-if="isMember && hasDiscount()" class="discount-tag">会员6.9折</span>
            </div>
          </div>
          
          <el-icon class="is-loading" size="40"><Loading /></el-icon>
          <h3>正在创建订单...</h3>
          <p class="loading-tip">请稍候，正在为您准备支付信息</p>
        </div>
      </div>
      
      <!-- 支付二维码界面 -->
      <div v-else-if="paymentData" class="qr-payment">
        <!-- 订单信息 - 紧凑版 -->
        <div class="order-summary-compact">
          <div class="order-info-compact">
            <div class="order-detail">
              <span class="order-label">订单：</span>
              <span class="order-value">{{ paymentData.order_no.slice(-8) }}</span>
            </div>
            <div class="order-detail">
              <span class="order-label">金额：</span>
              <span class="order-value amount-highlight">¥{{ paymentData.amount }}</span>
            </div>
            <div class="order-detail">
              <span class="order-label">剩余：</span>
              <span class="order-value time-highlight">{{ formatCountdown(countdown) }}</span>
            </div>
          </div>
        </div>

        <!-- 二维码区域 - 紧凑版 -->
        <div class="qr-container-compact">
          <div class="qr-code-compact">
            <img v-if="qrCodeUrl" :src="qrCodeUrl" alt="支付二维码" />
            <div v-else class="qr-loading">
              <el-icon class="spinning"><Loading /></el-icon>
              <p>生成中...</p>
            </div>
          </div>
          <div class="qr-tips-compact">
            <p class="main-tip">
              <img v-if="paymentData.payment_type === 'alipay'" 
                   src="/alipay-logo.svg" 
                   alt="支付宝" 
                   class="payment-icon" />
              使用{{ paymentData.payment_type === 'alipay' ? '支付宝' : '微信' }}扫码支付
            </p>
          </div>
        </div>

        <!-- 支付状态 -->
        <div class="payment-status-compact">
          <el-icon class="spinning"><Loading /></el-icon>
          <span>等待支付中...</span>
        </div>

        <!-- 操作按钮 -->
        <div class="step-actions-compact">
        <!--
          <el-button size="small" @click="refreshPaymentStatus">刷新</el-button>
           -->
          <el-button size="small" type="success" @click="handlePaymentSuccess">支付成功</el-button>
          <el-button size="small" @click="cancelPayment">取消</el-button>
        </div>
      </div>
    </div>

    <!-- 步骤2: 支付结果 -->
    <div v-if="currentStep === 1" class="step-content">
      <div class="payment-result">
        <!-- 支付成功 -->
        <div v-if="paymentStatus === 'success'" class="result-success">
          <div class="result-icon success-icon">
            <el-icon><Check /></el-icon>
          </div>
          <h3>支付成功！</h3>
          <div class="success-details">
            <p>您的支付已成功，权益将在3-5分钟内到账</p>
            <p class="redirect-tip">{{ redirectCountdown }}秒后自动关闭</p>
          </div>
        </div>

        <!-- 支付失败 -->
        <div v-else class="result-failed">
          <div class="result-icon failed-icon">
            <el-icon><Close /></el-icon>
          </div>
          <h3>{{ getFailedTitle() }}</h3>
          <p>{{ getFailedMessage() }}</p>
        </div>

        <!-- 操作按钮 -->
        <div class="step-actions">
          <el-button v-if="paymentStatus === 'success'" type="primary" @click="handleClose">
            完成
          </el-button>
          <template v-else>
            <el-button @click="handleClose">关闭</el-button>
            <el-button type="primary" @click="retryPayment">重试支付</el-button>
          </template>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Check, Close, Loading } from '@element-plus/icons-vue';
import { generateQRCode, generateQRCodeUrl } from '../../utils/qrcode';
import PaymentIcons from '../icons/PaymentIcons.vue';
import { getPaymentMethods, createPaymentOrder, getPaymentStatus, cancelPaymentOrder } from '../../api/payment';
import { createLogger } from '../../utils/logger';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  // 选中的积分套餐
  package: {
    type: Object,
    required: true
  },
  // 用户是否为会员
  isMember: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'payment-success', 'payment-cancel']);

// 创建日志记录器
const logger = createLogger('支付模态框');

// 响应式数据
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const selectedPackage = computed(() => props.package);
const isMember = computed(() => props.isMember);

// 响应式宽度
const dialogWidth = computed(() => {
  if (typeof window !== 'undefined') {
    const width = window.innerWidth;
    if (width < 576) return '95%';
    if (width < 768) return '85%';
    if (width < 1024) return '60%';
    return '420px';
  }
  return '420px';
});

// 当前步骤 0:扫码支付 1:支付结果
const currentStep = ref(0);
// 加载状态
const loading = ref(false);
// 支付方式列表
const paymentMethods = ref([]);
// 选择的支付方式
const selectedPaymentType = ref('');
// 支付订单数据
const paymentData = ref(null);
// 支付状态
const paymentStatus = ref('pending'); // pending, success, failed, cancelled, expired
// 倒计时
const countdown = ref(1800); // 30分钟
// 重定向倒计时
const redirectCountdown = ref(3);
// 二维码URL
const qrCodeUrl = ref('');
// 重试次数
const retryCount = ref(0);
const maxRetries = 3;

// 定时器
let pollTimer = null;
let countdownTimer = null;
let redirectTimer = null;

// 计算实际支付价格
const getActualPrice = () => {
  if (!selectedPackage.value) return 0;
  
  console.log('[支付价格计算] 套餐信息:', selectedPackage.value);
  console.log('[支付价格计算] 是否为会员:', isMember.value);
  console.log('[支付价格计算] 会员价格:', selectedPackage.value.member_price);
  console.log('[支付价格计算] 原价:', selectedPackage.value.price);
  
  // 只有会员用户才能享受会员价格
  if (isMember.value && selectedPackage.value.member_price !== undefined) {
    console.log('[支付价格计算] 使用会员价格:', selectedPackage.value.member_price);
    return selectedPackage.value.member_price;
  }
  
  // 普通用户使用原价
  const price = selectedPackage.value.price || selectedPackage.value.original_price || 0;
  console.log('[支付价格计算] 使用原价:', price);
  return price;
};

// 检查是否有折扣
const hasDiscount = () => {
  if (!selectedPackage.value || !isMember.value) return false;
  
  const originalPrice = selectedPackage.value.price || selectedPackage.value.original_price || 0;
  const memberPrice = selectedPackage.value.member_price || 0;
  
  return memberPrice > 0 && originalPrice > memberPrice;
};

// 获取支付方式描述
const getMethodDescription = (code) => {
  switch (code) {
    case 'alipay':
      return '支持花呗分期，安全快捷';
    default:
      return '安全便捷的支付方式';
  }
};

// 获取失败标题
const getFailedTitle = () => {
  switch (paymentStatus.value) {
    case 'cancelled':
      return '支付已取消';
    case 'expired':
      return '支付已超时';
    case 'failed':
      return '下单失败';
    default:
      return '支付异常';
  }
};

// 获取失败消息
const getFailedMessage = () => {
  switch (paymentStatus.value) {
    case 'cancelled':
      return '您已取消本次支付，可以重新发起支付';
    case 'expired':
      return '支付时间已超时，请重新发起支付';
    case 'failed':
      return '支付过程中出现异常，请重试或联系客服';
    default:
      return '请重试或联系客服';
  }
};

// 格式化倒计时显示
const formatCountdown = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// 选择支付方式
const selectPaymentMethod = (code) => {
  const method = paymentMethods.value.find(m => m.code === code);
  if (method && method.enabled) {
    selectedPaymentType.value = code;
  }
};

// 创建支付订单
const createPayment = async () => {
  if (!selectedPaymentType.value) {
    // 不显示错误提示，保持加载状态
    return;
  }

  if (!selectedPackage.value?.id) {
    // 不显示错误提示，保持加载状态
    return;
  }

  loading.value = true;
  
  // 计算期望的支付金额
  const expectedAmount = getActualPrice();
  
  // 生成唯一的订单号
  const orderNo = `PAY${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
  
  // 基础订单数据（兼容现有后端）
  const orderData = {
    package_id: selectedPackage.value.id,
    payment_type: selectedPaymentType.value,
    out_trade_no: orderNo
  };
  
  // 如果后端支持新的验证参数，则添加这些字段
  // 这样可以向后兼容，不会破坏现有的后端接口
  const enhancedOrderData = {
    ...orderData,
    // 明确传递用户会员状态
    is_member: isMember.value,
    // 明确传递期望的支付金额，防止后端错误应用折扣
    expected_amount: expectedAmount,
    // 如果是会员且有会员价格，传递会员价格
    member_price: (isMember.value && selectedPackage.value.member_price) ? selectedPackage.value.member_price : null,
    // 传递原价作为参考
    original_price: selectedPackage.value.price || selectedPackage.value.original_price
  };
  
  logger.info('开始创建支付订单', {
    basic_data: orderData,
    enhanced_data: enhancedOrderData,
    user_member_status: isMember.value,
    calculated_amount: expectedAmount,
    package_info: selectedPackage.value
  });
  
  try {
    // 先尝试使用增强的订单数据（包含验证参数）
    // 如果后端不支持，会返回400错误，然后降级到基础数据
    const response = await createPaymentOrder(enhancedOrderData);

    // 检查后端返回的code，可能是0或1表示成功
    if (response.code === 0 || response.code === 1) {
      logger.info('支付订单创建成功', {
        response_code: response.code,
        trade_no: response.data?.trade_no,
        payurl: response.data?.payurl,
        order_no: response.data?.order_no,
        amount: response.data?.amount,
        raw_response: response.data
      });
      
      // 构建统一的支付数据格式
      const unifiedPaymentData = {
        // 优先使用order_no，如果没有则使用trade_no，最后使用生成的订单号
        order_no: response.data?.order_no || response.data?.trade_no || orderNo,
        // 如果后端返回了amount则使用，否则使用期望金额
        amount: response.data?.amount || expectedAmount,
        // 支付方式
        payment_type: response.data?.payment_type || selectedPaymentType.value,
        // 二维码数据：优先使用qr_code，如果没有则使用payurl
        qr_code: response.data?.qr_code,
        payurl: response.data?.payurl,
        // 过期时间
        expire_time: response.data?.expire_time,
        // 套餐信息
        package_info: {
          id: selectedPackage.value.id,
          name: selectedPackage.value.name,
          points: selectedPackage.value.points,
          bonus_points: selectedPackage.value.bonus_points
        }
      };
      
      // 如果后端返回了金额，验证是否匹配
      if (response.data?.amount) {
        const returnedAmount = parseFloat(response.data.amount);
        const expectedAmountFloat = parseFloat(expectedAmount);
        
        if (Math.abs(returnedAmount - expectedAmountFloat) >= 0.01) {
          logger.error('订单金额不匹配，可能存在价格计算错误', {
            expected: expectedAmountFloat,
            returned: returnedAmount,
            difference: Math.abs(returnedAmount - expectedAmountFloat),
            user_is_member: isMember.value,
            package_info: selectedPackage.value
          });
          
          // 不显示错误提示，保持加载状态
          return;
        }
      }
      
      paymentData.value = unifiedPaymentData;
      
      // 重置重试次数
      retryCount.value = 0;
      
      // 生成二维码
      await generateQRCodeImage();
      
      // 开始支付流程
      startPaymentFlow();
      
      // 成功后关闭加载状态
      loading.value = false;
    } else {
      logger.error('支付订单创建失败', {
        code: response.code,
        message: response.message
      });
      // 不显示错误提示，保持加载状态
    }
  } catch (error) {
    // 如果是400错误且可能是因为后端不支持新参数，尝试降级到基础参数
    if (error.response?.status === 400 && retryCount.value === 0) {
      logger.warn('增强参数请求失败，尝试降级到基础参数', {
        error_message: error.message,
        error_data: error.response?.data
      });
      
      try {
        retryCount.value++;
        const fallbackResponse = await createPaymentOrder(orderData);
        
        if (fallbackResponse.code === 0 || fallbackResponse.code === 1) {
          logger.info('降级请求成功', {
            response_code: fallbackResponse.code,
            trade_no: fallbackResponse.data?.trade_no,
            payurl: fallbackResponse.data?.payurl,
            raw_response: fallbackResponse.data
          });
          
          // 构建统一的支付数据格式
          const unifiedPaymentData = {
            order_no: fallbackResponse.data?.order_no || fallbackResponse.data?.trade_no || orderNo,
            amount: fallbackResponse.data?.amount || expectedAmount,
            payment_type: fallbackResponse.data?.payment_type || selectedPaymentType.value,
            qr_code: fallbackResponse.data?.qr_code,
            payurl: fallbackResponse.data?.payurl,
            expire_time: fallbackResponse.data?.expire_time,
            package_info: {
              id: selectedPackage.value.id,
              name: selectedPackage.value.name,
              points: selectedPackage.value.points,
              bonus_points: selectedPackage.value.bonus_points
            }
          };
          
          // 如果后端返回了金额，验证是否匹配
          if (fallbackResponse.data?.amount) {
            const returnedAmount = parseFloat(fallbackResponse.data.amount);
            const expectedAmountFloat = parseFloat(expectedAmount);
            
            if (Math.abs(returnedAmount - expectedAmountFloat) >= 0.01) {
              logger.error('降级请求金额不匹配，可能存在价格计算错误', {
                expected: expectedAmountFloat,
                returned: returnedAmount,
                difference: Math.abs(returnedAmount - expectedAmountFloat),
                user_is_member: isMember.value
              });
              
              // 不显示错误提示，保持加载状态
              return;
            }
          }
          
          paymentData.value = unifiedPaymentData;
          retryCount.value = 0;
          await generateQRCodeImage();
          startPaymentFlow();
          
          // 成功后关闭加载状态
          loading.value = false;
          return;
        }
      } catch (fallbackError) {
        logger.error('降级请求也失败', fallbackError);
      }
    }
    
    // 如果是500错误且包含套餐信息错误，提供具体的错误信息
    if (error.response?.status === 500) {
      const errorMessage = error.response?.data?.message || error.message || '';
      if (errorMessage.includes('参数不完整') || errorMessage.includes('amount=NaN') || errorMessage.includes('productName=undefined')) {
        logger.error('后端套餐数据处理错误', {
          error_message: errorMessage,
          package_id: selectedPackage.value?.id,
          expected_amount: expectedAmount
        });
        
        // 不显示错误提示，保持加载状态
        return;
      }
    }
    
    logger.error('支付订单创建异常', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      retryCount: retryCount.value
    });
    
    // 检查是否为SSL错误或网络错误，自动重试
    const shouldAutoRetry = shouldRetryAutomatically(error);
    
    if (shouldAutoRetry && retryCount.value < maxRetries) {
      retryCount.value++;
      logger.info(`自动重试下单，第${retryCount.value}次重试`);
      
      // 不显示重试提示，保持加载状态
      
      // 延迟1秒后重试
      setTimeout(() => {
        createPayment();
      }, 1000);
      
      return;
    }
    
    // 超过重试次数或不应该自动重试的错误，显示错误信息
    let errorMessage = '下单失败，请重新发起支付';
    
    if (error.response) {
      const status = error.response.status;
      if (status === 525) {
        errorMessage = '网络连接异常，请重新发起支付';
        logger.error('SSL握手失败', error.response);
      } else if (status >= 500) {
        errorMessage = '服务器繁忙，请重新发起支付';
        logger.error('服务器内部错误', error.response);
      } else if (status === 400) {
        errorMessage = '请求参数错误，请重新选择套餐';
        logger.error('请求参数错误', error.response);
      }
    } else if (error.message && error.message.includes('timeout')) {
      errorMessage = '网络连接超时，请检查网络后重试';
      logger.error('请求超时', error);
    } else if (error.message && error.message.includes('Network Error')) {
      errorMessage = '网络连接失败，请检查网络后重试';
      logger.error('网络连接失败', error);
    }
    
    // 不显示错误提示，保持加载状态
    
    // 重置重试次数
    retryCount.value = 0;
  } finally {
    // 不关闭loading状态，保持加载中
    // loading.value = false;
  }
};

// 判断是否应该自动重试
const shouldRetryAutomatically = (error) => {
  if (!error.response) {
    // 网络错误，应该重试
    return error.message && (
      error.message.includes('timeout') ||
      error.message.includes('Network Error') ||
      error.message.includes('ECONNRESET') ||
      error.message.includes('ENOTFOUND')
    );
  }
  
  const status = error.response.status;
  // SSL错误(525)、服务器错误(5xx)应该重试
  return status === 525 || (status >= 500 && status < 600);
};

// 生成二维码
const generateQRCodeImage = async () => {
  // 检查是否有二维码数据或支付链接
  const qrData = paymentData.value?.qr_code || paymentData.value?.payurl;
  
  if (!qrData) {
    logger.error('二维码数据为空', {
      paymentData: paymentData.value,
      hasQrCode: !!paymentData.value?.qr_code,
      hasPayurl: !!paymentData.value?.payurl
    });
    // 不显示错误提示，保持加载状态
    return;
  }

  logger.info('开始生成支付二维码', {
    qr_data_type: paymentData.value?.qr_code ? 'qr_code' : 'payurl',
    qr_data_length: qrData.length,
    order_no: paymentData.value.order_no,
    qr_data: qrData
  });

  try {
    // 使用我们自己的二维码生成工具
    const qrDataUrl = await generateQRCode(qrData, {
      width: 200,
      height: 200
    });
    
    // 将生成的二维码设置到响应式变量中
    qrCodeUrl.value = qrDataUrl;
    logger.info('二维码生成成功', {
      data_type: paymentData.value?.qr_code ? 'qr_code' : 'payurl'
    });
  } catch (error) {
    logger.error('二维码生成失败', error);
    // 使用简化版本作为备用
    try {
      qrCodeUrl.value = generateQRCodeUrl(qrData, {
        width: 200,
        height: 200
      });
      logger.info('使用备用方式生成二维码成功', {
        data_type: paymentData.value?.qr_code ? 'qr_code' : 'payurl'
      });
    } catch (backupError) {
      logger.error('备用二维码生成也失败', backupError);
      // 不显示错误提示，保持加载状态
    }
  }
};

// 开始支付流程
const startPaymentFlow = () => {
  // 开始轮询支付状态
  startPolling();
  
  // 开始倒计时
  startCountdown();
};

// 开始轮询支付状态
const startPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer);
  }

  let pollCount = 0;
  const maxPolls = 600; // 最多查询30分钟（每3秒一次）

  pollTimer = setInterval(async () => {
    pollCount++;
    
    // 超出最大次数停止轮询
    if (pollCount > maxPolls) {
      stopTimers();
      paymentStatus.value = 'expired';
      currentStep.value = 1;
      return;
    }

    await checkPaymentStatus();
  }, 3000); // 每3秒查询一次
};

// 检查支付状态
const checkPaymentStatus = async () => {
  if (!paymentData.value?.order_no) return;

  try {
    const response = await getPaymentStatus(paymentData.value.order_no);
    
    if (response.code === 0) {
      const status = response.data.payment_status || response.data.status;
      logger.debug('支付状态查询结果', {
        order_no: paymentData.value.order_no,
        status: status,
        response_data: response.data
      });
      
      if (status === 'paid') {
        // 支付成功
        paymentStatus.value = 'success';
        currentStep.value = 1;
        stopTimers();
        
        logger.info('支付成功', {
          order_no: paymentData.value.order_no,
          amount: paymentData.value.amount,
          package_name: selectedPackage.value.name
        });
        
        ElMessage.success('支付成功！积分已到账');
        
        // 开始重定向倒计时
        startRedirectCountdown();
        
        // 通知父组件支付成功
        emit('payment-success', {
          order_no: paymentData.value.order_no,
          package_info: selectedPackage.value,
          amount: paymentData.value.amount,
          manual_confirm: false // 标记为自动确认
        });
      } else if (status === 'cancelled' || status === 'expired') {
        // 支付失败
        paymentStatus.value = status;
        currentStep.value = 1;
        stopTimers();
        
        logger.warn('支付状态异常', {
          order_no: paymentData.value.order_no,
          status: status
        });
      }
    } else {
      logger.warn('支付状态查询响应异常', {
        code: response.code,
        message: response.message
      });
    }
  } catch (error) {
    logger.error('支付状态查询失败', {
      order_no: paymentData.value?.order_no,
      error: error.message,
      status: error.response?.status
    });
    // 不显示错误消息，避免频繁提示
  }
};

// 开始倒计时
const startCountdown = () => {
  if (countdownTimer) {
    clearInterval(countdownTimer);
  }

  // 设置过期时间（30分钟）
  if (paymentData.value?.expire_time) {
    const expireTime = new Date(paymentData.value.expire_time).getTime();
    const now = Date.now();
    countdown.value = Math.max(0, Math.floor((expireTime - now) / 1000));
  } else {
    countdown.value = 1800; // 默认30分钟
  }

  countdownTimer = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      paymentStatus.value = 'expired';
      currentStep.value = 1;
      stopTimers();
      ElMessage.error('支付已超时');
    }
  }, 1000);
};

// 开始重定向倒计时
const startRedirectCountdown = () => {
  redirectCountdown.value = 3;
  
  redirectTimer = setInterval(() => {
    redirectCountdown.value--;
    if (redirectCountdown.value <= 0) {
      clearInterval(redirectTimer);
      handleClose();
    }
  }, 1000);
};

// 停止所有定时器
const stopTimers = () => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
  if (redirectTimer) {
    clearInterval(redirectTimer);
    redirectTimer = null;
  }
};

// 刷新支付状态
const refreshPaymentStatus = async () => {
  await checkPaymentStatus();
  ElMessage.info('状态已刷新');
};

// 取消支付
const cancelPayment = async () => {
  try {
    const confirmed = await ElMessageBox.confirm(
      '确定要取消支付吗？取消后需要重新发起支付。',
      '取消支付',
      {
        confirmButtonText: '确定取消',
        cancelButtonText: '继续支付',
        type: 'warning'
      }
    );

    if (confirmed && paymentData.value?.order_no) {
      const response = await cancelPaymentOrder(paymentData.value.order_no, '用户主动取消');
      
      if (response.code === 0) {
        paymentStatus.value = 'cancelled';
        currentStep.value = 1;
        stopTimers();
        ElMessage.info('支付已取消');
      }
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('[支付] 取消支付失败:', error);
      ElMessage.error('取消下单失败');
    }
  }
};



// 重试支付
const retryPayment = async () => {
  // 重置状态
  stopTimers();
  currentStep.value = 0;
  paymentData.value = null;
  paymentStatus.value = 'pending';
  countdown.value = 1800;
  qrCodeUrl.value = '';
  retryCount.value = 0;
  loading.value = true; // 重置加载状态
  
  // 自动开始创建订单
  selectedPaymentType.value = 'alipay';
  await createPayment();
};

// 关闭对话框
const handleClose = () => {
  stopTimers();
  
  // 重置状态
  currentStep.value = 0;
  paymentData.value = null;
  paymentStatus.value = 'pending';
  selectedPaymentType.value = '';
  countdown.value = 1800;
  redirectCountdown.value = 3;
  loading.value = false;
  
  // 关闭对话框
  emit('update:modelValue', false);
  
  // 通知取消
  if (paymentStatus.value === 'pending') {
    emit('payment-cancel');
  }
};

// 处理用户手动确认支付成功
const handlePaymentSuccess = () => {
  logger.info('用户手动确认支付成功', {
    order_no: paymentData.value?.order_no,
    package_id: selectedPackage.value?.id,
    amount: getActualPrice()
  });
  
  // 停止轮询定时器
  stopTimers();
  
  // 显示友好提示
  ElMessage.success('支付确认成功！权益将在3-5分钟内到账，请耐心等待');
  
  // 通知父组件支付成功
  emit('payment-success', {
    order_no: paymentData.value?.order_no,
    amount: getActualPrice(),
    package_info: selectedPackage.value,
    manual_confirm: true // 标记为手动确认
  });
  
  // 关闭对话框
  handleClose();
};

// 加载支付方式
const loadPaymentMethods = async () => {
  try {
    const response = await getPaymentMethods();
    if (response.code === 0) {
      // 只保留支付宝支付方式
      const allMethods = response.data.payment_methods || [];
      paymentMethods.value = allMethods.filter(m => m.code === 'alipay');
      
      // 如果没有支付宝，则设置默认支付宝
      if (paymentMethods.value.length === 0) {
        paymentMethods.value = [
          {
            code: 'alipay',
            name: '支付宝',
            enabled: true
          }
        ];
      }
      
      // 默认选择支付宝
      selectedPaymentType.value = 'alipay';
    }
  } catch (error) {
    console.error('[支付] 获取支付方式失败:', error);
    // 设置默认支付方式 - 只有支付宝
    paymentMethods.value = [
      {
        code: 'alipay',
        name: '支付宝',
        enabled: true
      }
    ];
    selectedPaymentType.value = 'alipay';
  }
};

// 监听对话框显示状态
watch(visible, async (newValue) => {
  if (newValue) {
    // 对话框打开时验证套餐数据
    validatePackageData();
    
    // 重置状态
    currentStep.value = 0;
    paymentData.value = null;
    paymentStatus.value = 'pending';
    retryCount.value = 0;
    loading.value = true;
    
    // 加载支付方式
    await loadPaymentMethods();
    
    // 自动开始创建订单（使用默认支付宝）
    if (paymentMethods.value.length > 0) {
      selectedPaymentType.value = 'alipay';
      await createPayment();
    }
  } else {
    // 对话框关闭时清理定时器
    stopTimers();
  }
});

// 验证套餐数据的安全性
const validatePackageData = () => {
  if (!selectedPackage.value) {
    logger.error('套餐数据为空');
    return;
  }
  
  const pkg = selectedPackage.value;
  const userIsMember = isMember.value;
  
  logger.info('验证套餐数据安全性', {
    package_id: pkg.id,
    package_name: pkg.name,
    user_is_member: userIsMember,
    has_member_price: pkg.member_price !== undefined,
    member_price: pkg.member_price,
    original_price: pkg.price || pkg.original_price
  });
  
  // 安全检查：如果用户不是会员但套餐包含会员价格，发出警告
  if (!userIsMember && pkg.member_price !== undefined) {
    logger.warn('安全警告：普通用户的套餐包含会员价格', {
      user_is_member: userIsMember,
      member_price: pkg.member_price,
      original_price: pkg.price
    });
    
    // 在开发环境下显示警告
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ 安全警告：普通用户套餐包含会员价格，可能存在价格计算错误');
    }
  }
  
  // 验证价格计算
  const calculatedPrice = getActualPrice();
  const expectedPrice = userIsMember && pkg.member_price ? pkg.member_price : (pkg.price || pkg.original_price);
  
  if (Math.abs(calculatedPrice - expectedPrice) >= 0.01) {
    logger.error('价格计算不一致', {
      calculated: calculatedPrice,
      expected: expectedPrice,
      user_is_member: userIsMember,
      package_data: pkg
    });
  }
};

// 组件卸载时清理定时器
onUnmounted(() => {
  stopTimers();
});
</script>

<style scoped>
/* 自定义步骤指示器样式 */
.custom-steps {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 25px;
  padding: 0 20px;
  gap: 20px;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
  max-width: 120px;
}

.step-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  border: 2px solid #dcdfe6;
  background: #f5f7fa;
  color: #909399;
  transition: all 0.3s ease;
}

.step-item.active .step-circle {
  background: #409eff;
  border-color: #409eff;
  color: white;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

.step-title {
  font-size: 14px;
  font-weight: 500;
  color: #909399;
  text-align: center;
  white-space: nowrap;
  transition: all 0.3s ease;
}

.step-item.active .step-title {
  color: #409eff;
  font-weight: 600;
}

.step-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #dcdfe6;
  margin: 0 10px;
  flex-shrink: 0;
}

.step-arrow svg {
  transition: color 0.3s ease;
}

/* 当第一步激活时，箭头变为蓝色 */
.custom-steps .step-item:first-child.active ~ .step-arrow {
  color: #409eff;
}

/* 响应式调整 */
@media (max-width: 480px) {
  .custom-steps {
    gap: 15px;
    padding: 0 10px;
  }
  
  .step-item {
    max-width: 100px;
  }
  
  .step-circle {
    width: 28px;
    height: 28px;
    font-size: 12px;
  }
  
  .step-title {
    font-size: 12px;
  }
  
  .step-arrow {
    margin: 0 5px;
  }
  
  .step-arrow svg {
    width: 20px;
    height: 14px;
  }
}

.step-content {
  min-height: 300px;
  padding: 0 5px;
}

/* 订单创建加载状态 */
.order-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 250px;
}

.loading-container {
  text-align: center;
}

.loading-container h3 {
  margin: 15px 0 10px 0;
  color: #303133;
  font-size: 18px;
}

.loading-tip {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

/* 加载状态下的套餐信息 */
.package-info-loading {
  margin-bottom: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.package-info-loading h3 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 16px;
}

.package-info-loading .package-details {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
}

.package-info-loading .points {
  color: #409eff;
  font-weight: bold;
}

.package-info-loading .amount {
  color: #e6a23c;
  font-weight: bold;
  font-size: 18px;
}

.package-info-loading .discount-tag {
  background: #67c23a;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
}

/* 紧凑版套餐信息 */
.package-info-compact {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 15px;
}

.package-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.package-header h3 {
  margin: 0;
  color: #333;
  font-size: 16px;
}

.package-price {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.package-price .amount {
  font-size: 20px;
  font-weight: bold;
  color: #e6a23c;
}

.package-price .original-price {
  font-size: 12px;
  color: #999;
  text-decoration: line-through;
  margin-top: 2px;
}

.package-details-compact {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.package-details-compact .points {
  color: #409eff;
  font-weight: bold;
}

.package-details-compact .bonus {
  color: #67c23a;
  font-size: 12px;
}

.package-details-compact .discount-tag {
  background: #67c23a;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
}

/* 紧凑版支付方式 */
.payment-methods-compact {
  margin-bottom: 15px;
}

.method-list-compact {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.payment-method-compact {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 10px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
  min-width: 80px;
}

.payment-method-compact.active {
  border-color: #409eff;
  background: #ecf5ff;
}

.payment-method-compact .method-name {
  font-size: 12px;
  color: #606266;
}

/* 紧凑版订单信息 */
.order-summary-compact {
  background: #f8f9fa;
  padding: 10px;
  border-radius: 6px;
  margin-bottom: 15px;
}

.order-info-compact {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.order-detail {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.order-label {
  font-size: 11px;
  color: #909399;
  margin-bottom: 2px;
}

.order-value {
  font-size: 12px;
  color: #303133;
  font-weight: bold;
}

.amount-highlight {
  color: #e6a23c;
}

.time-highlight {
  color: #f56c6c;
}

/* 紧凑版二维码 */
.qr-container-compact {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 15px;
}

.qr-code-compact {
  width: 160px;
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  margin-bottom: 10px;
}

.qr-code-compact img {
  width: 150px;
  height: 150px;
}

.qr-tips-compact {
  text-align: center;
}

.qr-tips-compact .main-tip {
  font-size: 13px;
  color: #606266;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.qr-tips-compact .payment-icon {
  width: 13px;
  height: 13px;
  vertical-align: middle;
}

/* 紧凑版支付状态 */
.payment-status-compact {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #409eff;
  font-size: 13px;
  margin-bottom: 15px;
}

/* 紧凑版操作按钮 */
.step-actions-compact {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #eee;
}

.step-actions-compact .el-button {
  min-width: auto;
  padding: 8px 16px;
  font-size: 14px;
}

.step-actions-compact .el-button--success {
  background-color: #67c23a;
  border-color: #67c23a;
  color: white;
  font-weight: 500;
}

.step-actions-compact .el-button--success:hover {
  background-color: #85ce61;
  border-color: #85ce61;
}

/* 原有样式保持不变 */
.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.price-row {
  font-size: 16px;
  font-weight: bold;
  border-top: 1px solid #eee;
  padding-top: 10px;
  margin-top: 10px;
}

.points {
  color: #409eff;
  font-weight: bold;
}

.bonus {
  color: #67c23a;
  font-weight: bold;
}

.amount {
  color: #e6a23c;
  font-size: 18px;
}

.discount {
  color: #67c23a;
}

/* 支付方式 */
.payment-methods h4 {
  margin: 0 0 15px 0;
  color: #333;
}

.method-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.payment-method {
  display: flex;
  align-items: center;
  padding: 15px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.payment-method:hover {
  border-color: #c6e2ff;
  background-color: #f0f9ff;
}

.payment-method.active {
  border-color: #409eff;
  background-color: #f0f9ff;
}

.payment-method.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.method-icon {
  width: 40px;
  height: 40px;
  margin-right: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.method-info {
  flex: 1;
}

.method-name {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 4px;
}

.method-desc {
  font-size: 12px;
  color: #909399;
}

.method-radio {
  margin-left: 10px;
}

/* 二维码支付 */
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

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 支付结果 */
.payment-result {
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

.result-success h3 {
  color: #67c23a;
  margin-bottom: 15px;
}

.result-failed h3 {
  color: #f56c6c;
  margin-bottom: 15px;
}

.success-details p {
  margin: 8px 0;
  color: #666;
}

.redirect-tip {
  color: #409eff;
  font-weight: bold;
}

/* 操作按钮 */
.step-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

/* 响应式样式 */
@media (max-width: 768px) {
  .step-content {
    min-height: auto;
    padding: 10px;
  }
  
  .package-info {
    padding: 15px;
    margin-bottom: 20px;
  }
  
  .package-info h3 {
    font-size: 18px;
    margin-bottom: 15px;
  }
  
  .package-details {
    gap: 12px;
  }
  
  .detail-row {
    padding: 8px 0;
  }
  
  .payment-methods h4 {
    font-size: 16px;
    margin-bottom: 15px;
  }
  
  .payment-method {
    padding: 12px;
    margin-bottom: 10px;
  }
  
  .method-name {
    font-size: 14px;
  }
  
  .method-desc {
    font-size: 11px;
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
  
  .step-actions {
    flex-direction: column;
    gap: 10px;
    margin-top: 20px;
    padding-top: 15px;
  }
  
  .step-actions .el-button {
    width: 100%;
  }
  
  .step-actions-compact {
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 15px;
    padding-top: 10px;
  }
  
  .step-actions-compact .el-button {
    flex: 0 0 auto;
    min-width: 70px;
    max-width: 90px;
    padding: 6px 12px;
    font-size: 12px;
  }
  
  .payment-result {
    padding: 15px;
  }
  
  .result-icon {
    width: 60px;
    height: 60px;
    font-size: 30px;
    margin-bottom: 15px;
  }
  
  .success-details p {
    font-size: 14px;
    margin: 6px 0;
  }
}

@media (max-width: 480px) {
  .package-info h3 {
    font-size: 16px;
  }
  
  .detail-row .amount {
    font-size: 18px;
  }
  
  .payment-method {
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
  
  .sub-tip {
    font-size: 11px;
  }
  
  .step-actions-compact {
    gap: 6px;
    margin-top: 12px;
    padding-top: 8px;
  }
  
  .step-actions-compact .el-button {
    min-width: 60px;
    max-width: 75px;
    padding: 5px 8px;
    font-size: 11px;
  }
}
</style> 