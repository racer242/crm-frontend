/**
 * Example JS Adapter: Analytics to Menu
 *
 * Transforms analytics data (e.g., {items: [{title, url, count}]})
 * into a menu/navigation format compatible with CRM components.
 *
 * Input:
 *   {
 *     items: [
 *       { title: "Dashboard", url: "/dashboard", count: 15 },
 *       { title: "Reports", url: "/reports", count: 8 }
 *     ]
 *   }
 *
 * Output:
 *   [
 *     { label: "Dashboard", command: { type: "navigate", params: { url: "/dashboard" } }, badge: 15 },
 *     { label: "Reports", command: { type: "navigate", params: { url: "/reports" } }, badge: 8 }
 *   ]
 */

function transform(data) {
  if (!data || !data.items) {
    return [];
  }

  return data.items.map((item) => ({
    label: item.title,
    command: {
      type: "navigate",
      params: { url: item.url },
    },
    badge: item.count || 0,
  }));
}
