import React, { useState, useEffect } from 'react';

const CeleryBeatDemo = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [scheduledTasks, setScheduledTasks] = useState([]);
  const [executedTasks, setExecutedTasks] = useState([]);
  const [beatLog, setBeatLog] = useState([]);

  const taskSchedules = [
    {
      id: 'greet_user',
      name: 'Greet User',
      schedule: 'Every 10 seconds',
      cron: '*/10 * * * * *',
      nextRun: null,
      color: 'bg-blue-500',
      icon: '👋'
    },
    {
      id: 'cleanup_logs',
      name: 'Cleanup Logs',
      schedule: 'Every 30 seconds',
      cron: '*/30 * * * * *',
      nextRun: null,
      color: 'bg-green-500',
      icon: '🧹'
    },
    {
      id: 'send_report',
      name: 'Daily Report',
      schedule: 'Every minute (demo)',
      cron: '0 * * * * *',
      nextRun: null,
      color: 'bg-purple-500',
      icon: '📊'
    }
  ];

  const addBeatLog = (message, type = 'info') => {
    setBeatLog(prev => [...prev.slice(-10), {
      message,
      type,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const calculateNextRun = (cronPattern) => {
    const now = new Date();
    const next = new Date(now);
    
    if (cronPattern === '*/10 * * * * *') {
      next.setSeconds(Math.ceil(now.getSeconds() / 10) * 10, 0);
    } else if (cronPattern === '*/30 * * * * *') {
      next.setSeconds(Math.ceil(now.getSeconds() / 30) * 30, 0);
    } else if (cronPattern === '0 * * * * *') {
      next.setSeconds(0, 0);
      next.setMinutes(next.getMinutes() + 1);
    }
    
    return next;
  };

  const executeTask = (task) => {
    addBeatLog(`🚀 Executing: ${task.name}`, 'info');
    
    setExecutedTasks(prev => [...prev, {
      ...task,
      executedAt: new Date(),
      id: `${task.id}_${Date.now()}`
    }]);

    // Simulate task execution
    setTimeout(() => {
      addBeatLog(`✅ Completed: ${task.name}`, 'success');
    }, 1000);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      
      if (isRunning) {
        const now = new Date();
        
        taskSchedules.forEach(task => {
          const shouldExecute = 
            (task.cron === '*/10 * * * * *' && now.getSeconds() % 10 === 0) ||
            (task.cron === '*/30 * * * * *' && now.getSeconds() % 30 === 0) ||
            (task.cron === '0 * * * * *' && now.getSeconds() === 0);
          
          if (shouldExecute && now.getMilliseconds() < 100) {
            executeTask(task);
          }
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    // Update next run times
    const updatedTasks = taskSchedules.map(task => ({
      ...task,
      nextRun: calculateNextRun(task.cron)
    }));
    setScheduledTasks(updatedTasks);
  }, [currentTime]);

  const startBeat = () => {
    setIsRunning(true);
    setBeatLog([]);
    setExecutedTasks([]);
    addBeatLog('🎵 Celery Beat started - Scheduler is running', 'success');
  };

  const stopBeat = () => {
    setIsRunning(false);
    addBeatLog('⏹️ Celery Beat stopped', 'warning');
  };

  const getTimeUntilNext = (nextRun) => {
    if (!nextRun) return '';
    const diff = nextRun - currentTime;
    if (diff < 0) return 'Now';
    return `${Math.ceil(diff / 1000)}s`;
  };

  return (
    <div className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 rounded-xl p-4 sm:p-6 my-8 text-white">
      <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-center">
        🎵 Celery Beat Scheduler Demo
      </h3>

      {/* Current Time & Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 sm:mb-6">
        <div className="bg-black/30 rounded-lg p-3 sm:p-4 text-center">
          <h4 className="font-semibold mb-2 text-yellow-400 text-sm sm:text-base">Current Time</h4>
          <div className="text-lg sm:text-2xl font-mono font-bold">
            {currentTime.toLocaleTimeString()}
          </div>
        </div>
        
        <div className="bg-black/30 rounded-lg p-3 sm:p-4 text-center">
          <h4 className="font-semibold mb-2 text-yellow-400 text-sm sm:text-base">Beat Status</h4>
          <div className={`inline-block px-3 py-1 sm:px-4 sm:py-2 rounded-full font-semibold text-sm sm:text-base ${
            isRunning ? 'bg-green-500 animate-pulse' : 'bg-red-500'
          }`}>
            {isRunning ? '🎵 Running' : '⏸️ Stopped'}
          </div>
        </div>
      </div>

      {/* Control Button */}
      <div className="text-center mb-4 sm:mb-6">
        <button
          onClick={isRunning ? stopBeat : startBeat}
          className={`px-6 py-2 sm:px-8 sm:py-3 rounded-lg font-bold text-base sm:text-lg transition-all w-full sm:w-auto ${
            isRunning 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-green-600 hover:bg-green-700'
          } shadow-lg`}
        >
          {isRunning ? '⏹️ Stop Beat' : '▶ Start Beat Scheduler'}
        </button>
      </div>

      {/* Scheduled Tasks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 sm:mb-6">
        {scheduledTasks.map(task => (
          <div key={task.id} className="bg-black/30 rounded-lg p-3 sm:p-4">
            <div className="flex items-center mb-2">
              <span className="text-xl sm:text-2xl mr-2">{task.icon}</span>
              <h4 className="font-semibold text-yellow-400 text-sm sm:text-base">{task.name}</h4>
            </div>
            <div className="text-xs sm:text-sm space-y-1">
              <div className="text-gray-300">
                <strong>Schedule:</strong> {task.schedule}
              </div>
              <div className="text-gray-300 break-all">
                <strong>Cron:</strong> <code className="bg-black/50 px-1 rounded text-xs">{task.cron}</code>
              </div>
              {isRunning && (
                <div className="text-green-400 font-semibold">
                  <strong>Next in:</strong> {getTimeUntilNext(task.nextRun)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Executions */}
      {executedTasks.length > 0 && (
        <div className="bg-black/30 rounded-lg p-3 sm:p-4 mb-4">
          <h4 className="font-semibold mb-3 text-yellow-400 text-sm sm:text-base">🏃‍♂️ Recent Executions</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {executedTasks.slice(-5).reverse().map(task => (
              <div key={task.id} className="flex items-center justify-between text-xs sm:text-sm">
                <div className="flex items-center min-w-0 flex-1">
                  <span className="mr-2 flex-shrink-0">{task.icon}</span>
                  <span className="truncate">{task.name}</span>
                </div>
                <span className="text-gray-400 font-mono text-xs ml-2 flex-shrink-0">
                  {task.executedAt.toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Beat Log */}
      <div className="bg-black rounded-lg p-3 sm:p-4">
        <h4 className="font-semibold mb-2 text-yellow-400 text-sm sm:text-base">📋 Beat Scheduler Log</h4>
        <div className="h-32 overflow-y-auto space-y-1 text-xs sm:text-sm font-mono">
          {beatLog.map((log, index) => (
            <div key={index} className={`${
              log.type === 'success' ? 'text-green-400' :
              log.type === 'warning' ? 'text-yellow-400' :
              'text-gray-300'
            }`}>
              <span className="text-gray-500">[{log.timestamp}]</span> <span className="break-words">{log.message}</span>
            </div>
          ))}
          {beatLog.length === 0 && (
            <div className="text-gray-500 italic text-xs sm:text-sm">
              Click "Start Beat Scheduler" to begin periodic task scheduling...
            </div>
          )}
        </div>
      </div>

      {/* Explanation */}
      <div className="mt-4 bg-blue-900/30 rounded-lg p-3 sm:p-4 border-l-4 border-blue-400">
        <p className="text-xs sm:text-sm text-blue-100">
          <strong>💡 How it works:</strong> Celery Beat acts as a scheduler that reads your 
          CELERY_BEAT_SCHEDULE configuration and sends tasks to the message broker at the 
          specified times. The workers then pick up and execute these tasks.
        </p>
      </div>
    </div>
  );
};

export default CeleryBeatDemo;
