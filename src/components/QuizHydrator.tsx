import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';


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
                element.innerHTML = ''; // Clear placeholder
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
        };
        hydrate();
    }, []);

    return null;
}
