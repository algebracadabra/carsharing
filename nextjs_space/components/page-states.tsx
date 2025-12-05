'use client';

import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// Loading State
// ============================================

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = 'Laden...', className }: LoadingStateProps) {
  return (
    <div className={cn('max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8', className)}>
      <div className="text-center text-gray-600">{message}</div>
    </div>
  );
}

// ============================================
// Error State (Full Page)
// ============================================

interface ErrorStateProps {
  message?: string;
  className?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'Ein Fehler ist aufgetreten', className, onRetry }: ErrorStateProps) {
  return (
    <div className={cn('max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8', className)}>
      <div className="text-center">
        <div className="text-red-600 mb-4">{message}</div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Erneut versuchen
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================
// Empty State
// ============================================

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('bg-white rounded-lg shadow-md p-12 text-center', className)}>
      <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8 text-gray-400" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {description && <p className="text-gray-600 mb-4">{description}</p>}
      {action}
    </div>
  );
}

// ============================================
// Page Header
// ============================================

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8', className)}>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
        {description && <p className="text-gray-600">{description}</p>}
      </div>
      {action}
    </div>
  );
}

// ============================================
// Page Container
// ============================================

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn('max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8', className)}>
      {children}
    </div>
  );
}

// ============================================
// Card
// ============================================

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className, hover = false }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-lg shadow-md p-6',
        hover && 'hover:shadow-lg transition-shadow',
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================
// Error Alert
// ============================================

interface ErrorAlertProps {
  message: string;
  icon?: LucideIcon;
  className?: string;
}

export function ErrorAlert({ message, icon: Icon, className }: ErrorAlertProps) {
  return (
    <div
      className={cn(
        'bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3',
        className
      )}
      role="alert"
    >
      {Icon && <Icon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />}
      <p className="text-sm text-red-800">{message}</p>
    </div>
  );
}

// ============================================
// Warning Alert
// ============================================

interface WarningAlertProps {
  message: string;
  icon?: LucideIcon;
  className?: string;
}

export function WarningAlert({ message, icon: Icon, className }: WarningAlertProps) {
  return (
    <div
      className={cn(
        'bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3',
        className
      )}
      role="alert"
    >
      {Icon && <Icon className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" aria-hidden="true" />}
      <p className="text-sm text-orange-800">{message}</p>
    </div>
  );
}
