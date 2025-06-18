/**
 * @Version    : v1.00
 * @Author     : Amon
 * @Date       : 20245-05-06
 * @desc       : 模拟认证相关的服务 - 已禁用
 */

/**
 * 安全的Base64编码，支持Unicode字符
 * @param {string} str 要编码的字符串
 * @returns {string} Base64编码字符串
 */
function safeBase64Encode(str) {
  // 将字符串转换为UTF-8编码的字节数组，然后再进行Base64编码
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
    return String.fromCharCode('0x' + p1);
  }));
}

/**
 * 安全的Base64解码，支持Unicode字符
 * @param {string} str Base64编码字符串
 * @returns {string} 解码后的字符串
 */
function safeBase64Decode(str) {
  try {
    // 解码Base64，然后将字节数组转换为UTF-8字符串
    return decodeURIComponent(
      atob(str).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join('')
    );
  } catch (e) {
    console.error('Base64解码失败:', e);
    return '';
  }
}

/**
 * 模拟登录 - 已禁用
 */
export const mockLogin = () => {
  console.warn('模拟登录功能已禁用，请使用真实的飞书认证');
  throw new Error('模拟登录功能已禁用');
};

/**
 * 验证模拟令牌 - 已禁用
 */
export function verifyMockToken() {
  console.warn('模拟令牌验证功能已禁用，请使用真实的飞书认证');
  return null;
}

/**
 * 生成模拟JWT令牌 - 已禁用
 */
export function generateMockToken() {
  console.warn('模拟令牌生成功能已禁用，请使用真实的飞书认证');
  throw new Error('模拟令牌生成功能已禁用');
} 