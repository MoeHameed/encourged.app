import Link from "next/link";

export function MobileBottomNav({ inGroup }: { inGroup: boolean }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-around border-t bg-background p-2 sm:hidden">
      <Link href="/app" className="flex flex-col items-center px-3 py-1 text-xs">
        Home
      </Link>
      {inGroup && (
        <Link
          href="/app/group"
          className="flex flex-col items-center px-3 py-1 text-xs"
        >
          Group
        </Link>
      )}
      <Link
        href="/app/notifications"
        className="flex flex-col items-center px-3 py-1 text-xs"
      >
        Notifications
      </Link>
    </nav>
  );
}
