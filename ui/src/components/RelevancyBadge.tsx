import { cn } from '@/lib/utils';
import { CircleCheck, CircleX } from 'lucide-react';

interface RelevancyBadgeProps {
    isRelevant: boolean;
    compact?: boolean;
}

export function RelevancyBadge({ isRelevant, compact = false }: RelevancyBadgeProps) {
    return (
        <div className={
            compact ? "" :cn(
                    "inline-flex items-center justify-center gap-1.5 rounded-full text-xs font-medium px-2 py-1",
                    isRelevant
                        ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                        : "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-300"
                )}>
            <span className="inline-flex items-center leading-none">
                {isRelevant ? 
                    <CircleCheck size={16} className="text-green-600 dark:text-green-400" /> : 
                    <CircleX size={16} className="text-red-600 dark:text-red-400" />
                }
            </span>
            {!compact && (
                <span className="inline-flex items-center leading-none">{isRelevant ? 'Relevant' : 'Irrelevant'}</span>
            )}
        </div>
    );
}
