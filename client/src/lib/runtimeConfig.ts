export type RuntimeEnvironment = {
  apiRuntime: string | undefined;
  isProduction: boolean;
};

export function isVercelRuntime(environment: RuntimeEnvironment = {
  apiRuntime: import.meta.env.VITE_API_RUNTIME,
  isProduction: import.meta.env.PROD,
}) {
  return environment.apiRuntime === "vercel" && environment.isProduction;
}
