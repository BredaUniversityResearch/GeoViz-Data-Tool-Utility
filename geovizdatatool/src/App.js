import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle, AlertCircle, Settings, Play, FolderOpen, FileText, AlertTriangle, X } from 'lucide-react';

const GeoVizDataTool = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [validationResults, setValidationResults] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [outputFolder, setOutputFolder] = useState('');
  const [filePrefix, setFilePrefix] = useState('');
  const [processingLog, setProcessingLog] = useState([]);
  const [pythonAvailable, setPythonAvailable] = useState(null);
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [userInput, setUserInput] = useState('');
  
  // Configuration state
  const [scriptsPath, setScriptsPath] = useState('');
  const [pythonPath, setPythonPath] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  
  // Fragmentation parameters
  const [percentage, setPercentage] = useState(10);
  const [particleClass, setParticleClass] = useState('other');
  const [sizeClass, setSizeClass] = useState('medium');
  const [diameter, setDiameter] = useState(0.1);
  const [density, setDensity] = useState(1027);

  const consoleEndRef = React.useRef(null);

  const particleClasses = [
    { value: 'oil', label: 'Oil droplets' },
    { value: 'other', label: 'Generic particles' },
    { value: 'bubble', label: 'Gas bubbles' },
    { value: 'faecal_pellets', label: 'Marine snow' },
    { value: 'copepod', label: 'Zooplankton' },
    { value: 'diatom_chain', label: 'Phytoplankton' },
    { value: 'oily_gas', label: 'Oil-gas mixture' }
  ];

  const sizeClasses = ['small', 'medium', 'large'];

  useEffect(() => {
    const checkEnvironment = async () => {
      try {
        const pythonCheck = await window.electron.checkPython();
        setPythonAvailable(pythonCheck);
        
        if (pythonCheck.available) {
          setIsConfigured(true);
          addLog(`Python detected: ${pythonCheck.version}`, 'success');
          if (pythonCheck.path) {
            addLog(`Python path: ${pythonCheck.path}`, 'info');
          }
        } else {
          addLog('Please configure Python paths to continue.', 'warning');
        }
      } catch (error) {
        addLog(`Environment check failed: ${error.message}`, 'error');
      }
    };

    if (window.electron) {
      checkEnvironment();
    }
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (consoleEndRef.current) {
      const consoleContainer = consoleEndRef.current.parentElement;
      if (consoleContainer) {
        consoleContainer.scrollTop = consoleContainer.scrollHeight;
      }
    }
  }, [processingLog]);

  const handleSelectScriptsFolder = async () => {
    if (!window.electron) return;
    
    try {
      const result = await window.electron.selectPythonFolder();
      if (result.success) {
        setScriptsPath(result.path);
        addLog(`Scripts folder set: ${result.path}`, 'success');
        
        const venvPath = `${result.path}\\.venv\\Scripts\\python.exe`;
        setPythonPath(venvPath);
        addLog(`Auto-detected Python: ${venvPath}`, 'info');
        
        const pythonCheck = await window.electron.checkPython();
        setPythonAvailable(pythonCheck);
        
        if (pythonCheck.available) {
          setIsConfigured(true);
        }
      }
    } catch (error) {
      addLog(`Error selecting folder: ${error.message}`, 'error');
    }
  };

  const handleSelectPythonExe = async () => {
    if (!window.electron) return;
    
    try {
      const result = await window.electron.selectPythonExe();
      if (result.success) {
        setPythonPath(result.path);
        addLog(`Python executable set: ${result.path}`, 'success');
        
        const pythonCheck = await window.electron.checkPython();
        setPythonAvailable(pythonCheck);
        
        if (pythonCheck.available) {
          setIsConfigured(true);
        }
      }
    } catch (error) {
      addLog(`Error selecting Python: ${error.message}`, 'error');
    }
  };

  const handleFileSelect = async () => {
    if (!window.electron) {
      alert('Electron API not available');
      return;
    }

    try {
      const file = await window.electron.selectFile();
      if (file) {
        setSelectedFile(file);
        setValidationResults(null);
        setProcessingLog([]);
        setFilePrefix(file.name.replace('.nc', '_processed'));
        addLog(`File selected: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`, 'info');
      }
    } catch (error) {
      addLog(`Error selecting file: ${error.message}`, 'error');
    }
  };

  const handleFolderSelect = async () => {
    if (!window.electron) {
      alert('Electron API not available');
      return;
    }

    try {
      const folder = await window.electron.selectFolder();
      if (folder) {
        setOutputFolder(folder);
        addLog(`Output folder selected: ${folder}`, 'info');
      }
    } catch (error) {
      addLog(`Error selecting folder: ${error.message}`, 'error');
    }
  };

  const addLog = (message, type = 'info') => {
    setProcessingLog(prev => [...prev, { message, type, timestamp: new Date().toLocaleTimeString() }]);
    
    if (message.includes('Continue anyway? (y/n)') || 
        message.includes('? (y/n)') ||
        message.includes('[y/n]') ||
        message.includes('[default:')) {
      setWaitingForInput(true);
    }
  };

  const sendInput = async () => {
    if (!window.electron || !userInput.trim()) {
      return;
    }

    try {
      await window.electron.sendInput(userInput.trim());
      addLog(`> ${userInput.trim()}`, 'info');
      setUserInput('');
      setWaitingForInput(false);
    } catch (error) {
      addLog(`Error sending input: ${error.message}`, 'error');
    }
  };

  const handleInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendInput();
    }
  };

  const runValidation = async () => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    if (!window.electron) {
      alert('Electron API not available');
      return;
    }

    setIsValidating(true);
    addLog('Starting validation...', 'info');
    setValidationResults(null);

    try {
      window.electron.onValidationOutput((data) => {
        const lines = data.split('\n').filter(line => line.trim());
        lines.forEach(line => addLog(line, 'info'));
      });

      const result = await window.electron.runValidation(selectedFile.path);
      
      if (result.results) {
        setValidationResults(result.results);
      }
      
      if (result.code === 0) {
        if (result.results.hasAllRequired) {
          addLog('✓ Validation complete: All required variables present', 'success');
        } else {
          addLog(`⚠ Validation complete: Missing ${result.results.missing.length} variables`, 'warning');
        }
      } else if (result.code === 1) {
        if (result.results && result.results.missing && result.results.missing.length > 0) {
          addLog(`⚠ VALIDATION FAILED: ${result.results.missing.length} required variables missing`, 'warning');
          addLog('→ ACTION REQUIRED: Use "3. Process" to add missing variables', 'error');
        } else {
          addLog(`Validation completed with warnings (exit code ${result.code})`, 'warning');
        }
      } else {
        addLog(`Validation failed with exit code ${result.code}`, 'error');
        if (result.stderr) {
          addLog(result.stderr, 'error');
        }
      }
    } catch (error) {
      if (error.message && error.message.includes('cancelled')) {
        addLog('Validation cancelled by user', 'warning');
      } else {
        addLog(`Validation error: ${error.message}`, 'error');
      }
    } finally {
      setIsValidating(false);
      window.electron.removeValidationListener();
    }
  };

  const cancelOperation = async () => {
    if (!window.electron) {
      return;
    }

    try {
      await window.electron.cancelProcess();
      addLog('Process cancelled by user', 'warning');
      setIsValidating(false);
      setIsProcessing(false);
    } catch (error) {
      addLog(`Error cancelling process: ${error.message}`, 'error');
    }
  };

  const runFragmentation = async () => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    if (!outputFolder) {
      alert('Please select an output folder');
      return;
    }

    if (!window.electron) {
      alert('Electron API not available');
      return;
    }

    setIsProcessing(true);
    addLog('Starting fragmentation process...', 'info');

    const params = {
      inputFile: selectedFile.path,
      outputFolder: outputFolder,
      filePrefix: filePrefix,
      percentage: percentage,
      particleClass: particleClass,
      sizeClass: sizeClass,
      diameter: diameter,
      density: density
    };

    addLog(`Configuration:`, 'info');
    addLog(`  Output: ${outputFolder}/${filePrefix}`, 'info');
    addLog(`  Fragment size: ${percentage}%`, 'info');
    addLog(`  Particle: ${particleClass} (${sizeClass}, ${diameter}mm, ${density}kg/m³)`, 'info');

    try {
      window.electron.onProcessingOutput((data) => {
        const lines = data.split('\n').filter(line => line.trim());
        lines.forEach(line => addLog(line, 'info'));
      });

      const result = await window.electron.runCompatibility(params);
      
      if (result.code === 0) {
        addLog('✓ Fragmentation completed successfully!', 'success');
      } else {
        addLog(`Fragmentation failed with exit code ${result.code}`, 'error');
        if (result.stderr) {
          addLog(result.stderr, 'error');
        }
      }
    } catch (error) {
      if (error.message && error.message.includes('cancelled')) {
        addLog('Processing cancelled by user', 'warning');
      } else {
        addLog(`Processing error: ${error.message}`, 'error');
      }
    } finally {
      setIsProcessing(false);
      window.electron.removeProcessingListener();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-indigo-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-800">GeoViz Data Tool</h1>
              <p className="text-gray-600">
                Validate and process NetCDF particle tracking files for OpenDrift visualization
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - All Controls (1/3) */}
          <div className="lg:col-span-1 space-y-6">
            {/* Step 0: Configuration */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                0. Configure Python
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Python Scripts Folder
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={scriptsPath}
                      readOnly
                      placeholder="Select python-scripts folder..."
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50"
                    />
                    <button
                      onClick={handleSelectScriptsFolder}
                      className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1"
                    >
                      <FolderOpen className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Contains .venv, GeoViz_Validator.py, and GeoViz_Compatibility_Tool.py
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Python Executable
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={pythonPath}
                      readOnly
                      placeholder="Auto-detected from .venv"
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50"
                    />
                    <button
                      onClick={handleSelectPythonExe}
                      className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                    >
                      Manual
                    </button>
                  </div>
                </div>

                {pythonAvailable && (
                  <div className={`p-3 rounded-lg ${pythonAvailable.available ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <p className={`text-sm font-semibold ${pythonAvailable.available ? 'text-green-800' : 'text-red-800'}`}>
                      {pythonAvailable.available ? '✓ Python Ready' : '✗ Python Not Available'}
                    </p>
                    {pythonAvailable.version && (
                      <p className="text-xs text-green-700 mt-1">{pythonAvailable.version}</p>
                    )}
                    {pythonAvailable.error && (
                      <p className="text-xs text-red-700 mt-1">{pythonAvailable.error}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* File Upload */}
            <div className={`bg-white rounded-lg shadow-lg p-6 ${!isConfigured ? 'opacity-50 pointer-events-none' : ''}`}>
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5" />
                1. Select File
              </h2>
              
              <button
                onClick={handleFileSelect}
                className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 transition-colors focus:outline-none"
                disabled={!isConfigured}
              >
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 text-center">
                  {selectedFile ? selectedFile.name : 'Select NetCDF file'}
                </p>
              </button>

              {selectedFile && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg text-xs">
                  <p className="text-gray-700 truncate">
                    <span className="font-semibold">File:</span> {selectedFile.name}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-semibold">Size:</span> {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              )}
            </div>

            {/* Validation */}
            <div className={`bg-white rounded-lg shadow-lg p-6 ${!isConfigured ? 'opacity-50 pointer-events-none' : ''}`}>
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                2. Validate
              </h2>

              <button
                onClick={runValidation}
                disabled={!selectedFile || isValidating || !isConfigured}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isValidating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Validate Dataset
                  </>
                )}
              </button>

              {validationResults && (
                <div className="mt-4 space-y-3">
                  {validationResults.passed && validationResults.passed.length > 0 && (
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Passed ({validationResults.passed.length})
                      </p>
                      {validationResults.passed.slice(0, 2).map((item, i) => (
                        <p key={i} className="text-xs text-green-700">✓ {item}</p>
                      ))}
                      {validationResults.passed.length > 2 && (
                        <p className="text-xs text-green-600 mt-1">
                          +{validationResults.passed.length - 2} more checks passed
                        </p>
                      )}
                    </div>
                  )}

                  {validationResults.missing && validationResults.missing.length > 0 && (
                    <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-sm font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Missing Variables ({validationResults.missing.length})
                      </p>
                      {validationResults.missing.slice(0, 3).map((item, i) => (
                        <p key={i} className="text-xs text-yellow-700">⚠ {item}</p>
                      ))}
                      {validationResults.missing.length > 3 && (
                        <p className="text-xs text-yellow-600 mt-1">
                          +{validationResults.missing.length - 3} more missing
                        </p>
                      )}
                      <div className="mt-3 pt-3 border-t border-yellow-200 bg-red-50 -mx-3 -mb-3 px-3 py-3 rounded-b-lg border-2 border-red-300">
                        <p className="text-sm font-bold text-red-700 flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5" />
                          ACTION REQUIRED
                        </p>
                        <p className="text-xs text-red-700 mt-1 font-semibold">
                          Use "3. Process" below to add missing variables before visualization
                        </p>
                      </div>
                    </div>
                  )}

                  {validationResults.hasAllRequired && (
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm font-semibold text-green-800 flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4" />
                        Ready for Visualization!
                      </p>
                      <p className="text-xs text-green-700 mb-2">
                        All required variables are present in your dataset.
                      </p>
                      <div className="mt-2 pt-2 border-t border-green-200">
                        <p className="text-xs text-green-800 font-medium">
                          Optional: Use "3. Process" to fragment large files
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          Large files may be too slow to visualize. Create smaller fragments for better performance.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Compatibility Tool */}
            <div className={`bg-white rounded-lg shadow-lg p-6 ${!isConfigured ? 'opacity-50 pointer-events-none' : ''}`}>
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                3. Process
              </h2>

              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-800 font-medium mb-1">
                  When to use this tool:
                </p>
                <ul className="text-xs text-blue-700 space-y-1 ml-4 list-disc">
                  <li>Missing required variables (shown in validation)</li>
                  <li>File is too large for visualization (&gt;500MB)</li>
                  <li>Want to create smaller, manageable fragments</li>
                </ul>
              </div>

              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Output Folder
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={outputFolder}
                      readOnly
                      placeholder="Select folder..."
                      className="flex-1 px-2 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 truncate"
                    />
                    <button 
                      onClick={handleFolderSelect}
                      className="px-3 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 flex items-center gap-1"
                    >
                      <FolderOpen className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    File Prefix
                  </label>
                  <input
                    type="text"
                    value={filePrefix}
                    onChange={(e) => setFilePrefix(e.target.value)}
                    placeholder="output_file_name"
                    className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Fragment % (→ {Math.ceil(100/percentage)} fragments)
                  </label>
                  <input
                    type="number"
                    value={percentage}
                    onChange={(e) => setPercentage(Number(e.target.value))}
                    min="1"
                    max="100"
                    className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Particle Class
                  </label>
                  <select
                    value={particleClass}
                    onChange={(e) => setParticleClass(e.target.value)}
                    className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    {particleClasses.map(pc => (
                      <option key={pc.value} value={pc.value}>
                        {pc.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Size Class
                  </label>
                  <select
                    value={sizeClass}
                    onChange={(e) => setSizeClass(e.target.value)}
                    className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    {sizeClasses.map(sc => (
                      <option key={sc} value={sc}>{sc}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Diameter (mm)
                  </label>
                  <input
                    type="number"
                    value={diameter}
                    onChange={(e) => setDiameter(Number(e.target.value))}
                    step="0.001"
                    className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Density (kg/m³)
                  </label>
                  <input
                    type="number"
                    value={density}
                    onChange={(e) => setDensity(Number(e.target.value))}
                    className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              <button
                onClick={runFragmentation}
                disabled={!selectedFile || !outputFolder || isProcessing || !isConfigured}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Run Tool
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Panel - Console Log (2/3) */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6 lg:sticky lg:top-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Console Output</h2>
                
                {(isValidating || isProcessing) && (
                  <button
                    onClick={cancelOperation}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                )}
              </div>
              
              <div className="bg-gray-900 rounded-lg p-4 h-[calc(100vh-320px)] overflow-y-auto font-mono text-sm processing-log">
                {processingLog.length === 0 ? (
                  <p className="text-gray-500">No activity yet...</p>
                ) : (
                  <>
                    {processingLog.map((log, i) => (
                      <div key={i} className="mb-2">
                        <span className="text-gray-500">[{log.timestamp}]</span>{' '}
                        <span className={
                          log.type === 'success' ? 'text-green-400' :
                          log.type === 'warning' ? 'text-yellow-400' :
                          log.type === 'error' ? 'text-red-400' :
                          'text-gray-300'
                        }>
                          {log.message}
                        </span>
                      </div>
                    ))}
                    <div ref={consoleEndRef} />
                  </>
                )}
              </div>

              {waitingForInput && (isValidating || isProcessing) && (
                <div className="mt-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyPress={handleInputKeyPress}
                      placeholder="Enter response (y/n or value)..."
                      className="flex-1 px-3 py-2 bg-gray-800 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                      autoFocus
                    />
                    <button
                      onClick={sendInput}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                    >
                      Send
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Press Enter or click Send to respond to the prompt
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeoVizDataTool;