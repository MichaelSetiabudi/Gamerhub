// Debug utilities for development
export const DEBUG = process.env.NODE_ENV === 'development';

export const debugLog = (category: string, message: string, data?: any) => {
  if (!DEBUG) return;
  
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const emoji = getEmojiForCategory(category);
  
  console.log(`${emoji} [${timestamp}] ${category}: ${message}`, data || '');
};

const getEmojiForCategory = (category: string): string => {
  const emojiMap: Record<string, string> = {
    'socket': '🔌',
    'channel': '🏠',
    'message': '📨',
    'user': '👤',
    'auth': '🔐',
    'api': '🌐',
    'store': '🗃️',
    'error': '❌',
    'warning': '⚠️',
    'success': '✅',
    'info': 'ℹ️',
  };
  
  return emojiMap[category.toLowerCase()] || '📝';
};

export const debugError = (category: string, error: any, context?: string) => {
  if (!DEBUG) return;
  
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  console.error(`❌ [${timestamp}] ${category} ERROR${context ? ` (${context})` : ''}:`, error);
};

export const debugNetwork = (method: string, url: string, data?: any) => {
  if (!DEBUG) return;
  
  debugLog('api', `${method.toUpperCase()} ${url}`, data);
};

export const debugSocket = (event: string, data?: any) => {
  if (!DEBUG) return;
  
  debugLog('socket', `Event: ${event}`, data);
};
