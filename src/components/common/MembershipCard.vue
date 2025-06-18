<!--
 * @Version    : v1.00
 * @Author     : Amon
 * @Date       : 20245-05-06
 * @desc       : 会员卡组件，用于展示会员等级和权益
-->
<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  currentLevel: {
    type: String,
    required: true,
    default: '免费用户'
  },
  levelDetails: {
    type: Array,
    required: true,
    default: () => []
  }
});

const emit = defineEmits(['upgrade']);

// 选择显示的会员等级信息
const activeLevel = ref(props.levelDetails[0]?.id || null);

// 查找当前等级的详细信息
const currentLevelInfo = computed(() => {
  return props.levelDetails.find(level => level.name === props.currentLevel) || null;
});

// 处理升级会员按钮点击
const handleUpgrade = (level) => {
  emit('upgrade', level);
};

// 设置激活的会员等级
const setActiveLevel = (levelId) => {
  activeLevel.value = levelId;
};
</script>

<template>
  <div class="membership-card">
    <div class="card-header">
      <h3 class="card-title">会员权益</h3>
      <div class="current-level">当前等级：{{ currentLevel }}</div>
    </div>
    
    <div class="card-content">
      <div class="level-tabs">
        <div
          v-for="level in levelDetails"
          :key="level.id"
          class="level-tab"
          :class="{ 'active': activeLevel === level.id }"
          @click="setActiveLevel(level.id)"
          :style="activeLevel === level.id ? { borderBottomColor: level.color } : {}"
        >
          {{ level.name }}
        </div>
      </div>
      
      <div class="level-details">
        <template v-for="level in levelDetails" :key="level.id">
          <div v-if="activeLevel === level.id" class="level-detail-content">
            <div class="level-price-section">
              <div class="level-price">
                <span class="price-currency">¥</span>
                <span class="price-number">{{ level.price }}</span>
                <span class="price-duration">/ {{ level.duration }}个月</span>
              </div>
              <div v-if="level.perMonth" class="price-per-month">
                约 ¥{{ level.perMonth }}/月
              </div>
              <el-button
                class="upgrade-btn"
                type="primary"
                :style="{ backgroundColor: level.color }"
                @click="handleUpgrade(level)"
                v-if="level.name !== currentLevel"
              >
                {{ level.code === 'free' ? '当前等级' : (currentLevelInfo && currentLevelInfo.price > level.price ? '降级' : '升级') }}
              </el-button>
              <div v-else class="current-level-tag">当前等级</div>
            </div>
            
            <div class="level-features">
              <div class="features-title">包含权益</div>
              <div class="features-list">
                <div 
                  v-for="(feature, index) in level.features" 
                  :key="index"
                  class="feature-item"
                  v-show="feature.value"
                >
                  <el-icon class="feature-icon"><Check /></el-icon>
                  <div class="feature-info">
                    <div class="feature-name">{{ feature.name }}</div>
                    <div class="feature-value">{{ feature.value }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.membership-card {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 0;
  margin-bottom: 20px;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #ebeef5;
}

.card-title {
  font-size: 16px;
  font-weight: bold;
  margin: 0;
  color: #303133;
}

.current-level {
  font-size: 14px;
  color: #409eff;
  font-weight: 500;
}

.level-tabs {
  display: flex;
  border-bottom: 1px solid #ebeef5;
}

.level-tab {
  padding: 12px 20px;
  font-size: 14px;
  color: #606266;
  cursor: pointer;
  position: relative;
  transition: all 0.3s;
}

.level-tab.active {
  color: #409eff;
  font-weight: 500;
  border-bottom: 2px solid #409eff;
}

.level-tab:hover {
  color: #409eff;
}

.level-details {
  padding: 20px;
}

.level-detail-content {
  display: flex;
  flex-wrap: wrap;
}

.level-price-section {
  flex: 0 0 200px;
  padding-right: 30px;
  border-right: 1px solid #ebeef5;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
}

.level-price {
  text-align: center;
  margin-bottom: 5px;
}

.price-currency {
  font-size: 16px;
  vertical-align: top;
}

.price-number {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
}

.price-duration {
  font-size: 12px;
  color: #909399;
}

.price-per-month {
  font-size: 12px;
  color: #909399;
  margin-bottom: 20px;
}

.upgrade-btn {
  width: 100%;
  max-width: 120px;
}

.current-level-tag {
  background-color: #f0f9eb;
  color: #67c23a;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 4px;
  margin-top: 10px;
}

.level-features {
  flex: 1;
  padding-left: 30px;
}

.features-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 15px;
}

.features-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
}

.feature-item {
  display: flex;
  align-items: flex-start;
}

.feature-icon {
  margin-right: 8px;
  color: #67c23a;
  margin-top: 2px;
}

.feature-info {
  display: flex;
  flex-direction: column;
}

.feature-name {
  font-size: 14px;
  color: #606266;
}

.feature-value {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

@media screen and (max-width: 768px) {
  .level-detail-content {
    flex-direction: column;
  }
  
  .level-price-section {
    flex: 1;
    border-right: none;
    border-bottom: 1px solid #ebeef5;
    padding-right: 0;
    padding-bottom: 20px;
    margin-bottom: 20px;
  }
  
  .level-features {
    padding-left: 0;
  }
}
</style> 