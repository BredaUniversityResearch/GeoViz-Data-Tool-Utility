const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // File and folder selection
  selectFile: () => ipcRenderer.invoke('select-file'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectPythonFolder: () => ipcRenderer.invoke('select-python-folder'),
  selectPythonExe: () => ipcRenderer.invoke('select-python-exe'),
  
  // Python and scripts checking
  checkPython: () => ipcRenderer.invoke('check-python'),
  checkScripts: () => ipcRenderer.invoke('check-scripts'),
  
  // Processing
  runValidation: (filePath) => ipcRenderer.invoke('run-validation', filePath),
  runCompatibility: (params) => ipcRenderer.invoke('run-compatibility', params),
  cancelProcess: () => ipcRenderer.invoke('cancel-process'),
  sendInput: (input) => ipcRenderer.invoke('send-input', input),
  
  // Output listeners
  onValidationOutput: (callback) => {
    ipcRenderer.on('validation-output', (event, data) => callback(data));
  },
  removeValidationListener: () => {
    ipcRenderer.removeAllListeners('validation-output');
  },
  onProcessingOutput: (callback) => {
    ipcRenderer.on('processing-output', (event, data) => callback(data));
  },
  removeProcessingListener: () => {
    ipcRenderer.removeAllListeners('processing-output');
  }
});