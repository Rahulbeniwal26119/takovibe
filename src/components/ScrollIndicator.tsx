import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';

const ScrollIndicator: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [direction, setDirection] = useState<'down' | 'up'>('down');
    const [scrollProgress, setScrollProgress] = useState(0);
    const [isFooterVisible, setIsFooterVisible] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight;
            const winHeight = window.innerHeight;
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
                    // Reached bottom — offer "Back to top"
                    setDirection('up');
                    setIsVisible(true);
                } else {
                    // Don't show a "Continue" / scroll-down prompt
                    setDirection('down');
                    setIsVisible(false);
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

    useEffect(() => {
        const footer = document.querySelector('footer');
        if (!footer) return;

        const observer = new IntersectionObserver(
            ([entry]) => setIsFooterVisible(entry.isIntersecting),
            { threshold: 0.01 }
        );

        observer.observe(footer);
        return () => observer.disconnect();
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

    if (!isVisible || isFooterVisible) return null;

    return (
        <button
            onClick={scrollTo}
            className="fixed bottom-5 right-4 z-50 flex items-center gap-2 overflow-hidden rounded-full border border-neutral-200/80 bg-white/85 px-2.5 py-1.5 text-xs font-bold text-neutral-600 opacity-70 shadow-md shadow-neutral-900/5 backdrop-blur-xl transition-all duration-300 hover:border-orange-300 hover:text-orange-700 hover:opacity-100 active:scale-95 dark:border-neutral-800 dark:bg-neutral-900/85 dark:text-neutral-300 dark:shadow-black/20 dark:hover:border-orange-700 dark:hover:text-orange-300 sm:bottom-6 sm:right-6"
            aria-label={direction === 'down' ? "Scroll Down" : "Back to Top"}
        >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100/80 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                {direction === 'down' ? (
                    <ArrowDown size={15} strokeWidth={2.5} />
                ) : (
                    <ArrowUp size={15} strokeWidth={2.5} />
                )}
            </span>
            <span>{direction === 'down' ? "Continue" : "Back to top"}</span>
            <span
                className="absolute bottom-0 left-0 h-0.5 bg-orange-500 transition-[width] duration-300"
                style={{ width: `${scrollProgress}%` }}
                aria-hidden="true"
            />
        </button>
    );
};

export default ScrollIndicator;
