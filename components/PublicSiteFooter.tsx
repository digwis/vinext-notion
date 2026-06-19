import Link from "next/link";
import { siteBrand, footerLinks } from "@/lib/public-navigation";
import { getMessages } from "@/lib/i18n/get-messages";
import { isLocale, type Locale } from "@/lib/i18n/config";

type Props = {
  locale: string;
};

export function PublicSiteFooter({ locale }: Props) {
  const messages = getMessages(isLocale(locale) ? (locale as Locale) : "zh");
  const links = footerLinks(isLocale(locale) ? (locale as Locale) : "zh", messages);
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/40 bg-background/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <span>
          {messages.footer.copyright.replace("{year}", String(year))}
        </span>
        <div className="flex flex-wrap items-center gap-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <span className="text-xs text-muted-foreground/80">
            {siteBrand.name}
          </span>
        </div>
      </div>
    </footer>
  );
}
