// 根路径：直接由 /[locale] 的 rewrite 渲染 zh 中文首页。
// 这里仅作为占位，确保 / 不返回 404
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/zh");
}
