import { Icon } from "@/components/ui/icon";

export function Topbar() {
  return (
    <header className="fixed top-0 right-0 left-64 h-16 bg-surface-container-lowest flex items-center justify-between px-8 z-40">
      <div className="flex items-center gap-8">
        <span className="text-lg font-extrabold text-primary-container">
          Executive Monograph
        </span>
        <div className="relative hidden lg:block">
          <Icon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm"
          />
          <input
            type="text"
            placeholder="候補者、キーワードで検索..."
            className="pl-10 pr-4 py-1.5 bg-surface-container-low border-none rounded-lg text-sm w-80 focus:ring-2 focus:ring-primary-container focus:outline-none transition-all"
          />
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="text-outline hover:text-primary-container transition-all relative"
          >
            <Icon name="notifications" />
            <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full border-2 border-surface-container-lowest" />
          </button>
          <button
            type="button"
            className="text-outline hover:text-primary-container transition-all"
          >
            <Icon name="help" />
          </button>
        </div>
        <div className="h-8 w-[1px] bg-surface-container-high" />
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-primary-container">
            採用ダッシュボード
          </span>
          <Icon name="keyboard_arrow_down" className="text-outline" />
        </div>
      </div>
    </header>
  );
}
