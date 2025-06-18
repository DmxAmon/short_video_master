/**
 * 飞书多维表格API模拟文件
 * 在实际开发中，这应该是与飞书多维表格SDK的实际集成
 */

// 存储base实例
let baseInstance = null;

// 模拟数据
const mockDatabases = [
  { id: 'table1', name: '项目计划表' },
  { id: 'table2', name: '内容数据表' },
  { id: 'table3', name: '数据分析表' },
  { id: 'table4', name: '视频素材库' },
  { id: 'table5', name: '营销日历' }
];

// 模拟视图数据
const mockViews = {
  'table1': [
    { id: 'view1_1', name: '默认视图' },
    { id: 'view1_2', name: '甘特图' },
    { id: 'view1_3', name: '日历视图' }
  ],
  'table2': [
    { id: 'view2_1', name: '全部内容' },
    { id: 'view2_2', name: '抖音数据' },
    { id: 'view2_3', name: '未处理内容' }
  ],
  'table3': [
    { id: 'view3_1', name: '数据概览' },
    { id: 'view3_2', name: '详细数据' },
    { id: 'view3_3', name: '图表视图' }
  ],
  'table4': [
    { id: 'view4_1', name: '全部素材' },
    { id: 'view4_2', name: '已使用素材' },
    { id: 'view4_3', name: '待使用素材' }
  ],
  'table5': [
    { id: 'view5_1', name: '月度视图' },
    { id: 'view5_2', name: '周度视图' },
    { id: 'view5_3', name: '日视图' }
  ]
};

// 模拟字段数据
const mockFields = {
  'view1_1': [
    { id: 'field1_1', name: '任务名称', type: 'text' },
    { id: 'field1_2', name: '开始时间', type: 'date' },
    { id: 'field1_3', name: '截止时间', type: 'date' },
    { id: 'field1_4', name: '负责人', type: 'person' }
  ],
  'view2_1': [
    { id: 'field2_1', name: '标题', type: 'text' },
    { id: 'field2_2', name: '作者昵称', type: 'text' },
    { id: 'field2_3', name: '视频链接', type: 'url' },
    { id: 'field2_4', name: '发布时间', type: 'date' },
    { id: 'field2_5', name: '点赞数', type: 'number' },
    { id: 'field2_6', name: '评论数', type: 'number' },
    { id: 'field2_7', name: '视频唯一ID', type: 'text' }
  ]
};

// 创建Base类
class Base {
  constructor() {
    this.tables = {};
    
    // 初始化表格
    mockDatabases.forEach(db => {
      this.tables[db.id] = new Table(db.id, db.name);
    });
  }
  
  // 获取所有数据表
  async getDatabases() {
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockDatabases;
  }
  
  // 获取特定表格
  async getTable(tableId) {
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (!this.tables[tableId]) {
      throw new Error(`表格不存在: ${tableId}`);
    }
    
    return this.tables[tableId];
  }
  
  // 创建新表格
  async createTable(tableName) {
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const newId = `table${mockDatabases.length + 1}`;
    const newTable = { id: newId, name: tableName };
    
    mockDatabases.push(newTable);
    this.tables[newId] = new Table(newId, tableName);
    
    // 创建默认视图
    mockViews[newId] = [{ id: `view${newId}_1`, name: '默认视图' }];
    
    return this.tables[newId];
  }
}

// 表格类
class Table {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.views = {};
    
    // 初始化视图
    if (mockViews[id]) {
      mockViews[id].forEach(v => {
        this.views[v.id] = new View(v.id, v.name, this);
      });
    }
  }
  
  // 获取表格的所有视图元数据
  async getViewMetaList() {
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return mockViews[this.id] || [];
  }
  
  // 获取特定视图
  async getViewById(viewId) {
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 200));
    
    if (!this.views[viewId]) {
      throw new Error(`视图不存在: ${viewId}`);
    }
    
    return this.views[viewId];
  }
  
  // 向表格添加记录
  async addRecords(records) {
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // 模拟返回添加的记录ID
    return records.map((_, index) => ({ id: `record_${Date.now()}_${index}` }));
  }
}

// 视图类
class View {
  constructor(id, name, table) {
    this.id = id;
    this.name = name;
    this.table = table;
  }
  
  // 获取视图的字段元数据
  async getFieldMetaList() {
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return mockFields[this.id] || [];
  }
}

// 获取Base实例
export const getBase = () => {
  if (!baseInstance) {
    baseInstance = new Base();
  }
  return baseInstance;
};

// 重置Base实例（用于测试）
export const resetBase = () => {
  baseInstance = null;
};

export default {
  getBase,
  resetBase
}; 