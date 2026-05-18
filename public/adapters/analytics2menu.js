/**
 * JS Adapter: Analytics to Menu
 *
 * Transforms analytics data with nested sections and items
 * into a menu/navigation format compatible with PrimeReact Menubar.
 *
 * Input structure (public/mocks/api/stats/analytics.json):
 *   [
 *       {
 *         title: "Section name",
 *         items: [
 *           { title: "Download item", url: "http://..." },
 *           { title: "Subsection", items: [...] }  // nested sections
 *         ]
 *       }
 *   ]
 *
 *
 * Output: PrimeReact Menubar model with nested structure
 */

function transform(data) {
  if (!data) {
    return { analytics: [] };
  }

  function processItems(items) {
    if (!Array.isArray(items)) return [];

    return items.map((item) => {
      const menuItem = {
        label: item.title,
      };

      // If item has nested items, process them recursively
      if (item.items && Array.isArray(item.items)) {
        menuItem.items = processItems(item.items);
      }

      // If item has a URL, add it to the command for navigation
      if (item.url) {
        menuItem.commands = [
          {
            type: "downloadFile",
            params: {
              url: "/api/get-file",
              method: "GET",
              data: {
                file_type: "xlsx",
                file_id: item.file_name,
                time_stamp: "{$now.DD_MM_YYYY}",
              },
              filename: item.file_name,
            },
          },
        ];
      }

      return menuItem;
    });
  }

  return processItems(data);
}
