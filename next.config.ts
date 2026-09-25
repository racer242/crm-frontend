import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  // Отключает кэш fetch-ответов в Server Components между HMR-обновлениями (dev).
  // По умолчанию (true) ответы dataFeed закэшированы в dev и router.refresh()
  // (команда "refresh", кнопки «Обновить») возвращает те же данные — страница
  // не обновляется. Кэш очищается только навигацией или полной перезагрузкой.
  experimental: {
    serverComponentsHmrCache: false,
  },
};

export default withNextIntl(nextConfig);
