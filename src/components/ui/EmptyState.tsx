import React from 'react';
import { Inbox, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No records found',
  description = 'There is currently no data matching your filters or query.',
  actionLabel,
  onAction,
  icon
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-white border border-[#ece7dc] rounded-2xl min-h-[220px]">
      <div className="w-12 h-12 rounded-full bg-[#f4efe3] flex items-center justify-center text-[#0f4b38] mb-3">
        {icon || <Inbox className="w-6 h-6 text-[#0f4b38]" />}
      </div>
      <h4 className="font-heading font-semibold text-base text-[#0a261c]">{title}</h4>
      <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">{description}</p>
      {actionLabel && onAction && (
        <Button variant="emerald" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export const LoadingState: React.FC<{ message?: string }> = ({
  message = 'Loading financial intelligence...'
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white/60 backdrop-blur-xs border border-[#ece7dc] rounded-2xl min-h-[240px]">
      <div className="relative w-10 h-10 mb-3">
        <div className="absolute inset-0 rounded-full border-3 border-[#e8dfcb]" />
        <div className="absolute inset-0 rounded-full border-3 border-[#0d5941] border-t-transparent animate-spin" />
      </div>
      <p className="text-xs font-medium text-slate-600">{message}</p>
    </div>
  );
};

export const ErrorState: React.FC<{
  title?: string;
  message?: string;
  onRetry?: () => void;
}> = ({
  title = 'Unable to load data',
  message = 'An unexpected error occurred while processing the financial records.',
  onRetry
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-[#fff8f8] border border-red-200 rounded-2xl min-h-[220px]">
      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-3">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h4 className="font-heading font-semibold text-base text-red-900">{title}</h4>
      <p className="text-xs text-red-700 max-w-sm mt-1 mb-4">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Try Again
        </Button>
      )}
    </div>
  );
};
