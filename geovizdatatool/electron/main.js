const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let currentPythonProcess = null;
const isDev = !app.isPackaged;

// Store user-configured paths
let pythonScriptsPath = null;
let pythonExecutable = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    title: 'GeoViz Data Tool',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#f8fafc',
    show: false
  });

  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    const indexPath = path.join(app.getAppPath(), 'build', 'index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC: Select python-scripts folder
ipcMain.handle('select-python-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select python-scripts folder'
  });
  
  if (!result.canceled) {
    pythonScriptsPath = result.filePaths[0];
    
    // Auto-detect Python from .venv
    const venvPython = path.join(pythonScriptsPath, '.venv', 'Scripts', 'python.exe');
    if (fs.existsSync(venvPython)) {
      pythonExecutable = venvPython;
    }
    
    return { success: true, path: pythonScriptsPath };
  }
  return { success: false };
});

// IPC: Select Python executable
ipcMain.handle('select-python-exe', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    title: 'Select Python executable',
    filters: [
      { name: 'Python', extensions: ['exe'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (!result.canceled) {
    pythonExecutable = result.filePaths[0];
    return { success: true, path: pythonExecutable };
  }
  return { success: false };
});

// IPC: Select file dialog
ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'NetCDF Files', extensions: ['nc'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (result.canceled) return null;
  
  const filePath = result.filePaths[0];
  const stats = fs.statSync(filePath);
  
  return {
    path: filePath,
    name: path.basename(filePath),
    size: stats.size
  };
});

// IPC: Select folder dialog
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory']
  });
  
  return result.canceled ? null : result.filePaths[0];
});

// IPC: Check Python
ipcMain.handle('check-python', async () => {
  if (!pythonExecutable) {
    return { 
      available: false, 
      error: 'Python executable not configured. Please select it in Settings.' 
    };
  }
  
  return new Promise((resolve) => {
    const python = spawn(pythonExecutable, ['--version']);
    
    let output = '';
    python.stdout.on('data', (data) => { output += data.toString(); });
    python.stderr.on('data', (data) => { output += data.toString(); });
    
    python.on('close', (code) => {
      if (code === 0) {
        resolve({ available: true, version: output.trim(), path: pythonExecutable });
      } else {
        resolve({ available: false, error: 'Python check failed' });
      }
    });
    
    python.on('error', (err) => {
      resolve({ available: false, error: err.message });
    });
  });
});

// IPC: Check scripts
ipcMain.handle('check-scripts', async () => {
  if (!pythonScriptsPath) {
    return {
      scriptsPath: null,
      validatorExists: false,
      compatibilityExists: false,
      error: 'Scripts folder not configured. Please select it in Settings.'
    };
  }
  
  const validator = path.join(pythonScriptsPath, 'GeoViz_Validator.py');
  const compatibility = path.join(pythonScriptsPath, 'GeoViz_Compatibility_Tool.py');
  
  return {
    scriptsPath: pythonScriptsPath,
    validatorExists: fs.existsSync(validator),
    compatibilityExists: fs.existsSync(compatibility)
  };
});

// IPC: Run validation script
ipcMain.handle('run-validation', async (event, filePath) => {
  if (!pythonScriptsPath || !pythonExecutable) {
    return { 
      code: -1, 
      stdout: '', 
      stderr: 'Python not configured. Please configure in Settings.' 
    };
  }

  const scriptPath = path.join(pythonScriptsPath, 'GeoViz_Validator.py');
  
  console.log('=== Running Validation ===');
  console.log('Python executable:', pythonExecutable);
  console.log('Script path:', scriptPath);
  console.log('File to validate:', filePath);
  
  return new Promise((resolve, reject) => {
    const env = { 
      ...process.env,
      PYTHONIOENCODING: 'utf-8',
      PYTHONUTF8: '1',
      PYTHONUNBUFFERED: '1'
    };
    
    currentPythonProcess = spawn(pythonExecutable, [scriptPath, filePath], {
      cwd: pythonScriptsPath,
      env: env
    });
    
    let stdout = '';
    let stderr = '';
    
    currentPythonProcess.stdout.on('data', (data) => {
      const text = data.toString('utf8');
      stdout += text;
      event.sender.send('validation-output', text);
    });
    
    currentPythonProcess.stderr.on('data', (data) => {
      const text = data.toString('utf8');
      stderr += text;
      event.sender.send('validation-output', text);
    });
    
    currentPythonProcess.on('close', (code) => {
      currentPythonProcess = null;
      const results = parseValidationOutput(stdout);
      resolve({ code, stdout, stderr, results });
    });
    
    currentPythonProcess.on('error', (err) => {
      currentPythonProcess = null;
      reject({ error: err.message });
    });
  });
});

// IPC: Run compatibility tool script
ipcMain.handle('run-compatibility', async (event, params) => {
  if (!pythonScriptsPath || !pythonExecutable) {
    return { 
      code: -1, 
      stdout: '', 
      stderr: 'Python not configured. Please configure in Settings.' 
    };
  }

  const scriptPath = path.join(pythonScriptsPath, 'GeoViz_Compatibility_Tool.py');
  const outputPrefix = path.join(params.outputFolder, params.filePrefix);
  
  const args = [
    scriptPath,
    params.inputFile,
    params.percentage.toString(),
    outputPrefix,
    params.particleClass,
    params.sizeClass,
    params.diameter.toString(),
    params.density.toString()
  ];
  
  return new Promise((resolve, reject) => {
    const env = { 
      ...process.env,
      PYTHONIOENCODING: 'utf-8',
      PYTHONUTF8: '1',
      PYTHONUNBUFFERED: '1'
    };
    
    currentPythonProcess = spawn(pythonExecutable, args, {
      cwd: pythonScriptsPath,
      env: env
    });
    
    let stdout = '';
    let stderr = '';
    
    currentPythonProcess.stdout.on('data', (data) => {
      const text = data.toString('utf8');
      stdout += text;
      event.sender.send('processing-output', text);
    });
    
    currentPythonProcess.stderr.on('data', (data) => {
      const text = data.toString('utf8');
      stderr += text;
      event.sender.send('processing-output', text);
    });
    
    currentPythonProcess.on('close', (code) => {
      currentPythonProcess = null;
      resolve({ code, stdout, stderr });
    });
    
    currentPythonProcess.on('error', (err) => {
      currentPythonProcess = null;
      reject({ error: err.message });
    });
  });
});

// IPC: Cancel current Python process
ipcMain.handle('cancel-process', async () => {
  if (currentPythonProcess) {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', currentPythonProcess.pid, '/f', '/t']);
    } else {
      currentPythonProcess.kill('SIGTERM');
    }
    
    currentPythonProcess = null;
    return { cancelled: true };
  }
  return { cancelled: false };
});

// IPC: Send input to Python process
ipcMain.handle('send-input', async (event, input) => {
  if (currentPythonProcess && currentPythonProcess.stdin) {
    try {
      currentPythonProcess.stdin.write(input + '\n');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: 'No active process' };
});

// Helper function to parse validation output
function parseValidationOutput(output) {
  const results = {
    isValid: false,
    hasAllRequired: false,
    errors: [],
    warnings: [],
    missing: [],
    passed: [],
    info: []
  };
  
  const lines = output.split('\n');
  let inSummarySection = false;
  
  const missingSet = new Set();
  const passedSet = new Set();
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.includes('VALIDATION SUMMARY')) {
      inSummarySection = true;
      continue;
    }
    
    if (inSummarySection) {
      if (trimmed.startsWith('✓') && !trimmed.includes('Passed Checks')) {
        passedSet.add(trimmed.replace(/^✓\s*/, ''));
      } 
      else if (trimmed.includes('MISSING:')) {
        const match = trimmed.match(/MISSING:\s*(.+)/);
        if (match) {
          missingSet.add(match[1].trim());
        }
      }
      else if (trimmed.startsWith('ℹ️') || trimmed.includes('INFO:')) {
        results.info.push(trimmed);
      }
    }
  }
  
  results.passed = Array.from(passedSet);
  results.missing = Array.from(missingSet);
  
  if (output.includes('Dataset passed all checks')) {
    results.isValid = true;
    results.hasAllRequired = true;
  } else if (output.includes('Required Variables are Missing')) {
    results.isValid = true;
    results.hasAllRequired = false;
  } else if (output.includes('critical errors')) {
    results.isValid = false;
    results.hasAllRequired = false;
  }
  
  return results;
}