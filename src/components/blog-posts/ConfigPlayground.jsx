import React, { useState } from 'react';

const ConfigPlayground = () => {
  const [config, setConfig] = useState({
    broker: 'rabbitmq',
    resultBackend: 'mongodb',
    serializer: 'pickle',
    timezone: 'Asia/Kolkata',
    cacheBackend: 'redis'
  });

  const [customValues, setCustomValues] = useState({
    rabbitmqUrl: 'amqp://guest:guest@localhost:5672//',
    redisUrl: 'redis://localhost:6379',
    mongoUrl: 'mongodb://localhost:27017/celery-results',
    postgresUrl: 'postgresql://user:pass@localhost/celery'
  });

  const brokerOptions = {
    rabbitmq: {
      name: 'RabbitMQ',
      description: 'Most reliable, supports all features',
      url: customValues.rabbitmqUrl,
      pros: ['Most reliable', 'Feature complete', 'High performance'],
      cons: ['Requires separate installation', 'More memory usage']
    },
    redis: {
      name: 'Redis',
      description: 'Fast, simple setup',
      url: `${customValues.redisUrl}/0`,
      pros: ['Fast', 'Easy to setup', 'Can also be result backend'],
      cons: ['Less durable than RabbitMQ', 'Memory-based']
    }
  };

  const backendOptions = {
    redis: {
      name: 'Redis',
      description: 'Fast key-value store',
      url: `${customValues.redisUrl}/1`,
      pros: ['Very fast', 'Simple setup', 'Good for caching'],
      cons: ['Memory-based', 'Less persistent']
    },
    mongodb: {
      name: 'MongoDB',
      description: 'Document database',
      url: customValues.mongoUrl,
      pros: ['Persistent', 'Rich queries', 'Scalable'],
      cons: ['Requires MongoDB installation', 'Larger overhead']
    },
    postgresql: {
      name: 'PostgreSQL',
      description: 'Relational database',
      url: customValues.postgresUrl,
      pros: ['ACID compliance', 'Rich queries', 'Very reliable'],
      cons: ['Slower for simple operations', 'Database overhead']
    }
  };

  const generateConfig = () => {
    const broker = brokerOptions[config.broker];
    const backend = backendOptions[config.resultBackend];
    
    return `# django_revision/celeryconfig.py

# Message broker configuration - using ${broker.name}
broker_url = "${broker.url}"

# Result backend configuration - using ${backend.name}
result_backend = "${backend.url}"

# Serialization settings
task_serializer = "${config.serializer}"

# Timezone configuration  
timezone = "${config.timezone}"

# Cache backend configuration
cache_backend = "${customValues.redisUrl}/2"

# Task discovery configuration
include = ["django_revision.tasks"]

# Content type configuration
accept_content = ["${config.serializer}"]`;
  };

  const ConfigOption = ({ title, value, options, onChange, description }) => (
    <div className="bg-gray-800 rounded-lg p-4">
      <h4 className="font-semibold text-yellow-400 mb-2">{title}</h4>
      <select
        value={value}
        onChange={onChange}
        className="w-full bg-gray-700 text-white rounded px-3 py-2 mb-2"
      >
        {Object.entries(options).map(([key, option]) => (
          <option key={key} value={key}>
            {option.name}
          </option>
        ))}
      </select>
      <p className="text-sm text-gray-300 mb-2">{description}</p>
      {options[value] && (
        <div className="text-xs">
          <div className="text-green-400 mb-1">
            <strong>Pros:</strong> {options[value].pros?.join(', ')}
          </div>
          <div className="text-red-400">
            <strong>Cons:</strong> {options[value].cons?.join(', ')}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-gradient-to-br from-gray-900 to-blue-900 rounded-xl p-6 my-8 text-white">
      <h3 className="text-2xl font-bold mb-6 text-center">
        ⚙️ Celery Configuration Playground
      </h3>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-yellow-400">Configuration Options</h4>
          
          <ConfigOption
            title="Message Broker"
            value={config.broker}
            options={brokerOptions}
            onChange={(e) => setConfig(prev => ({ ...prev, broker: e.target.value }))}
            description="Handles message queuing between Django and workers"
          />

          <ConfigOption
            title="Result Backend"
            value={config.resultBackend}
            options={backendOptions}
            onChange={(e) => setConfig(prev => ({ ...prev, resultBackend: e.target.value }))}
            description="Stores task results for later retrieval"
          />

          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-400 mb-2">Task Serializer</h4>
            <select
              value={config.serializer}
              onChange={(e) => setConfig(prev => ({ ...prev, serializer: e.target.value }))}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 mb-2"
            >
              <option value="pickle">Pickle (Python objects)</option>
              <option value="json">JSON (Simple data)</option>
              <option value="yaml">YAML (Human readable)</option>
              <option value="msgpack">MessagePack (Compact)</option>
            </select>
            <p className="text-sm text-gray-300">
              {config.serializer === 'pickle' && 'Supports complex Python objects but less secure'}
              {config.serializer === 'json' && 'Secure and fast but only basic data types'}
              {config.serializer === 'yaml' && 'Human readable but slower'}
              {config.serializer === 'msgpack' && 'Compact and fast binary format'}
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-400 mb-2">Timezone</h4>
            <input
              type="text"
              value={config.timezone}
              onChange={(e) => setConfig(prev => ({ ...prev, timezone: e.target.value }))}
              className="w-full bg-gray-700 text-white rounded px-3 py-2"
              placeholder="e.g., UTC, Asia/Kolkata, America/New_York"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-yellow-400">Generated Configuration</h4>
          
          <div className="bg-black rounded-lg p-4 h-96 overflow-y-auto">
            <pre className="text-sm text-green-400 whitespace-pre-wrap font-mono">
              {generateConfig()}
            </pre>
          </div>

          <button
            onClick={() => navigator.clipboard.writeText(generateConfig())}
            className="w-full bg-blue-600 hover:bg-blue-700 py-2 px-4 rounded-lg font-semibold transition-colors"
          >
            📋 Copy Configuration
          </button>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-black/30 rounded-lg p-4">
        <h4 className="font-semibold text-yellow-400 mb-4">🔍 Quick Comparison</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-600">
                <th className="text-left py-2">Component</th>
                <th className="text-left py-2">Best For</th>
                <th className="text-left py-2">Performance</th>
                <th className="text-left py-2">Setup Complexity</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              <tr className="border-b border-gray-700">
                <td className="py-2 font-semibold text-yellow-400">RabbitMQ</td>
                <td className="py-2">Production, reliability</td>
                <td className="py-2">⭐⭐⭐⭐⭐</td>
                <td className="py-2">⭐⭐⭐</td>
              </tr>
              <tr className="border-b border-gray-700">
                <td className="py-2 font-semibold text-yellow-400">Redis</td>
                <td className="py-2">Development, caching</td>
                <td className="py-2">⭐⭐⭐⭐⭐</td>
                <td className="py-2">⭐⭐⭐⭐⭐</td>
              </tr>
              <tr className="border-b border-gray-700">
                <td className="py-2 font-semibold text-yellow-400">MongoDB</td>
                <td className="py-2">Complex result storage</td>
                <td className="py-2">⭐⭐⭐⭐</td>
                <td className="py-2">⭐⭐⭐</td>
              </tr>
              <tr>
                <td className="py-2 font-semibold text-yellow-400">PostgreSQL</td>
                <td className="py-2">Enterprise, existing DB</td>
                <td className="py-2">⭐⭐⭐</td>
                <td className="py-2">⭐⭐⭐⭐</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 bg-blue-900/30 rounded-lg p-4 border-l-4 border-blue-400">
        <p className="text-sm text-blue-100">
          <strong>💡 Pro Tip:</strong> For development, use Redis for both broker and result backend. 
          For production, consider RabbitMQ as broker and PostgreSQL/MongoDB as result backend for 
          better reliability and persistence.
        </p>
      </div>
    </div>
  );
};

export default ConfigPlayground;
