/**
 * 二维码生成工具
 * 使用在线API生成二维码，避免依赖问题
 */

/**
 * 生成二维码数据URL
 * @param {string} text - 要生成二维码的文本
 * @param {object} options - 配置选项
 * @returns {Promise<string>} 返回二维码的数据URL
 */
export async function generateQRCode(text, options = {}) {
  const {
    width = 256,
    height = 256,
    format = 'png',
    errorCorrectionLevel = 'M'
  } = options;

  try {
    // 方案1：使用 qr-server.com API
    const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${width}x${height}&data=${encodeURIComponent(text)}&format=${format}&ecc=${errorCorrectionLevel}`;
    
    // 创建一个图片元素来加载二维码
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        // 创建canvas来转换为数据URL
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = width;
        canvas.height = height;
        
        // 绘制白色背景
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        // 绘制二维码
        ctx.drawImage(img, 0, 0, width, height);
        
        // 转换为数据URL
        const dataUrl = canvas.toDataURL(`image/${format}`);
        resolve(dataUrl);
      };
      
      img.onerror = () => {
        // 如果在线API失败，使用备用方案
        console.warn('在线二维码API失败，使用备用方案');
        generateQRCodeFallback(text, options).then(resolve).catch(reject);
      };
      
      img.src = apiUrl;
    });
  } catch (error) {
    console.error('二维码生成失败:', error);
    // 使用备用方案
    return generateQRCodeFallback(text, options);
  }
}

/**
 * 备用二维码生成方案 - 使用简单的文本显示
 * @param {string} text - 要生成二维码的文本
 * @param {object} options - 配置选项
 * @returns {Promise<string>} 返回包含文本的数据URL
 */
async function generateQRCodeFallback(text, options = {}) {
  const { width = 256, height = 256 } = options;
  
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;
    
    // 绘制白色背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    // 绘制边框
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(5, 5, width - 10, height - 10);
    
    // 绘制提示文本
    ctx.fillStyle = '#000000';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 分行显示文本
    const lines = [
      '二维码生成失败',
      '请复制以下链接：',
      text.length > 30 ? text.substring(0, 30) + '...' : text
    ];
    
    lines.forEach((line, index) => {
      ctx.fillText(line, width / 2, height / 2 + (index - 1) * 20);
    });
    
    const dataUrl = canvas.toDataURL('image/png');
    resolve(dataUrl);
  });
}

/**
 * 简化版本的二维码生成（直接返回在线API URL）
 * @param {string} text - 要生成二维码的文本
 * @param {object} options - 配置选项
 * @returns {string} 返回二维码图片URL
 */
export function generateQRCodeUrl(text, options = {}) {
  const {
    width = 256,
    height = 256,
    format = 'png',
    errorCorrectionLevel = 'M'
  } = options;
  
  return `https://api.qrserver.com/v1/create-qr-code/?size=${width}x${height}&data=${encodeURIComponent(text)}&format=${format}&ecc=${errorCorrectionLevel}`;
} 