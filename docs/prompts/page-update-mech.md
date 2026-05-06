Система синхронизации URL параметров с state страницы. Вот план:

## 1. Сервер: парсинг URL → state.urlParams

**`src/app/[[...slug]]/page.tsx`**:

- Получаем `searchParams` из Next.js
- Передаём `urlParams` в `AppEngine`

**`src/core/config.ts`**:

- В `executeServerDataFeeds` добавляем `urlParams` в macro sources
- Разрешаем макросы `{$urlParams.startDate}` в URL/data dataFeed запросов

## 2. Клиент: AppEngine инициализирует state с urlParams

**`src/engine/AppEngine.tsx`**:

- При загрузке страницы добавляем `urlParams` в state страницы
- Передаём `urlParams` в `ComponentProvider`

## 3. Клиент: изменение компонентов → update state → URL

**`src/core/CommandExecutor.ts`**:

- Новый тип команды `updateUrlParams` — обновляет URL при изменении state
- Или можно использовать `setProperty` + эффект для синхронизации

## 4. Клиент: ре-загрузка dataFeed при изменении state

- При изменении параметров (дата) через команды, state обновляется
- Можно добавить watcher который реагирует на изменения и вызывает `sendRequest`

**Пример конфигурации:**

```json
{
  "dataFeed": [
    {
      "url": "{$config.baseURL}/api/stats?start={$urlParams.start}&end={$urlParams.end}",
      "target": "state.reviewData"
    }
  ]
}
```

**Пример команды при выборе даты:**

```json
{
  "type": "setProperty",
  "params": {
    "value": "{$event.value}",
    "target": "state.startDate"
  }
},
{
  "type": "updateUrlParams",
  "params": {
    "start": "{$state.startDate}"
  }
}
```

Переключайтесь в **Act mode** для реализации.
