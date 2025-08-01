// Utility to detect test framework for a file
export function detectFramework(filePath: string, content: string): 'cypress' | 'playwright' | null {
    if (filePath.toLowerCase().includes('cypress') || /cy\./.test(content)) return 'cypress';
    if (filePath.toLowerCase().includes('playwright') || /page\./.test(content)) return 'playwright';
    return null;
}
