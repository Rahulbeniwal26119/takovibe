
import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';


export default function CodePlaygroundHydrator() {
    useEffect(() => {
        const hydrate = async () => {
            // Select all elements matching the selector
            const playgroundElements = document.querySelectorAll('div[data-type="code-playground"]');

            if (playgroundElements.length === 0) return;

            // Dynamically import the component only if needed
            const { CodePlayground } = await import('./editor/CodePlayground');

            playgroundElements.forEach((element) => {
                // Check if already hydrated
                if (element.hasAttribute('data-hydrated')) return;

                // Get attributes from the DOM element
                const html = element.getAttribute('data-html') || '';
                const css = element.getAttribute('data-css') || '';
                const js = element.getAttribute('data-js') || '';

                // Mark as hydrated to avoid double-hydration
                element.setAttribute('data-hydrated', 'true');

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
                        isEditable={false} // Viewers can edit locally but state isn't saved to DB
                        title="Code Playground"
                    // We don't pass onSave because this is the read-only view
                    />
                );
            });
        };

        hydrate();
    }, []);

    return null;
}
