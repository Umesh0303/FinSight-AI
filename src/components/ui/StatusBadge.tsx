import React from 'react';

interface StatusBadgeProps {
  status: string;
  type?: 'transaction' | 'risk' | 'case' | 'segment';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'transaction' }) => {
  const getStyles = () => {
    switch (status) {
      // Positive states
      case 'Completed':
      case 'Resolved':
      case 'Cleared':
      case 'Normal':
      case 'High Value':
        return 'text-[#065f46] bg-[#ecfdf5] border-[#a7f3d0]';

      // Warning / Pending / Moderate states
      case 'Pending':
      case 'Under Review':
      case 'In Progress':
      case 'Potential':
      case 'Medium':
      case 'Medium Risk':
        return 'text-[#92400e] bg-[#fffbeb] border-[#fde68a]';

      // High / Critical / Flagged states
      case 'Flagged':
      case 'Declined':
      case 'Confirmed Fraud':
      case 'Suspicious':
      case 'Critical':
      case 'High':
      case 'High Risk':
      case 'At Risk':
      case 'Blocked':
        return 'text-[#991b1b] bg-[#fef2f2] border-[#fecaca]';

      // New / Neutral states
      case 'New':
      case 'Open':
      case 'Regular':
      case 'Low':
      case 'Low Risk':
      default:
        return 'text-[#1e3a8a] bg-[#eff6ff] border-[#bfdbfe]';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getStyles()}`}
    >
      {status}
    </span>
  );
};
