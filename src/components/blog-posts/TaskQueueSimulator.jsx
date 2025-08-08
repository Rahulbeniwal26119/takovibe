import React, { useState, useEffect } from 'react';

const TaskQueueSimulator = () => {
  const [mode, setMode] = useState('sync');
  const [isRunning, setIsRunning] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [mainThreadStatus, setMainThreadStatus] = useState('idle');
  const [completedTasks, setCompletedTasks] = useState(0);

  const addLog = (message, type = 'info') => {
    setLogs(prev => [...prev, { 
      message, 
      type, 
      timestamp: new Date().toLocaleTimeString() 
    }]);
  };

  const runSynchronousDemo = async () => {
    setIsRunning(true);
    setMainThreadStatus('busy');
    setLogs([]);
    setCompletedTasks(0);
    
    addLog('🚀 Starting synchronous task execution', 'info');
    addLog('⚠️ Main thread is BLOCKED', 'warning');
    
    for (let i = 1; i <= 3; i++) {
      addLog(`📧 Sending email ${i}...`, 'info');
      
      // Simulate blocking operation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      addLog(`✅ Email ${i} sent successfully`, 'success');
      setCompletedTasks(i);
    }
    
    setMainThreadStatus('idle');
    addLog('✨ All tasks completed - Main thread free', 'success');
    setIsRunning(false);
  };

  const runAsynchronousDemo = async () => {
    setIsRunning(true);
    setMainThreadStatus('idle');
    setLogs([]);
    setCompletedTasks(0);
    setTasks([]);
    
    addLog('🚀 Starting asynchronous task execution', 'info');
    addLog('✨ Main thread remains FREE', 'success');
    
    // Queue tasks immediately
    const taskPromises = [];
    for (let i = 1; i <= 3; i++) {
      addLog(`📤 Queuing email task ${i}`, 'info');
      setTasks(prev => [...prev, { id: i, status: 'queued' }]);
      
      const taskPromise = new Promise(resolve => {
        setTimeout(() => {
          setTasks(prev => prev.map(task => 
            task.id === i ? { ...task, status: 'processing' } : task
          ));
          addLog(`⚙️ Worker processing email ${i}`, 'info');
          
          setTimeout(() => {
            setTasks(prev => prev.map(task => 
              task.id === i ? { ...task, status: 'completed' } : task
            ));
            addLog(`✅ Email ${i} completed by worker`, 'success');
            setCompletedTasks(prev => prev + 1);
            resolve();
          }, 1500);
        }, i * 500); // Stagger the processing
      });
      
      taskPromises.push(taskPromise);
    }
    
    addLog('🎯 All tasks queued - Main thread continues working!', 'success');
    
    await Promise.all(taskPromises);
    addLog('🎉 All async tasks completed!', 'success');
    setIsRunning(false);
  };

  const TaskCard = ({ task }) => {
    const statusColors = {
      queued: 'bg-yellow-500',
      processing: 'bg-blue-500 animate-pulse',
      completed: 'bg-green-500'
    };
    
    const statusIcons = {
      queued: '⏳',
      processing: '⚙️',
      completed: '✅'
    };
    
    return (
      <div className={`${statusColors[task.status]} text-white p-2 rounded-lg text-sm font-semibold`}>
        {statusIcons[task.status]} Task {task.id}
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-blue-900 to-purple-900 rounded-xl p-6 my-8 text-white">
      <h3 className="text-2xl font-bold mb-6 text-center">
        🔄 Synchronous vs Asynchronous Task Demo
      </h3>
      
      {/* Mode Selection */}
      <div className="flex justify-center mb-6 space-x-4">
        <button
          onClick={() => setMode('sync')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            mode === 'sync' 
              ? 'bg-red-600 text-white shadow-lg' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          🐌 Synchronous Mode
        </button>
        <button
          onClick={() => setMode('async')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            mode === 'async' 
              ? 'bg-green-600 text-white shadow-lg' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          ⚡ Asynchronous Mode
        </button>
      </div>

      {/* Status Panel */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="bg-black/30 rounded-lg p-4">
          <h4 className="font-semibold mb-2 text-yellow-400">Main Thread Status</h4>
          <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
            mainThreadStatus === 'idle' ? 'bg-green-500' : 'bg-red-500'
          }`}>
            {mainThreadStatus === 'idle' ? '✅ Available' : '🔒 Blocked'}
          </div>
        </div>
        
        <div className="bg-black/30 rounded-lg p-4">
          <h4 className="font-semibold mb-2 text-yellow-400">Completed Tasks</h4>
          <div className="text-2xl font-bold text-green-400">
            {completedTasks} / 3
          </div>
        </div>
      </div>

      {/* Task Queue Visualization (Async mode only) */}
      {mode === 'async' && tasks.length > 0 && (
        <div className="bg-black/30 rounded-lg p-4 mb-6">
          <h4 className="font-semibold mb-3 text-yellow-400">Task Queue</h4>
          <div className="flex space-x-2">
            {tasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}

      {/* Control Button */}
      <div className="text-center mb-6">
        <button
          onClick={mode === 'sync' ? runSynchronousDemo : runAsynchronousDemo}
          disabled={isRunning}
          className={`px-8 py-4 rounded-lg font-bold text-lg transition-all ${
            isRunning
              ? 'bg-gray-600 cursor-not-allowed'
              : mode === 'sync'
              ? 'bg-red-600 hover:bg-red-700 shadow-lg'
              : 'bg-green-600 hover:bg-green-700 shadow-lg'
          }`}
        >
          {isRunning ? '⏳ Running...' : `▶ Run ${mode === 'sync' ? 'Synchronous' : 'Asynchronous'} Demo`}
        </button>
      </div>

      {/* Mode Explanation */}
      <div className="bg-black/30 rounded-lg p-4 mb-4">
        <h4 className="font-semibold mb-2 text-yellow-400">
          {mode === 'sync' ? '🐌 Synchronous Mode' : '⚡ Asynchronous Mode'}
        </h4>
        <p className="text-sm text-gray-300">
          {mode === 'sync' 
            ? 'Tasks run one after another, blocking the main thread. Your web application would be unresponsive during task execution.'
            : 'Tasks are queued immediately and processed by background workers. The main thread remains free to handle other requests.'
          }
        </p>
      </div>

      {/* Log Output */}
      <div className="bg-black rounded-lg p-4">
        <h4 className="font-semibold mb-2 text-yellow-400">📋 Execution Log</h4>
        <div className="h-40 overflow-y-auto space-y-1 text-sm font-mono">
          {logs.map((log, index) => (
            <div key={index} className={`${
              log.type === 'success' ? 'text-green-400' :
              log.type === 'warning' ? 'text-yellow-400' :
              log.type === 'error' ? 'text-red-400' :
              'text-gray-300'
            }`}>
              <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-gray-500 italic">
              Click the demo button to see the execution logs...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskQueueSimulator;
