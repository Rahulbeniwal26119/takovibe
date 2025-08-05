import React, { useState, useEffect } from 'react';

// Interactive Counter Component
const InteractiveCounter = () => {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (count > 10) {
      setMessage('🎉 Wow, you\'re really clicking!');
    } else if (count > 5) {
      setMessage('👍 Keep going!');
    } else {
      setMessage('👋 Click the button to start!');
    }
  }, [count]);

  return (
    <div className="interactive-component bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
      <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Interactive Counter</h3>
      <div className="text-center">
        <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-4">
          {count}
        </div>
        <button
          onClick={() => setCount(count + 1)}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200 mr-2"
        >
          Click Me!
        </button>
        <button
          onClick={() => setCount(0)}
          className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
        >
          Reset
        </button>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
          {message}
        </p>
      </div>
    </div>
  );
};

// Interactive Form Component
const InteractiveForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    feedback: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="interactive-component bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 p-6 rounded-xl border border-green-200 dark:border-green-800">
      <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Interactive Feedback Form</h3>
      {submitted ? (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">✅</div>
          <p className="text-xl text-green-600 dark:text-green-400 font-semibold">
            Thank you for your feedback!
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Feedback
            </label>
            <textarea
              name="feedback"
              value={formData.feedback}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200"
          >
            Submit Feedback
          </button>
        </form>
      )}
    </div>
  );
};

// Main Blog Post Content
export default function InteractiveJSXDemo() {
  return (
    <div className="jsx-blog-post">
      <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">
        Welcome to Interactive JSX Blog Posts!
      </h2>
      
      <p className="text-lg mb-6 text-gray-600 dark:text-gray-300 leading-relaxed">
        This is a revolutionary way to create blog posts using JSX and React components. 
        You can now include fully interactive elements directly in your blog content, 
        making your articles more engaging and dynamic.
      </p>

      <h3 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-white">
        Features of JSX Blog Posts:
      </h3>
      
      <ul className="list-disc list-inside mb-6 text-gray-600 dark:text-gray-300 space-y-2">
        <li>Full React component support</li>
        <li>Interactive elements and state management</li>
        <li>Custom styling with Tailwind CSS</li>
        <li>Frontmatter support for metadata</li>
        <li>Seamless integration with existing MDX posts</li>
      </ul>

      <h3 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-white">
        Try These Interactive Components:
      </h3>

      <div className="space-y-8">
        <InteractiveCounter />
        <InteractiveForm />
      </div>

      <h3 className="text-2xl font-semibold mb-4 mt-8 text-gray-800 dark:text-white">
        Code Example:
      </h3>
      
      <div className="bg-gray-900 rounded-xl p-6 mb-6 overflow-x-auto">
        <pre className="text-green-400 text-sm">
{`const MyComponent = () => {
  const [state, setState] = useState(0);
  
  return (
    <div className="interactive-component">
      <h3>Count: {state}</h3>
      <button onClick={() => setState(state + 1)}>
        Increment
      </button>
    </div>
  );
};`}
        </pre>
      </div>

      <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
        This opens up unlimited possibilities for creating educational content, 
        interactive tutorials, data visualizations, and engaging user experiences 
        directly within your blog posts. The combination of MDX and JSX gives you 
        the best of both worlds - the simplicity of Markdown and the power of React.
      </p>
    </div>
  );
}
