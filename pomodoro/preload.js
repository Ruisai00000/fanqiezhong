const { contextBridge, Notification } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  showNotification: (title, body) => {
    new Notification(title, { body });
  },
});
