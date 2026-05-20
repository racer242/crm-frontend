const rowsCount = 10;

/**
 * Трансформирует данные из формата review.json
 * в структуру компонента TabView с DataTable
 * @param {Array} data - массив секций из review.json
 * @returns {Object} конфигурация компонента TabView
 */
function transform(data) {
  return {
    tabs: data.map((section, index) => {
      const table = section.table;
      const tabId = `tab${index + 1}`;
      const header = (section.title || "").trim();

      // Columns: {id, title, type, props} → {field, header, sortable}
      const columns = (table.columns || []).map((col) => ({
        field: col.id,
        header: col.title,
        sortable: true,
      }));

      // Rows: {id, values, props} → flat object (spread values)
      const value = (table.rows || []).map((row) => ({
        ...row.values,
      }));

      return {
        id: tabId,
        props: { header },
        components: [
          {
            id: `${tabId}_table`,
            type: "component",
            componentType: "DataTable",
            props: {
              paginator: value.length > rowsCount,
              lazy: false,
              first: 0,
              rows: rowsCount,
              totalRecords: value.length,
              value,
              columns,
            },
          },
        ],
      };
    }),
  };
}
