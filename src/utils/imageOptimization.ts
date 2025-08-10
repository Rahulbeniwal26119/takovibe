/**
 * Image optimization utilities for various CDN providers
 */

interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
  fit?: 'crop' | 'cover' | 'contain' | 'fill' | 'scale-down';
}

/**
 * Optimizes image URLs based on the CDN provider
 */
export function optimizeImage(
  imageUrl: string, 
  options: ImageOptimizationOptions = {}
): string {
  const { 
    width = 800, 
    height = 400, 
    quality = 80, 
    format = 'auto',
    fit = 'crop' 
  } = options;

  // Handle Unsplash images
  if (imageUrl.includes('unsplash.com')) {
    const baseUrl = imageUrl.split('?')[0];
    return `${baseUrl}?auto=format&fit=${fit}&w=${width}&h=${height}&q=${quality}`;
  }

  // Handle ImageKit images
  if (imageUrl.includes('imagekit.io')) {
    const baseUrl = imageUrl.split('?')[0];
    return `${baseUrl}?tr=w-${width},h-${height},q-${quality},f-auto`;
  }

  // Handle Cloudinary images
  if (imageUrl.includes('cloudinary.com')) {
    const baseUrl = imageUrl.split('/upload/')[0];
    const imagePath = imageUrl.split('/upload/')[1];
    return `${baseUrl}/upload/c_${fit},w_${width},h_${height},q_${quality},f_auto/${imagePath}`;
  }

  // Return original URL if no optimization is available
  return imageUrl;
}

/**
 * Generates srcset for responsive images
 */
export function generateSrcset(
  imageUrl: string, 
  sizes: number[] = [400, 800, 1200]
): string {
  return sizes
    .map(size => `${optimizeImage(imageUrl, { width: size, height: Math.round(size * 0.5) })} ${size}w`)
    .join(', ');
}

/**
 * Generates sizes attribute for responsive images
 */
export function generateSizes(breakpoints: Record<string, string> = {}): string {
  const defaultBreakpoints = {
    '(max-width: 640px)': '100vw',
    '(max-width: 1024px)': '50vw',
    '': '400px'
  };
  
  const allBreakpoints = { ...defaultBreakpoints, ...breakpoints };
  
  return Object.entries(allBreakpoints)
    .map(([query, size]) => query ? `${query} ${size}` : size)
    .join(', ');
}
