const PRIMARY_CATEGORIES = new Set([
  'sunglasses',
  'eyeglasses',
  'anti blue',
  'anti-blue',
  'anti blue glasses',
  'anti-blue glasses',
  'anti blue glasses for kids',
  'accessories',
  'goggles',
  'polarized',
  'clip on',
  'clip-on',
  'photochromic',
  'memory metal',
  'kids eyewear',
  'sports',
  'hand-painted',
  'frame only',
  '3d printed',
  'flash sale',
  'bundles',
  'memorial',
  'reading glasses',
  'computer glasses',
  'blue light blocking',
  'progressive',
  'bifocal',
]);

const SUPPLIER_INITIALS = new Set([
  'mq', 'qc', 'zhj', 'pg', 'mo', 'zh',
]);

const CATEGORY_NORMALIZATIONS: Record<string, string> = {
  'anti blue': 'ANTI BLUE',
  'anti-blue': 'ANTI BLUE',
  'anti blue glasses': 'ANTI BLUE',
  'anti-blue glasses': 'ANTI BLUE',
  'anti blue glasses for kids': 'Anti Blue - Kids',
  'clip on': 'Clip On',
  'clip-on': 'Clip On',
  'hand-painted': 'Hand-painted',
  'frame only': 'Frame Only',
  '3d printed': '3D Printed',
  'flash sale': 'Flash Sale',
  'kids eyewear': 'Kids Eyewear',
  'reading glasses': 'Reading Glasses',
  'computer glasses': 'Computer Glasses',
  'blue light blocking': 'Blue Light Blocking',
  'memory metal': 'Memory Metal',
};

function normalizeCategory(raw: string): string {
  const lower = raw.toLowerCase();
  if (CATEGORY_NORMALIZATIONS[lower]) return CATEGORY_NORMALIZATIONS[lower];
  return raw
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export interface ParsedCategory {
  category: string | null;
  tags: string[];
}

export function parseWooCategory(rawCategory: string | null | undefined): ParsedCategory {
  if (!rawCategory || !rawCategory.trim()) {
    return { category: null, tags: [] };
  }

  const tokens = rawCategory
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0)
    .filter(t => !t.includes('>'));

  const primaryTokens: string[] = [];
  const tagTokens: string[] = [];

  for (const token of tokens) {
    const lower = token.toLowerCase();

    if (SUPPLIER_INITIALS.has(lower)) continue;

    if (PRIMARY_CATEGORIES.has(lower)) {
      primaryTokens.push(token);
    } else {
      tagTokens.push(token);
    }
  }

  let category: string | null = null;
  const remainingTags: string[] = [...tagTokens];

  if (primaryTokens.length > 0) {
    category = normalizeCategory(primaryTokens[0]);
    if (primaryTokens.length > 1) {
      for (let i = 1; i < primaryTokens.length; i++) {
        remainingTags.push(normalizeCategory(primaryTokens[i]));
      }
    }
  }

  const tags = remainingTags
    .map(t => {
      const words = t.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      return words;
    })
    .filter((t, i, arr) => arr.indexOf(t) === i);

  return { category, tags };
}
