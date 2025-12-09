import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import SingleQuiz from './SingleQuiz';

export default function QuizHydrator() {
    useEffect(() => {
        const quizElements = document.querySelectorAll('quiz-component');

        quizElements.forEach((element) => {
            // Check if already hydrated
            if (element.hasAttribute('data-hydrated')) return;

            const question = element.getAttribute('question') || '';
            const optionsStr = element.getAttribute('options');
            const correctIndexStr = element.getAttribute('correctIndex');

            let options: string[] = [];
            try {
                options = optionsStr ? JSON.parse(optionsStr) : [];
            } catch (e) {
                console.error('Failed to parse quiz options:', e);
            }

            const correctIndex = correctIndexStr ? parseInt(correctIndexStr, 10) : 0;

            // Mark as hydrated
            element.setAttribute('data-hydrated', 'true');

            // Create a container for the React component
            const container = document.createElement('div');
            element.appendChild(container);

            const root = createRoot(container);
            root.render(
                <SingleQuiz
                    question={question}
                    options={options}
                    correctIndex={correctIndex}
                />
            );
        });
    }, []);

    return null;
}
