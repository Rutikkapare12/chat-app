import { Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';

export function ChatAvatar({
    name,
    avatarUrl,
    isGroup = false,
    online = false,
    className,
}: {
    name: string;
    avatarUrl: string | null;
    isGroup?: boolean;
    online?: boolean;
    className?: string;
}) {
    const getInitials = useInitials();

    return (
        <div className="relative shrink-0">
            <Avatar className={cn('size-10', className)}>
                {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
                <AvatarFallback className="bg-primary/10 text-primary">
                    {isGroup ? <Users className="size-4" /> : getInitials(name)}
                </AvatarFallback>
            </Avatar>
            {online && (
                <span className="absolute right-0 bottom-0 block size-3 rounded-full border-2 border-background bg-emerald-500" />
            )}
        </div>
    );
}