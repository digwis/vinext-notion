import { headers } from "next/headers";
import { PublicSiteHeaderChrome } from "@/components/public/PublicSiteHeaderChrome";
import type { PublicNavLink } from "@/lib/public-navigation";

type Props = {
  navigationItems: PublicNavLink[];
};

/**
 * 服务端组件：从 headers 读 x-pathname（worker 注入），把它传给 Client chrome 用于高亮。
 * 拿不到 pathname 时（dev ssr 模式可能没有）就空着
 */
export async function PublicSiteHeader({ navigationItems }: Props) {
  const headerStore = await headers();
  const activePath = headerStore.get("x-pathname") ?? undefined;
  return (
    <PublicSiteHeaderChrome
      navigationItems={navigationItems}
      activePath={activePath}
    />
  );
}
