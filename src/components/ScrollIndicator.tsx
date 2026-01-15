import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const ScrollIndicator: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [direction, setDirection] = useState<'down' | 'up'>('down');
    const [scrollProgress, setScrollProgress] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight;
            const winHeight = window.innerHeight;
            const threshold = 100; // Show after 100px or if content > window

            // Calculate progress
            const scrollTotal = docHeight - winHeight;
            const progress = scrollTotal > 0 ? (scrollTop / scrollTotal) * 100 : 0;
            setScrollProgress(progress);

            // Determine visibility and direction
            if (docHeight <= winHeight) {
                // Content fits screen, no scroll needed
                setIsVisible(false);
            } else {
                if (scrollTop + winHeight >= docHeight - 20) {
                    // Reached bottom
                    setDirection('up');
                    setIsVisible(true);
                } else {
                    // Scrolling or at top
                    setDirection('down');
                    // Show if at top OR scrolling (always show if content exists)
                    setIsVisible(true);
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        window.addEventListener('resize', handleScroll); // Check on resize too

        // Initial check
        handleScroll();

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
        };
    }, []);

    const scrollTo = () => {
        if (direction === 'down') {
            window.scrollTo({
                top: window.scrollY + window.innerHeight * 0.8,
                behavior: 'smooth'
            });
        } else {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    };

    if (!isVisible) return null;

    return (
        <button
            onClick={scrollTo}
            className={`fixed bottom-8 right-8 z-50 p-3 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 active:scale-95 group
                ${direction === 'down'
                    ? 'bg-white/80 dark:bg-gray-800/80 text-purple-600 dark:text-purple-400 animate-bounce'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }
                backdrop-blur-md border border-purple-200 dark:border-purple-900/50
            `}
            aria-label={direction === 'down' ? "Scroll Down" : "Back to Top"}
        >
            {direction === 'down' ? (
                <ChevronDown size={24} className="stroke-[3]" />
            ) : (
                <ChevronUp size={24} className="stroke-[3]" />
            )}

            {/* Optional Toolkit: Circular Progress could go here */}
        </button>
    );
};

export default ScrollIndicator;
