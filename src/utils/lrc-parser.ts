

export interface LrcLine {
    lineTime: number; // Time in seconds
    text: string;
    style?: { [key: string]: string | number };
}

/**
 * Parses an LRC string into an array of LrcLine objects.
 * Format: [mm:ss.xx] Text {json:style}
 */
export const parseLrc = (lrcContent: string): LrcLine[] => {
    const lines = lrcContent.split('\n');
    const result: LrcLine[] = [];

    const timeRegex = /\[(\d{2}):(\d{2}(?:\.\d{2,3})?)\]/;
    const styleRegex = /\{(.*?)\}/;

    for (const line of lines) {
        const match = line.match(timeRegex);
        if (match) {
            const minutes = parseInt(match[1], 10);
            const seconds = parseFloat(match[2]);
            const totalSeconds = minutes * 60 + seconds;

            let text = line.replace(timeRegex, '').trim();
            let style: { [key: string]: string | number } | undefined;

            // Extract style tag
            const styleMatch = text.match(styleRegex);
            if (styleMatch) {
                const styleContent = styleMatch[1];
                text = text.replace(styleRegex, '').trim();

                // Parse style content "key:val, key2:val2"
                style = {};
                styleContent.split(',').forEach(pair => {
                    const [key, val] = pair.split(':').map(s => s.trim());
                    if (key && val) {
                        // Try to parse number
                        const numVal = parseFloat(val);
                        style![key] = isNaN(numVal) ? val : numVal;
                    }
                });
            }

            // Push result even if text is empty (for timing/clearing or style-only lines)
            result.push({
                lineTime: totalSeconds,
                text,
                style,
            });
        }
    }

    // Sort by time just in case
    return result.sort((a, b) => a.lineTime - b.lineTime);
};

/**
 * Finds the active lyric line for a given time.
 */
export const getCurrentLine = (
    lines: LrcLine[],
    currentTime: number
): LrcLine | null => {
    // Find the last line that has started
    for (let i = lines.length - 1; i >= 0; i--) {
        if (currentTime >= lines[i].lineTime) {
            return lines[i];
        }
    }
    return null;
};

