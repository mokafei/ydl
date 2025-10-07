const path = require("path");

// 让生产环境下的 Electron 能找到打包后的后端可执行文件
process.env.BACKEND_EXECUTABLE = path.join(process.resourcesPath, "ydl_backend.exe");

// 继续加载现有的主进程逻辑
require("../electron/main.js");