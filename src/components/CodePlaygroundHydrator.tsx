
import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';


export default function CodePlaygroundHydrator() {
    useEffect(() => {
        const hydrate = async () => {
            // Select all elements matching the selector
            const playgroundElements = document.querySelectorAll('div[data-type="code-playground"]');

            if (playgroundElements.length === 0) return;

            playgroundElements.forEach((element) => {
                // Check if already hydrated
                if (element.hasAttribute('data-hydrated')) return;

                // Mark as hydrated to avoid double-processing
                // We'll handle the actual React mounting in the observer

                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            hydrateElement(element);
                            observer.unobserve(element);
                        }
                    });
                }, { rootMargin: '200px' }); // Preload when close

                observer.observe(element);
            });

            async function hydrateElement(element: Element) {
                if (element.hasAttribute('data-hydrated')) return;
                element.setAttribute('data-hydrated', 'true');

                // Dynamically import the component only when needed
                const { CodePlayground } = await import('./editor/CodePlayground');

                // Get attributes from the DOM element
                const html = element.getAttribute('data-html') || '';
                const css = element.getAttribute('data-css') || '';
                const js = element.getAttribute('data-js') || '';

                // Create a container for the React component
                const container = document.createElement('div');
                container.className = "not-prose"; // Prevent prose styles from affecting layout

                // Replaces the content of the element with our container
                element.innerHTML = '';
                element.appendChild(container);

                const root = createRoot(container);
                root.render(
                    <CodePlayground
                        initialHtml={html}
                        initialCss={css}
                        initialJs={js}
                        isEditable={true}
                    />
                );
            }
        };

        hydrate();
    }, []);

    return null;
}
