export type AppSection =
  | 'overview'
  | 'markets'
  | 'swap'
  | 'portfolio'
  | 'activity'
  | 'watchlist'
  | 'settings';

export interface NavigationItem {
  id: AppSection;
  label: string;
}
