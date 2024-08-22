export function cleanText(text: string, allowedChars: string): string {
    const allowedSet = new Set(allowedChars);
    const strayChars = new Set<string>(); // To store stray characters

    const cleanedText = [...text].filter(char => {
        if (allowedSet.has(char)) {
            return true;
        } else {
            strayChars.add(char);
            return false;
        }
    }).join('');

    // Log stray characters, if any
    if (strayChars.size > 0) {
        console.log("Stray characters found:", [...strayChars].join(''));
    }

    return cleanedText;
}