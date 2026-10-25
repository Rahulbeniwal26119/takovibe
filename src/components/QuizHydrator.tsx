import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import type { QuizCode, StoredQuizOption } from '../lib/quizContent';


export default function QuizHydrator() {
    useEffect(() => {
        const hydrate = async () => {
            const quizElements = document.querySelectorAll('quiz-component');
            if (quizElements.length === 0) return;

            // Dynamically import the component
            const { default: SingleQuiz } = await import('./SingleQuiz');

            quizElements.forEach((element) => {
                // Check if already hydrated
                if (element.hasAttribute('data-hydrated')) return;

                const question = element.getAttribute('question') || '';
                const optionsStr = element.getAttribute('options');
                const correctIndexStr = element.getAttribute('correctIndex');
                const questionCodeStr = element.getAttribute('data-question-code');
                const explanation = element.getAttribute('data-explanation') || '';

                let options: StoredQuizOption[] = [];
                let questionCode: QuizCode | null = null;
                try {
                    options = optionsStr ? JSON.parse(optionsStr) : [];
                } catch (e) {
                    console.error('Failed to parse quiz options:', e);
                }
                try {
                    questionCode = questionCodeStr ? JSON.parse(questionCodeStr) : null;
                } catch (e) {
                    console.error('Failed to parse quiz question code:', e);
                }

                const correctIndex = correctIndexStr ? parseInt(correctIndexStr, 10) : 0;

                // Mark as hydrated
                element.setAttribute('data-hydrated', 'true');

                // Create a container for the React component
                const container = document.createElement('div');
                element.innerHTML = ''; // Clear placeholder
                element.appendChild(container);

                const root = createRoot(container);
                root.render(
                    <SingleQuiz
                        question={question}
                        questionCode={questionCode}
                        options={options}
                        correctIndex={correctIndex}
                        explanation={explanation}
                    />
                );
            });
        };
        hydrate();
    }, []);

    return null;
}
