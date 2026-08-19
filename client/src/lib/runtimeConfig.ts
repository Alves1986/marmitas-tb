export type RuntimeEnvironment = {
  apiRuntime: string | undefined;
  isProduction: boolean;
  hostname?: string;
};

export function isVercelRuntime(environment: RuntimeEnvironment = {
  apiRuntime: import.meta.env.VITE_API_RUNTIME,
  isProduction: import.meta.env.PROD,
  hostname: typeof window === "undefined" ? undefined : window.location.hostname,
}) {
  if (!environment.isProduction) return false;

  return environment.apiRuntime === "vercel" || environment.hostname?.endsWith(".vercel.app") === true;
}
