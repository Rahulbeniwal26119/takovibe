import React, { useState, useEffect } from 'react';

export default function TokenCounter() {
  const [input, setInput] = useState('He,bim');
  const [tokens, setTokens] = useState([]);
  const [tokenTexts, setTokenTexts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [encoder, setEncoder] = useState(null);

  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (!shouldLoad) return;

    // Use gpt-tokenizer instead of tiktoken to avoid WASM issues
    const loadTokenizer = async () => {
      try {
        if (typeof window !== 'undefined') {
          // Dynamic import that creates a separate chunk
          const { encode, decode } = await import('gpt-tokenizer');
          setEncoder({
            encode: (text) => encode(text),
            decode: (tokens) => decode(tokens)
          });
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load gpt-tokenizer:', error);
        setIsLoading(false);
        // Fallback to a simple tokenizer
        const words = [];
        setEncoder({
          encode: (text) => {
            // Simple word-based tokenization for fallback
            const tokens = text.split(/\s+/);
            words.length = 0; // Clear previous words
            words.push(...tokens);
            return tokens.map((_, index) => 1000 + index);
          },
          decode: (tokens) => {
            // For fallback, try to map back to words
            return tokens.map((id, index) => {
              const wordIndex = id - 1000;
              return words[wordIndex] || `[${id}]`;
            });
          }
        });
      }
    };
    
    loadTokenizer();
  }, [shouldLoad]);

  useEffect(() => {
    if (!encoder || isLoading) return;
    
    try {
      const encoded = encoder.encode(input);
      setTokens(encoded);
      
      // Get individual token texts by decoding each token
      if (encoder.decode) {
        const texts = encoded.map(tokenId => {
            try {
                return encoder.decode([tokenId]);
            } catch (error) {
                return `[${tokenId}]`;
            }
        });
        setTokenTexts(texts);
      } else {
        // Fallback for simple tokenizer
        setTokenTexts(input.split(/\s+/));
      }
    } catch (error) {
      console.error('Tokenization error:', error);
      setTokens([]);
      setTokenTexts([]);
    }
  }, [input, encoder, isLoading]);

  return (
    <div className="token-counter bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800 my-8">
      <div className="mb-4">
        <h3 className="text-xl font-bold mb-2 text-gray-800 dark:text-white">
          🔢 Live Token Counter (GPT-4 Compatible)
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Type text below to see real GPT-4 compatible tokenization
        </p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Input Text:
        </label>
        <input 
          type="text" 
          value={input}
          onFocus={() => setShouldLoad(true)}
          onChange={e => setInput(e.target.value)}
          placeholder={shouldLoad ? "Type a sentence..." : "Click to activate token counter..."}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all"
        />
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Token Count:
          </span>
          <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-bold">
            {tokens.length} tokens
          </span>
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Tokenization Breakdown:
        </h4>
        {isLoading ? (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Loading tokenizer...
          </div>
        ) : tokens.length > 0 ? (
          <div className="space-y-4">
            {/* Visual token breakdown */}
            <div>
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                Tokens (hover for details):
              </div>
              <div className="flex flex-wrap gap-1">
                {tokenTexts.map((text, index) => (
                  <span
                    key={index}
                    title={`Token ID: ${tokens[index]}\nText: "${text}"`}
                    className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs font-mono border border-blue-200 dark:border-blue-700 hover:bg-blue-200 dark:hover:bg-blue-800 cursor-help transition-colors"
                  >
                    {text.replace(/\n/g, '\\n').replace(/\t/g, '\\t')}
                  </span>
                ))}
              </div>
            </div>
            
            {/* Token IDs */}
            <div>
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                Token IDs:
              </div>
              <pre className="text-xs font-mono text-gray-600 dark:text-gray-300 whitespace-pre-wrap break-all bg-gray-100 dark:bg-gray-700 p-2 rounded">
                {tokens.join(', ')}
              </pre>
            </div>
          </div>
        ) : (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            No tokens
          </div>
        )}
      </div>

      <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <p className="text-xs text-green-700 dark:text-green-300">
          <strong>Tokenization:</strong> {encoder && encoder.encode.toString().includes('split') 
            ? 'Using fallback tokenizer (word-based splitting). Real GPT tokenizer may not be available in this environment.'
            : 'This uses the gpt-tokenizer library with GPT-4 compatible encoding. Each number represents a unique token in the vocabulary.'
          }
        </p>
      </div>
    </div>
  );
}
