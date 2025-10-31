import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, FileText } from 'lucide-react';

interface ApprovalStatusBadgeProps {
  status: 'unsubmitted' | 'submitted' | 'approved';
}

export function ApprovalStatusBadge({ status }: ApprovalStatusBadgeProps) {
  const config = {
    approved: {
      variant: 'default' as const,
      icon: CheckCircle,
      label: 'Approved',
    },
    submitted: {
      variant: 'secondary' as const,
      icon: Clock,
      label: 'Pending',
    },
    unsubmitted: {
      variant: 'outline' as const,
      icon: FileText,
      label: 'Unsubmitted',
    },
  }[status];

  const Icon = config.icon;

  return (
    <Badge variant={config.variant}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}
