const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('licenseAPI', {
  get: () => ipcRenderer.invoke('license:get'),
  save: (envelope) => ipcRenderer.invoke('license:save', envelope),
  clear: () => ipcRenderer.invoke('license:clear'),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
});
