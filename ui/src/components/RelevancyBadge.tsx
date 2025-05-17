import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface RelevancyBadgeProps {
    isRelevant: boolean;
    compact?: boolean;
}

export function RelevancyBadge({ isRelevant, compact = false }: RelevancyBadgeProps) {
    const text = compact ? (isRelevant ? 'R' : 'IR') : (isRelevant ? 'Relevant' : 'Irrelevant');
    const colorClasses = isRelevant
        ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 border-transparent"
        : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-transparent";
    const tooltipText = isRelevant ? 'Post classified as relevant' : 'Post classified as irrelevant';

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Badge className={cn(colorClasses)}>
                        {text}
                    </Badge>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{tooltipText}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
