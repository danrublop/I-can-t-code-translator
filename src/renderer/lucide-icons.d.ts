// Per-icon deep imports from lucide-react avoid bundling the whole ~1000-icon barrel,
// but ship no per-path .d.ts. Declare them here (typed as an SVG-ish React component).
declare module 'lucide-react/dist/esm/icons/*' {
  import { ComponentType, SVGProps } from 'react';
  const Icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;
  export default Icon;
}
