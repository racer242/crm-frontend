Ознакомься с реализацией
src\engine\components\DataTableComponent.tsx
src\engine\ComponentRenderer.tsx
С документацией docs\components-reference.md
С конфигурацией страницы с таблицей config\pages\users.json

Я хочу расширить возможность настраивать компонент таблицу "componentType": "DataTable"

Добавление кастомных столбцов (ячейки в таких столбцах содержат один или несколько компонентов - по аналогии с контейнерными компонентами или layout-компонентами - как в renderLayoutGroup в пропсах есть components, куда рендерятся компоненты)

    Вот пример, как это будет в файле конфигурации.

```json
    "props": {
      "customColumns":[
        { "field": "email",
          "header": "Email",
          "sortable": true,
          "order": 0,
          "body":[
            {
              "id": "sendButton",
              "type": "component",
              "componentType": "Button",
              "className": "min-w-max flex-grow-0 px-3",
              "props": {
                "icon": "pi pi-email",
                "severity": "primary",
                "outlined": true,
                "size": "small",
                "label": "Отправить"
              },
              "events": [
                {
                  "type": "onClick",
                  "commands": [
                    {
                      "type": "sendRequest",
                      "params": {
                        "data": {
                          "email":"{#field}",
                          "subject":"{#row.subject}"
                        }
                      }
                    }
                  ]
                }
              ]
            },
          ]
        }
      ]
    }
```

где:

- содержимое массива customColumns - столбцы, которые добавляются в таблицу. При этом, в rows также добавляется значение.
  Если в столбцах таблицы уже есть столбец с field=email поданный в список столюбцов columns, столбец не добавляется, а заменяется. Если такого столбца нет в таблице - вывод кастомного столбца игнорируется.
- Параметр order=0 - положение столбца относительно других. 0 - самый первый, -1 - самый последний, 1,2,3... - соответственно порядку позиционируется в списке столбцов
- Две ключевых сигнатуры - `{#field}` и `{#row.*}`:
  - `{#field}` — значение поля текущего столбца для данной строки
  - `{#row.путь}` — значение по пути из объекта всей строки (например, `{#row.subject}`)
    Синтаксис `{#...}` выбран для избежания конфликтов с системой линковки `@state.*`

Предложи решение.
