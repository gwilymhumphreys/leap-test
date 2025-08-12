'use client';

import { useState, useCallback } from 'react';
import { Record } from '@/lib/schema';

interface RunFormProps {
  initialPromptText: string;
  currentPromptText: string;
}

interface RunResponse {
  prompt: {
    id: number;
    text: string;
    createdAt: number;
    updatedAt: number;
  };
  records: Record[];
  meta: {
    warnings: string[];
  };
}

export default function RunForm({ initialPromptText, currentPromptText }: RunFormProps) {
  const [promptText, setPromptText] = useState(initialPromptText);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string>('');
  const [warnings, setWarnings] = useState<string[]>([]);

  // Get max chars from environment (matching server-side logic)
  const MAX_PROMPT_CHARS = parseInt(process.env.NEXT_PUBLIC_MAX_PROMPT_CHARS ?? "2000");

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedPrompt = promptText.trim();
    if (trimmedPrompt.length === 0 || trimmedPrompt.length > MAX_PROMPT_CHARS) {
      return; // Button should be disabled, but extra safety
    }

    setIsRunning(true);
    setError('');
    setWarnings([]);

    try {
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: trimmedPrompt })
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 422 && errorData.fields?.prompt) {
          setError(errorData.fields.prompt);
        } else {
          setError(errorData.detail || `Error: ${errorData.title}`);
        }
        return;
      }

      const data: RunResponse = await response.json();
      
      // Show warnings if any
      if (data.meta.warnings && data.meta.warnings.length > 0) {
        setWarnings(data.meta.warnings);
      }

      // Force page reload to show updated records (simple approach)
      // In a more complex app, we'd update parent state
      window.location.reload();

    } catch (err) {
      setError('Failed to connect to server. Please try again.');
      console.error('Run API error:', err);
    } finally {
      setIsRunning(false);
    }
  }, [promptText, MAX_PROMPT_CHARS]);

  const isDisabled = promptText.trim().length === 0 || 
                    promptText.trim().length > MAX_PROMPT_CHARS || 
                    isRunning;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="space-y-4">
        {/* Current Prompt Display (if exists) */}
        {currentPromptText && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Prompt:
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-3 text-sm text-gray-600 dark:text-gray-300">
              {currentPromptText}
            </div>
          </div>
        )}

        {/* Run Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label 
              htmlFor="prompt-textarea"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Enter your prompt:
            </label>
            <textarea
              id="prompt-textarea"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              maxLength={MAX_PROMPT_CHARS}
              placeholder="Describe what records you want to generate..."
              className="w-full min-h-[120px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-vertical"
              disabled={isRunning}
            />
            
            {/* Character Counter */}
            <div className="flex justify-between items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
              <span className={promptText.length > MAX_PROMPT_CHARS ? 'text-red-500' : ''}>
                {promptText.length}/{MAX_PROMPT_CHARS}
              </span>
              {promptText.trim().length === 0 && (
                <span className="text-red-500">Prompt cannot be empty</span>
              )}
              {promptText.trim().length > MAX_PROMPT_CHARS && (
                <span className="text-red-500">Prompt too long</span>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isDisabled}
            className={`w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
              ${isDisabled 
                ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              } transition-colors`}
          >
            {isRunning ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : (
              'Run'
            )}
          </button>
        </form>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Warnings Display */}
        {warnings.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                  Warnings:
                </h4>
                <ul className="list-disc list-inside text-sm text-yellow-700 dark:text-yellow-300">
                  {warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}