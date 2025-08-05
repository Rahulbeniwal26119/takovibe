import React, { useState } from 'react';

export default function Quiz({ 
  questions = [
    {
      id: 'q1',
      question: 'True/False: All GPT models share the same tokenizer.',
      options: [
        { value: 'True', label: 'True' },
        { value: 'False', label: 'False' }
      ],
      correct: 'False',
      explanation: 'Different GPT models (GPT-2, GPT-3, GPT-4) use different tokenizers with varying vocabularies.'
    },
    {
      id: 'q2',
      question: 'Which token set is valid BPE output for `unbelievable`?',
      options: [
        { value: 'A', label: 'A. un, believe, able' },
        { value: 'B', label: 'B. unb, el, iev, able' },
        { value: 'C', label: 'C. Both could be valid' }
      ],
      correct: 'C',
      explanation: 'BPE tokenization depends on the training data and merge operations, so both could be valid depending on the specific tokenizer.'
    },
    {
      id: 'q3',
      question: 'What doesn\'t affect token count?',
      options: [
        { value: 'A', label: 'A. Emojis' },
        { value: 'B', label: 'B. Whitespace duplication' },
        { value: 'C', label: 'C. Model\'s vocabulary' },
        { value: 'D', label: 'D. Your GPU type' }
      ],
      correct: 'D',
      explanation: 'GPU type is hardware-related and doesn\'t affect how text is tokenized. The tokenizer is deterministic based on the text and model vocabulary.'
    }
  ],
  title = "Tokenization Quiz",
  description = "Test your knowledge about tokenization concepts"
}) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [ans, setAns] = useState({});
  const [res, setRes] = useState(null);
  const [showResults, setShowResults] = useState(false);

  // Create correct answers object from questions
  const correct = questions.reduce((acc, q) => {
    acc[q.id] = q.correct;
    return acc;
  }, {});
  
  const onChange = e => setAns({ ...ans, [e.target.name]: e.target.value });
  
  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const onSubmit = () => {
    let score = 0, fb = {};
    Object.keys(correct).forEach(q => {
      fb[q] = ans[q] === correct[q];
      if (ans[q] === correct[q]) score++;
    });
    setRes({ score, fb });
    setShowResults(true);
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setAns({});
    setRes(null);
    setShowResults(false);
  };

  if (showResults) {
    return (
      <div className="quiz-container relative max-w-2xl mx-auto my-8">
        {/* Results Card */}
        <div className="relative transform transition-all duration-500 hover:scale-[1.02]">
          <div className="absolute inset-0 bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 rounded-2xl blur opacity-75"></div>
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">
                {res.score === 3 ? '🎉' : res.score === 2 ? '👍' : '📚'}
              </div>
              <h3 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                {title} Complete!
              </h3>
              <div className="text-5xl font-extrabold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                {res.score}/3
              </div>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {res.score === 3 ? 'Perfect! You\'re a tokenization expert!' : 
                 res.score === 2 ? 'Great job! Just one more to go!' : 
                 'Good effort! Review and try again!'}
              </p>
            </div>

            <div className="space-y-4 mb-6">
              {Object.entries(res.fb).map(([q, ok], index) => {
                const question = questions.find(ques => ques.id === q);
                const userAnswer = ans[q];
                const correctAnswer = correct[q];
                const correctOption = question?.options.find(opt => opt.value === correctAnswer);
                const userOption = question?.options.find(opt => opt.value === userAnswer);
                
                return (
                  <div key={q} className={`p-4 rounded-lg border ${ok ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Question {index + 1}
                      </span>
                      <span className={`font-semibold flex items-center gap-2 ${ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {ok ? '✅ Correct' : '❌ Incorrect'}
                      </span>
                    </div>
                    
                    {!ok && (
                      <div className="text-sm space-y-1">
                        <div className="text-red-600 dark:text-red-400">
                          <span className="font-medium">Your answer:</span> {userOption?.label || userAnswer}
                        </div>
                        <div className="text-green-600 dark:text-green-400">
                          <span className="font-medium">Correct answer:</span> {correctOption?.label || correctAnswer}
                        </div>
                        {question?.explanation && (
                          <div className="text-gray-600 dark:text-gray-400 mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                            <span className="font-medium">Explanation:</span> {question.explanation}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {ok && question?.explanation && (
                      <div className="text-gray-600 dark:text-gray-400 mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                        <span className="font-medium">✨ Great!</span> {question.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {res.score < 3 && (
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  💡 <strong>Tip:</strong> Review the content above and try again! Each question tests key concepts about tokenization.
                </p>
              </div>
            )}

            <div className="flex justify-center">
              <button 
                onClick={resetQuiz}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-bold py-3 px-8 rounded-xl transition-all duration-200 transform hover:scale-105 focus:ring-4 focus:ring-purple-300 shadow-lg"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-container max-w-2xl mx-auto my-8">
      {/* Quiz Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          {title}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {description}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Question {currentQuestion + 1} of {questions.length}
          </span>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {Math.round(((currentQuestion + 1) / questions.length) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Single Card with Transition */}
      <div className="relative transform transition-all duration-500 hover:scale-[1.01]">
        {/* Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-500 to-blue-500 rounded-2xl blur opacity-20"></div>
        
        {/* Main Card */}
        <div className="relative bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-2xl border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col">
            {/* Question Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {currentQuestion + 1}
                </div>
                <div className="h-1 flex-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded"></div>
              </div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white leading-relaxed">
                {questions[currentQuestion].question}
              </h3>
            </div>

            {/* Options */}
            <div className="space-y-3 mb-6">
              {questions[currentQuestion].options.map((option, optionIndex) => (
                <label key={option.value} className="group relative block cursor-pointer">
                  <input 
                    type="radio" 
                    name={questions[currentQuestion].id}
                    value={option.value}
                    checked={ans[questions[currentQuestion].id] === option.value}
                    onChange={onChange}
                    className="sr-only"
                  />
                  <div className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                    ans[questions[currentQuestion].id] === option.value 
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-md' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        ans[questions[currentQuestion].id] === option.value 
                          ? 'border-purple-500 bg-purple-500' 
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {ans[questions[currentQuestion].id] === option.value && (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 font-medium">
                        {option.label}
                      </span>
                    </div>
                  </div>
                </label>
              ))}
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
              <button 
                onClick={prevQuestion}
                disabled={currentQuestion === 0}
                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                  currentQuestion === 0 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                }`}
              >
                ← Previous
              </button>

              {currentQuestion === questions.length - 1 ? (
                <button 
                  onClick={onSubmit}
                  disabled={!ans[questions[currentQuestion].id]}
                  className={`px-8 py-3 rounded-xl font-bold transition-all duration-200 transform ${
                    ans[questions[currentQuestion].id]
                      ? 'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white shadow-lg hover:scale-105 focus:ring-4 focus:ring-green-300'
                      : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Submit Quiz
                </button>
              ) : (
                <button 
                  onClick={nextQuestion}
                  disabled={!ans[questions[currentQuestion].id]}
                  className={`px-6 py-3 rounded-xl font-bold transition-all duration-200 transform ${
                    ans[questions[currentQuestion].id]
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-lg hover:scale-105 focus:ring-4 focus:ring-purple-300'
                      : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Next →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
