'use client'

import { ReactNode } from 'react'

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: ReactNode;
  className?: string;
  loading?: boolean;
}

export default function KPICard({
  title,
  value,
  subtitle,
  trend,
  icon,
  className = '',
  loading = false
}: KPICardProps) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md flex items-center p-6 ${className}`}>
      {loading ? (
        <div className="w-full space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-24"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32"></div>
          {subtitle && <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-40"></div>}
        </div>
      ) : (
        <>
          {icon && <div className="mr-4 text-indigo-500 dark:text-indigo-400">{icon}</div>}
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
            <div className="flex items-baseline mt-1">
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
              {trend && (
                <p className={`ml-2 text-xs font-medium ${trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                </p>
              )}
            </div>
            {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
          </div>
        </>
      )}
    </div>
  )
} 