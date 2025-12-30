import React, { useState } from 'react';

const CeleryArchitectureDemo = () => {
  const [activeComponent, setActiveComponent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [taskFlow, setTaskFlow] = useState([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const components = {
    client: {
      name: 'Django Client',
      description: 'Your Django application that creates tasks',
      color: 'bg-blue-500',
    },
    broker: {
      name: 'Message Broker', 
      description: 'RabbitMQ/Redis - Stores task messages',
      color: 'bg-purple-500',
    },
    worker: {
      name: 'Celery Worker',
      description: 'Background process that executes tasks',
      color: 'bg-green-500',
    },
    backend: {
      name: 'Result Backend',
      description: 'MongoDB/Redis - Stores task results',
      color: 'bg-orange-500',
    }
  };

  const simulateTaskFlow = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isSimulating) {
      return;
    }
    
    // Immediately show that something is happening
    setIsSimulating(true);
    setCurrentStep(0);
    setMessages([{ 
      component: 'system', 
      message: '🟡 Starting Celery task simulation...', 
      id: `start-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString()
    }]);
    setTaskFlow([]);
    setActiveComponent(null);
    
    // Add a small delay to ensure state updates
    setTimeout(() => {
      const steps = [
        { component: 'client', message: '🚀 Django creates task: send_email.delay()' },
        { component: 'broker', message: '📦 Task queued in message broker (RabbitMQ/Redis)' },
        { component: 'worker', message: '⚙️ Celery worker picks up the task' },
        { component: 'worker', message: '🔄 Worker executing the email task...' },
        { component: 'backend', message: '💾 Task result stored in backend' },
        { component: 'client', message: '✅ Task completed successfully!' }
      ];

      // console.log('📋 Processing steps:', steps);

      // Process each step with sequential updates
      steps.forEach((step, index) => {
        setTimeout(() => {
          // console.log(`⏱️ Step ${index + 1}/${steps.length}:`, step.message);
          
          setCurrentStep(prev => {
            return index + 1;
          });
          
          setActiveComponent(step.component);
          
           setTaskFlow(prev => {
            const newFlow = [...prev, step.component];
            return newFlow;
          });
          
          setMessages(prev => {
            const newMsg = { 
              ...step, 
              id: `step-${Date.now()}-${index}`,
              timestamp: new Date().toLocaleTimeString()
            };
            const newMessages = [...prev, newMsg];
            return newMessages;
          });
          
          // Complete simulation after last step
           if (index === steps.length - 1) {
            setTimeout(() => {
              setActiveComponent(null);
              setIsSimulating(false);
              setMessages(prev => [...prev, {
                component: 'system',
                message: '🟢 Simulation completed! Click Reset to try again.',
                id: `complete-${Date.now()}`,
                timestamp: new Date().toLocaleTimeString()
              }]);
            }, 1500);
          }
        }, (index + 1) * 800); // Slightly faster timing
      });
    }, 100); // Small delay to ensure immediate feedback shows
  };

  const handleComponentClick = (componentKey) => {
    setActiveComponent(activeComponent === componentKey ? null : componentKey);
  };

  const resetSimulation = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setMessages([]);
    setTaskFlow([]);
    setActiveComponent(null);
    setCurrentStep(0);
    setIsSimulating(false);
    
    // Add immediate feedback
    setTimeout(() => {
      setMessages([{
        component: 'system',
        message: '🔄 System reset. Ready for new simulation!',
        id: `reset-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString()
      }]);
    }, 100);
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 rounded-lg p-6 my-8 text-white">
      <h3 className="text-2xl font-bold mb-6 text-center text-yellow-400">
        🏗️ Interactive Celery Architecture
      </h3>
      
      {/* Component Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {Object.entries(components).map(([key, component]) => (
          <div
            key={key}
            className={`${component.color} p-4 rounded-lg cursor-pointer transition-all duration-500 text-center relative
                       ${activeComponent === key ? 'ring-4 ring-yellow-400 scale-105 shadow-2xl' : 'hover:scale-105 hover:shadow-lg'}
                       ${taskFlow.includes(key) ? 'animate-pulse' : ''}`}
            onClick={() => handleComponentClick(key)}
          >
            <div className="text-sm font-semibold text-white mb-2">{component.name}</div>
            
            {/* Active indicator */}
            {activeComponent === key && (
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-ping"></div>
            )}
            
            {/* Flow indicator */}
            {taskFlow.includes(key) && (
              <div className="absolute -top-1 -left-1 w-3 h-3 bg-green-400 rounded-full"></div>
            )}
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      {isSimulating && (
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-300 mb-2">
            <span>Task Flow Progress</span>
            <span>{currentStep}/6 steps</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-yellow-400 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${(currentStep / 6) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex justify-center gap-4 mb-6">
        <button 
          onClick={simulateTaskFlow}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.98)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
          disabled={isSimulating}
          className={`px-8 py-3 rounded-lg font-semibold text-lg transition-all transform select-none ${
            isSimulating 
              ? 'bg-gray-600 cursor-not-allowed text-gray-400' 
              : 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl hover:-translate-y-1 active:translate-y-0 cursor-pointer'
          }`}
          style={{ 
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none'
          }}
        >
          {isSimulating ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⏳</span> 
              Simulating... {currentStep}/6
            </span>
          ) : (
            '▶️ Simulate Task Flow'
          )}
        </button>
        
        <button 
          onClick={resetSimulation}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.98)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
          disabled={isSimulating}
          className={`px-6 py-3 rounded-lg font-semibold text-lg transition-all select-none ${
            isSimulating 
              ? 'bg-gray-500 cursor-not-allowed text-gray-400' 
              : 'bg-gray-600 hover:bg-gray-700 cursor-pointer'
          }`}
          style={{ 
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none'
          }}
        >
          🔄 Reset
        </button>
      </div>

      {/* Component Description */}
      {activeComponent && (
        <div className="bg-gray-800 rounded-lg p-4 mb-4 border-l-4 border-yellow-400">
          <h4 className="font-semibold text-yellow-400 text-lg">{components[activeComponent].name}</h4>
          <p className="text-gray-300 text-sm">{components[activeComponent].description}</p>
        </div>
      )}

      {/* Task Flow Log */}
      <div className="bg-black rounded-lg p-4 border border-gray-700">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-yellow-400 font-semibold">📋 Task Flow Log</h4>
          {messages.length > 0 && (
            <span className="text-sm text-gray-400">{messages.length} messages</span>
          )}
        </div>
        <div className="h-32 overflow-y-auto space-y-1">
          {messages.length === 0 ? (
            <div className="text-gray-500 italic text-sm">
              Click "Simulate Task Flow" to see how Celery processes tasks...
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="text-green-400 font-mono text-sm">
                <span className="text-gray-500">[{msg.timestamp}]</span> {msg.message}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-4 bg-blue-900/30 rounded-lg p-4 border-l-4 border-blue-400">
        <p className="text-sm text-blue-100">
          <strong>💡 How it works:</strong> Click on components above to learn about them, or click 
          "Simulate Task Flow" to watch a task travel from Django → Broker → Worker → Backend.
        </p>
      </div>
    </div>
  );
};

export default CeleryArchitectureDemo;
  