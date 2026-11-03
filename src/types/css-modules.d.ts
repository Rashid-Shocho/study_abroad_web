// CSS modules (Next.js also writes this in next-env.d.ts once it has run).
declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}
