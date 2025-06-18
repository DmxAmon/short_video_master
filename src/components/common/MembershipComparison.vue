<!--
 * @Version    : v1.00
 * @Author     : Amon
 * @Date       : 20245-05-06
 * @desc       : 会员等级比较组件，用于展示不同会员等级之间的特权对比
-->
<script setup>
import { ref, computed } from 'vue';
import { ArrowRight, Check, Close } from '@element-plus/icons-vue';

const props = defineProps({
  // 会员等级列表
  levels: {
    type: Array,
    required: true,
    default: () => []
  },
  // 特权类别列表
  categories: {
    type: Array,
    required: true,
    default: () => []
  },
  // 所有特权列表
  benefits: {
    type: Array,
    required: true,
    default: () => []
  },
  // 当前用户等级
  currentLevel: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['upgrade']);

// 激活的视图模式：列表或表格
const activeViewMode = ref('table');

// 进行对比的会员等级
const comparingLevels = ref([]);

// 初始化要比较的等级
const initComparisonLevels = () => {
  // 默认显示所有等级
  if (props.levels.length <= 4) {
    comparingLevels.value = props.levels.map(level => level.name);
  } else {
    // 如果等级过多，默认只显示部分等级（包括当前等级和高一级）
    const currentLevelIndex = props.levels.findIndex(level => level.name === props.currentLevel);
    const startIndex = Math.max(0, currentLevelIndex - 1);
    const endIndex = Math.min(props.levels.length - 1, currentLevelIndex + 2);
    
    comparingLevels.value = props.levels
      .slice(startIndex, endIndex + 1)
      .map(level => level.name);
  }
};

// 初始化
initComparisonLevels();

// 切换视图模式
const toggleViewMode = (mode) => {
  activeViewMode.value = mode;
};

// 切换要比较的会员等级
const toggleLevelForComparison = (levelName) => {
  if (comparingLevels.value.includes(levelName)) {
    // 至少保留一个等级
    if (comparingLevels.value.length > 1) {
      comparingLevels.value = comparingLevels.value.filter(name => name !== levelName);
    }
  } else {
    comparingLevels.value.push(levelName);
  }
};

// 按分类整理特权
const benefitsByCategory = computed(() => {
  const result = {};
  
  props.categories.forEach(category => {
    result[category.id] = props.benefits.filter(benefit => benefit.category === category.id);
  });
  
  return result;
});

// 获取用于显示在表格中的等级
const displayedLevels = computed(() => {
  return props.levels.filter(level => comparingLevels.value.includes(level.name));
});

// 检查特定等级是否具有特定特权
const hasPrivilege = (levelName, benefitId) => {
  const level = props.levels.find(l => l.name === levelName);
  if (!level) return false;
  
  const benefit = props.benefits.find(b => b.id === benefitId);
  if (!benefit) return false;
  
  const requiredLevel = props.levels.find(l => l.name === benefit.requiredLevel);
  if (!requiredLevel) return false;
  
  return level.order >= requiredLevel.order;
};

// 获取特权项的值（例如：无限/10次/不可用）
const getPrivilegeValue = (levelName, benefitId) => {
  const level = props.levels.find(l => l.name === levelName);
  if (!level) return '不可用';
  
  const benefit = props.benefits.find(b => b.id === benefitId);
  if (!benefit) return '不可用';
  
  // 如果特权不可用于该等级
  if (!hasPrivilege(levelName, benefitId)) {
    return '不可用';
  }
  
  // 返回对应等级的特权值
  const levelValue = benefit.levelValues && benefit.levelValues[levelName];
  return levelValue !== undefined ? levelValue : '可用';
};

// 处理升级点击
const handleUpgradeClick = (levelName) => {
  emit('upgrade', levelName);
};

// 判断一个等级是否可升级（比当前等级高）
const canUpgradeToLevel = (levelName) => {
  if (!props.currentLevel) return true;
  
  const currentLevel = props.levels.find(l => l.name === props.currentLevel);
  const targetLevel = props.levels.find(l => l.name === levelName);
  
  if (!currentLevel || !targetLevel) return false;
  
  return targetLevel.order > currentLevel.order;
};
</script>

<template>
  <div class="membership-comparison">
    <div class="comparison-header">
      <h3 class="section-title">会员等级对比</h3>
      <div class="view-mode-toggle">
        <el-radio-group v-model="activeViewMode" size="small">
          <el-radio-button label="table">表格视图</el-radio-button>
          <el-radio-button label="list">列表视图</el-radio-button>
        </el-radio-group>
      </div>
    </div>
    
    <div class="level-selection">
      <div class="level-selection-label">选择要比较的会员等级：</div>
      <div class="level-checkboxes">
        <el-checkbox 
          v-for="level in props.levels" 
          :key="level.name"
          v-model="comparingLevels"
          :label="level.name"
          :disabled="comparingLevels.length <= 1 && comparingLevels.includes(level.name)"
          :style="{ borderColor: level.color }"
        >
          <span :style="{ color: level.color }">{{ level.name }}</span>
        </el-checkbox>
      </div>
    </div>
    
    <!-- 表格视图 -->
    <div v-if="activeViewMode === 'table'" class="table-view">
      <el-table 
        :data="props.benefits"
        border
        style="width: 100%"
        :cell-class-name="cellClassHandler"
      >
        <el-table-column prop="title" label="特权" width="200">
          <template #default="scope">
            <div class="benefit-name-cell">
              <span class="benefit-title">{{ scope.row.title }}</span>
              <span v-if="scope.row.category" class="benefit-category">{{ scope.row.category }}</span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column 
          v-for="level in displayedLevels" 
          :key="level.name" 
          :label="level.name"
          align="center"
        >
          <template #header>
            <div class="level-header" :style="{ borderTopColor: level.color }">
              <span class="level-name" :style="{ color: level.color }">{{ level.name }}</span>
              <el-button 
                v-if="canUpgradeToLevel(level.name)" 
                type="primary" 
                size="small"
                @click="handleUpgradeClick(level.name)"
              >
                升级
              </el-button>
            </div>
          </template>
          
          <template #default="scope">
            <div class="privilege-cell" :class="{ 'has-privilege': hasPrivilege(level.name, scope.row.id) }">
              <el-icon v-if="hasPrivilege(level.name, scope.row.id)" :color="'#67c23a'"><Check /></el-icon>
              <el-icon v-else :color="'#f56c6c'"><Close /></el-icon>
              <span class="privilege-value">{{ getPrivilegeValue(level.name, scope.row.id) }}</span>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>
    
    <!-- 列表视图 -->
    <div v-else class="list-view">
      <div v-for="category in props.categories" :key="category.id" class="category-section">
        <h4 class="category-title">{{ category.name }}</h4>
        
        <div v-for="benefit in benefitsByCategory[category.id]" :key="benefit.id" class="benefit-row">
          <div class="benefit-info">
            <div class="benefit-title">{{ benefit.title }}</div>
            <div class="benefit-description">{{ benefit.description }}</div>
          </div>
          
          <div class="benefit-levels">
            <div 
              v-for="level in displayedLevels"
              :key="level.name"
              class="level-badge"
              :class="{ 'has-privilege': hasPrivilege(level.name, benefit.id) }"
              :style="hasPrivilege(level.name, benefit.id) ? { backgroundColor: level.color + '20', color: level.color, borderColor: level.color } : {}"
            >
              <span class="level-name">{{ level.name }}</span>
              <span v-if="benefit.levelValues && benefit.levelValues[level.name]" class="level-value">
                {{ benefit.levelValues[level.name] }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.membership-comparison {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin-bottom: 20px;
}

.comparison-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-title {
  font-size: 18px;
  font-weight: 500;
  color: #303133;
  margin: 0;
}

.level-selection {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.level-selection-label {
  margin-right: 16px;
  color: #606266;
  font-size: 14px;
}

.level-checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.level-checkboxes .el-checkbox {
  margin-right: 0;
  padding: 4px 8px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

/* 表格视图样式 */
.table-view {
  margin-top: 24px;
  overflow-x: auto;
}

.benefit-name-cell {
  display: flex;
  flex-direction: column;
}

.benefit-title {
  font-weight: 500;
}

.benefit-category {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.level-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
  border-top: 3px solid;
}

.level-name {
  font-weight: 500;
  margin-bottom: 8px;
}

.privilege-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
}

.privilege-cell.has-privilege {
  background-color: #f0f9eb;
}

.privilege-value {
  margin-top: 4px;
  font-size: 13px;
}

/* 列表视图样式 */
.list-view {
  margin-top: 24px;
}

.category-section {
  margin-bottom: 32px;
}

.category-title {
  font-size: 16px;
  font-weight: 500;
  margin: 0 0 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

.benefit-row {
  display: flex;
  justify-content: space-between;
  padding: 16px 0;
  border-bottom: 1px solid #f0f2f5;
}

.benefit-info {
  flex: 1;
  margin-right: 16px;
}

.benefit-title {
  font-weight: 500;
  margin-bottom: 8px;
}

.benefit-description {
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
}

.benefit-levels {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 200px;
}

.level-badge {
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 12px;
  display: flex;
  align-items: center;
  background-color: #f5f7fa;
  color: #909399;
  border: 1px solid #e4e7ed;
}

.level-badge.has-privilege {
  font-weight: 500;
}

.level-value {
  margin-left: 4px;
  padding-left: 4px;
  border-left: 1px solid currentColor;
}

@media (max-width: 768px) {
  .comparison-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .view-mode-toggle {
    margin-top: 16px;
  }
  
  .level-selection {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .level-selection-label {
    margin-bottom: 12px;
  }
  
  .benefit-row {
    flex-direction: column;
  }
  
  .benefit-info {
    margin-right: 0;
    margin-bottom: 16px;
  }
  
  .benefit-levels {
    min-width: auto;
  }
}
</style> 