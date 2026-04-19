
/**
 * Simple phonetic normalization for Indian names and items.
 * Handles common variations like 'v'/'w', 's'/'sh', 'ee'/'i', 'oo'/'u', 'z'/'j'.
 */
export const normalizePhonetic = (str: string): string => {
    if (!str) return '';
    return str.toLowerCase()
        .replace(/\s+/g, '')
        .replace(/ph/g, 'f')
        .replace(/v/g, 'w')
        .replace(/sh/g, 's')
        .replace(/z/g, 'j')
        .replace(/ee/g, 'i')
        .replace(/oo/g, 'u')
        .replace(/y/g, 'i')
        .replace(/aa/g, 'a')
        .replace(/th/g, 't')
        .replace(/kh/g, 'k')
        .replace(/gh/g, 'g')
        .replace(/bh/g, 'b')
        .replace(/dh/g, 'd')
        .replace(/ch/g, 'c')
        .replace(/jh/g, 'j')
        .replace(/ll/g, 'l')
        .replace(/rr/g, 'r')
        .replace(/tt/g, 't')
        .replace(/dd/g, 'd')
        .replace(/nn/g, 'n')
        .replace(/mm/g, 'm')
        .replace(/pp/g, 'p')
        .replace(/bb/g, 'b')
        .replace(/ss/g, 's');
};

/**
 * Checks if a search term matches a target string using phonetic normalization.
 */
export const matchesPhonetic = (search: string, target: string): boolean => {
    if (!search || !target) return false;
    const normalizedSearch = normalizePhonetic(search);
    const normalizedTarget = normalizePhonetic(target);
    return normalizedTarget.includes(normalizedSearch);
};

/**
 * Fuzzy search that combines exact match, prefix match, and phonetic match.
 */
export const fuzzySearch = (search: string, target: string): boolean => {
    if (!search) return true;
    const lowerSearch = search.toLowerCase();
    const lowerTarget = target.toLowerCase();
    
    // Exact or prefix match
    if (lowerTarget.includes(lowerSearch)) return true;
    
    // Phonetic match
    return matchesPhonetic(search, target);
};

/**
 * Advanced search that splits the search term into multiple words 
 * and checks if each word matches at least one of the provided targets.
 */
export const multiTermSearch = (search: string, targets: (string | string[] | undefined)[]): boolean => {
    if (!search) return true;
    const searchTerms = search.toLowerCase().split(/\s+/).filter(Boolean);
    if (searchTerms.length === 0) return true;

    // Flatten all targets into a single array of strings
    const allTargets: string[] = [];
    targets.forEach(t => {
        if (typeof t === 'string') {
            allTargets.push(t.toLowerCase());
        } else if (Array.isArray(t)) {
            t.forEach(item => {
                if (typeof item === 'string') allTargets.push(item.toLowerCase());
            });
        }
    });

    // Every search term must match at least one target
    return searchTerms.every(term => {
        return allTargets.some(target => {
            // Check exact/prefix match
            if (target.includes(term)) return true;
            // Check phonetic match
            return matchesPhonetic(term, target);
        });
    });
};
