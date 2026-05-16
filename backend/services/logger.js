/**
 * Logger Service
 * المرجع: init_logging() L42-61, log_msg() L64-75 في youtube_downloader.sh
 * نظام سجلات مشابه للسكربت الأصلي
 */

const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.join(__dirname, '..', 'logs');

// إنشاء مجلد السجلات
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

function getTimestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function getSessionId() {
  const now = new Date();
  const dateStr = now.toISOString().replace(/[-:T]/g, '').substring(0, 14);
  return `${dateStr}_${process.pid}`;
}

const SESSION_ID = getSessionId();
const SESSION_LOG = path.join(LOGS_DIR, `session_${SESSION_ID}.log`);

// كتابة هيدر الجلسة - المرجع: init_logging() L48-60
const header = `================================================================
  Multi-Platform Video Downloader - Server Session Log
================================================================
  Session ID  : ${SESSION_ID}
  Started At  : ${getTimestamp()}
  Node.js     : ${process.version}
  Platform    : ${process.platform}
  Working Dir : ${process.cwd()}
================================================================

`;

fs.writeFileSync(SESSION_LOG, header);

/**
 * كتابة في السجل - المرجع: log_msg() L64-70
 */
function logMsg(level, message) {
  const line = `[${getTimestamp()}] [${level}] ${message}\n`;
  fs.appendFileSync(SESSION_LOG, line);

  // طباعة في console أيضاً
  const colors = {
    INFO: '\x1b[36m',
    WARN: '\x1b[33m',
    ERROR: '\x1b[31m',
    SUCCESS: '\x1b[32m',
  };
  const color = colors[level] || '\x1b[0m';
  console.log(`${color}[${level}]\x1b[0m ${message}`);
}

function logInfo(msg) { logMsg('INFO', msg); }
function logWarn(msg) { logMsg('WARN', msg); }
function logError(msg) { logMsg('ERROR', msg); }
function logSuccess(msg) { logMsg('SUCCESS', msg); }

/**
 * إنشاء سجل مهمة - المرجع: run_ytdlp_with_logging() L536-557
 */
function createTaskLog(taskInfo) {
  const taskId = `task_${SESSION_ID}_${Date.now()}`;
  const taskLogPath = path.join(LOGS_DIR, `${taskId}.log`);

  const taskHeader = `================================================================
  Task Log - ${getTimestamp()}
================================================================
Platform : ${taskInfo.platform || 'Unknown'}
Type     : ${taskInfo.type || 'Unknown'}
Quality  : ${taskInfo.quality || 'N/A'}
Subs     : ${taskInfo.subtitles || 'none'}
URL      : ${taskInfo.url || 'N/A'}
================================================================

`;

  fs.writeFileSync(taskLogPath, taskHeader);
  return { taskId, taskLogPath };
}

function appendToTaskLog(taskLogPath, content) {
  fs.appendFileSync(taskLogPath, content + '\n');
}

/**
 * إدارة السجلات - المرجع: mode_logs_manager() L1051-1137
 */
function getLogsList() {
  if (!fs.existsSync(LOGS_DIR)) return [];
  return fs.readdirSync(LOGS_DIR)
    .filter(f => f.endsWith('.log'))
    .map(f => {
      const stats = fs.statSync(path.join(LOGS_DIR, f));
      return {
        name: f,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
      };
    })
    .sort((a, b) => b.modified - a.modified);
}

function getLogContent(filename) {
  const filePath = path.join(LOGS_DIR, filename);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf-8');
}

function deleteOldLogs(daysOld = 7) {
  const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
  let deleted = 0;
  const files = fs.readdirSync(LOGS_DIR);
  for (const f of files) {
    const filePath = path.join(LOGS_DIR, f);
    const stats = fs.statSync(filePath);
    if (stats.mtime.getTime() < cutoff) {
      fs.unlinkSync(filePath);
      deleted++;
    }
  }
  return deleted;
}

function deleteAllLogs() {
  const files = fs.readdirSync(LOGS_DIR);
  for (const f of files) {
    fs.unlinkSync(path.join(LOGS_DIR, f));
  }
  return files.length;
}

module.exports = {
  logInfo, logWarn, logError, logSuccess,
  createTaskLog, appendToTaskLog,
  getLogsList, getLogContent, deleteOldLogs, deleteAllLogs,
  LOGS_DIR, SESSION_LOG,
};
