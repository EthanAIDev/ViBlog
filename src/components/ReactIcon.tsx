import { iconPaths } from '../lib/icons';
export default function ReactIcon({ name = 'arrow', size = 20 }: { name?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={iconPaths[name] || iconPaths.arrow}/></svg>;
}
