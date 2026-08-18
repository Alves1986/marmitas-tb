import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

type OfflineNoticeProps = { online?: boolean };

export function OfflineNotice({ online }: OfflineNoticeProps) {
  const [isOnline, setIsOnline] = useState(() => online ?? navigator.onLine);

  useEffect(() => {
    if (online !== undefined) {
      setIsOnline(online);
      return;
    }
    const setOnline = () => setIsOnline(true);
    const setOffline = () => setIsOnline(false);
    window.addEventListener("online", setOnline);
    window.addEventListener("offline", setOffline);
    return () => {
      window.removeEventListener("online", setOnline);
      window.removeEventListener("offline", setOffline);
    };
  }, [online]);

  if (isOnline) return null;
  return <p role="status" className="flex items-center justify-center gap-2 border-b border-[#e2cfae] bg-[#fff3dd] px-4 py-2 text-center text-xs font-semibold text-[#765f50]"><WifiOff className="size-3.5" /> Modo offline: você está vendo o último cardápio disponível. Para pedir ou acompanhar, reconecte-se à internet.</p>;
}
