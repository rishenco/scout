import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface RelevancyBadgeProps {
    isRelevant: boolean;
    compact?: boolean;
}

export function RelevancyBadge({ isRelevant, compact = false }: RelevancyBadgeProps) {
    const text = compact ? (isRelevant ? 'R' : 'IR') : (isRelevant ? 'Relevant' : 'Irrelevant');
    const colorClasses = isRelevant
        ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 border-transparent"
        : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-transparent";

    return (
        <Badge className={cn(colorClasses)}>
            {text}
        </Badge>
    );
}
