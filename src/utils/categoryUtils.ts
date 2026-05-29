export const CATEGORY_COLORS = [
  '#93C5FD', // blue-300
  '#7DD3FC', // sky-300
  '#67E8F9', // cyan-300
  '#6EE7B7', // green-300
  '#BEF264', // lime-300
  '#FDE047', // yellow-300
  '#FDBA74', // orange-300
  '#F9A8D4', // pink-300
  '#FCA5A5', // red-300
  '#FDA4AF', // rose-300
] as const;

export const CATEGORY_NAMES = [
  'Синій', 'Блакитний', 'Бірюзовий', 'Зелений', 'Салатовий',
  'Жовтий', 'Помаранчевий', 'Рожевий', 'Червоний', 'Малиновий',
] as const;

export const getCategoryColor = (index: number | undefined): string =>
  index !== undefined && index >= 0 && index < CATEGORY_COLORS.length
    ? CATEGORY_COLORS[index]
    : 'transparent';

export const getCategoryName = (index: number | undefined): string =>
  index !== undefined && index >= 0 && index < CATEGORY_NAMES.length
    ? CATEGORY_NAMES[index]
    : 'Без категорії';
