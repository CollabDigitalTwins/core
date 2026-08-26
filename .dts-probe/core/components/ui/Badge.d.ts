import * as React from 'react';
declare const badgeVariants: (props?: {
    variant?: "default" | "destructive" | "outline" | "secondary";
} & import("class-variance-authority/types").ClassProp) => string;
interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}
declare function Badge({ className, variant, ...props }: BadgeProps): React.JSX.Element;
declare const ItemsBadgeButton: React.FC<{
    count: number;
    onClick: () => void;
}>;
export { Badge, badgeVariants, ItemsBadgeButton };
export type { BadgeProps };
//# sourceMappingURL=Badge.d.ts.map