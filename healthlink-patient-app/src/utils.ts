import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string, locale: string = 'en') {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'sw-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatRelativeTime(dateString: string, locale: string = 'en') {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return locale === 'en' ? 'Just now' : 'Sasa hivi';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return locale === 'en' 
      ? `${diffInMinutes}m ago` 
      : `Dakika ${diffInMinutes} zilizopita`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return locale === 'en' 
      ? `${diffInHours}h ago` 
      : `Saa ${diffInHours} zilizopita`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return locale === 'en' 
      ? `${diffInDays}d ago` 
      : `Siku ${diffInDays} zilizopita`;
  }

  return formatDate(dateString, locale);
}
