import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const alertVariants = cva('relative flex w-full gap-3 rounded-lg border p-4 text-sm', {
  variants: {
    variant: {
      default: 'border-border bg-background text-foreground',
      info: 'border-blue-200 bg-blue-50 text-blue-900',
      success: 'border-green-200 bg-green-50 text-[#15803D]',
      warning: 'border-orange-200 bg-orange-50 text-orange-900',
      destructive: 'border-red-200 bg-red-50 text-[#B91C1C]',
    },
  },
  defaultVariants: { variant: 'default' },
});

const iconMap = {
  default: Info,
  info: Info,
  success: CheckCircle,
  warning: AlertCircle,
  destructive: XCircle,
};

interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {}

function Alert({ className, variant = 'default', children, ...props }: AlertProps) {
  const Icon = iconMap[variant ?? 'default'];
  return (
    <div role="alert" className={cn(alertVariants({ variant }), className)} {...props}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="flex-1">{children}</div>
    </div>
  );
}

function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h5 className={cn('font-medium leading-none tracking-tight', className)} {...props} />;
}

function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('mt-1 text-sm opacity-90', className)} {...props} />;
}

export { Alert, AlertDescription, AlertTitle };
