export type ToastType = 'success' | 'error' | 'info';

export function showToast(message: string, type: ToastType = 'info', position: 'top' | 'bottom' = 'top') {
    // Create container if it doesn't exist
    const containerId = position === 'bottom' ? 'toast-container-bottom' : 'toast-container';
    let container = document.getElementById(containerId);
    if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        const positionClasses = position === 'bottom'
            ? 'bottom-20 flex-col-reverse'
            : 'top-[calc(var(--top-banner-height,0px)+5.5rem)] flex-col';

        container.className = `fixed ${positionClasses} left-1/2 transform -translate-x-1/2 z-[20000] flex gap-3 pointer-events-none`;
        document.body.appendChild(container);
    }

    // Create toast element
    const toast = document.createElement('div');

    // Base styles
    const translateYClass = position === 'bottom' ? 'translate-y-[20px]' : 'translate-y-[-20px]';
    const baseClasses = `pointer-events-auto flex min-w-[300px] max-w-md items-center gap-3 rounded-xl border bg-stone-50/95 px-4 py-3 text-sm shadow-xl shadow-black/10 backdrop-blur-xl transition-all duration-300 transform dark:bg-neutral-950/95 ${translateYClass} opacity-0`;

    // Type-specific styles
    const typeClasses = {
        success: 'border-emerald-200 text-emerald-700 dark:border-emerald-900/70 dark:text-emerald-300',
        error: 'border-red-200 text-red-700 dark:border-red-900/70 dark:text-red-300',
        info: 'border-orange-200 text-orange-700 dark:border-orange-900/70 dark:text-orange-300'
    };

    // Icons
    const icons = {
        success: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`,
        error: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`,
        info: `<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
    };

    toast.className = `${baseClasses} ${typeClasses[type]}`;
    toast.innerHTML = icons[type];
    const text = document.createElement('p');
    text.className = 'text-sm font-semibold text-neutral-700 dark:text-neutral-200';
    text.textContent = message;
    toast.appendChild(text);

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
