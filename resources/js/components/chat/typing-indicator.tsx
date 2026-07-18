export function TypingDots() {
    return (
        <span className="inline-flex items-center gap-0.5">
            <span className="size-1 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
            <span className="size-1 animate-bounce rounded-full bg-current [animation-delay:150ms]" />
            <span className="size-1 animate-bounce rounded-full bg-current [animation-delay:300ms]" />
        </span>
    );
}

export function typingLabel(names: string[]): string | null {
    if (names.length === 0) {
        return null;
    }

    if (names.length === 1) {
        return `${names[0]} is typing`;
    }

    if (names.length === 2) {
        return `${names[0]} and ${names[1]} are typing`;
    }

    return 'Several people are typing';
}