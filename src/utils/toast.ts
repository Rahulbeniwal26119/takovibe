export type ToastType = 'success' | 'error' | 'info';

export function showToast(message: string, type: ToastType = 'info', position: 'top' | 'bottom' = 'top') {
    // Create container if it doesn't exist
    const containerId = position === 'bottom' ? 'toast-container-bottom' : 'toast-container';
    let container = document.getElementById(containerId);
    if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        const positionClasses = position === 'bottom'
            ? 'bottom-20 flex-col-reverse' // Bottom positioning
            : 'top-20 flex-col';           // Top positioning

        container.className = `fixed ${positionClasses} left-1/2 transform -translate-x-1/2 z-[100] flex gap-3 pointer-events-none`;
        document.body.appendChild(container);
    }

    // Create toast element
    const toast = document.createElement('div');

    // Base styles
    const translateYClass = position === 'bottom' ? 'translate-y-[20px]' : 'translate-y-[-20px]';
    const baseClasses = `pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg backdrop-blur-md border transition-all duration-300 transform ${translateYClass} opacity-0 min-w-[300px] max-w-md`;

    // Type-specific styles
    const typeClasses = {
        success: 'bg-white/90 dark:bg-gray-800/90 border-green-200 dark:border-green-900/30 text-green-700 dark:text-green-400',
        error: 'bg-white/90 dark:bg-gray-800/90 border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400',
        info: 'bg-white/90 dark:bg-gray-800/90 border-purple-200 dark:border-purple-900/30 text-purple-700 dark:text-purple-400'
    };

    // Icons
    const icons = {
        success: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`,
        error: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`,
        info: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
    };

    toast.className = `${baseClasses} ${typeClasses[type]}`;
    toast.innerHTML = `
    ${icons[type]}
    <p class="text-sm font-medium">${message}</p>
  `;

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        toast.classList.remove(translateYClass, 'opacity-0');
    });

    // Remove after delay
    setTimeout(() => {
        toast.classList.add('opacity-0', translateYClass);
        setTimeout(() => {
            if (container && container.contains(toast)) {
                container.removeChild(toast);
                // Remove container if empty
                if (container.childNodes.length === 0) {
                    document.body.removeChild(container);
                }
            }
        }, 300);
    }, 3000);
}
