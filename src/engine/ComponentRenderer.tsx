"use client";

import React, {
  useEffect,
  useState,
  useCallback,
  useRef as useReactRef,
  useRef,
} from "react";
import { Component, App } from "@/types";
import { InputText } from "primereact/inputtext";
import { LinkResolver, CommandExecutor } from "@/core";
import { Button } from "primereact/button";

import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Card } from "primereact/card";
import { Toast } from "primereact/toast";
import { Menubar } from "primereact/menubar";
import { BreadCrumb } from "primereact/breadcrumb";
import { TabView, TabPanel } from "primereact/tabview";
import { Steps } from "primereact/steps";
import { Accordion, AccordionTab } from "primereact/accordion";
import { Carousel } from "primereact/carousel";
import { Skeleton } from "primereact/skeleton";
import { Chip } from "primereact/chip";
import { Avatar } from "primereact/avatar";
import { Badge } from "primereact/badge";
import { Tag } from "primereact/tag";
import { ProgressBar } from "primereact/progressbar";
import { ProgressSpinner } from "primereact/progressspinner";
import { InputNumber } from "primereact/inputnumber";
import { InputTextarea } from "primereact/inputtextarea";
import { Password } from "primereact/password";
import { Dropdown } from "primereact/dropdown";
import { MultiSelect } from "primereact/multiselect";
import { AutoComplete } from "primereact/autocomplete";
import { Calendar } from "primereact/calendar";
import { Checkbox } from "primereact/checkbox";
import { RadioButton } from "primereact/radiobutton";
import { InputSwitch } from "primereact/inputswitch";
import { Slider } from "primereact/slider";
import { Rating } from "primereact/rating";
import { ColorPicker } from "primereact/colorpicker";
import { FileUpload } from "primereact/fileupload";
import { Message } from "primereact/message";
import { Divider } from "primereact/divider";
import { Timeline } from "primereact/timeline";
import { Chart } from "primereact/chart";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isIsoDateLike, parseDateString } from "@/utils/date";

// Тип контекста для команд (локальное определение)
type CommandExecutionContext = {
  pageId: string;
  triggerComponentId: string;
  appConfig: App;
  stateManager: any;
};

export function ComponentRenderer({
  component,
  pageId,
  appConfig,
  stateManager,
}: {
  component: Component;
  pageId?: string;
  appConfig?: App;
  stateManager?: any;
}) {
  const { componentType, props = {}, className, style } = component;
  const toastRef = useReactRef<Toast>(null);
  const router = useRouter();

  // Разрешенные значения для binding-ов
  const [resolvedValue, setResolvedValue] = useState<any>(undefined);
  const [resolvedVisible, setResolvedVisible] = useState<boolean | undefined>(
    undefined,
  );
  const [resolvedDisabled, setResolvedDisabled] = useState<boolean | undefined>(
    undefined,
  );

  // Контекст для исполнения команд
  const commandContextRef = useRef<CommandExecutionContext | null>(null);

  // Для Menubar/Chart
  const isMountedRef = useRef(false);

  // Создаем контекст для CommandExecutor при появлении страницы
  useEffect(() => {
    if (pageId && appConfig && stateManager) {
      commandContextRef.current = {
        pageId,
        triggerComponentId: component.id || "",
        appConfig,
        stateManager,
      };
    }
  }, [pageId, appConfig, stateManager, component.id]);

  // Функция разрешения binding-ов
  const resolveBindings = useCallback(() => {
    if (!appConfig || !pageId) return;

    const linkContext = {
      pageId,
      appConfig,
      componentMap: new Map(),
    };

    let resolvedVal: any = undefined;

    // Сначала проверяем valueBinding
    if (component.valueBinding) {
      resolvedVal = LinkResolver.resolve(component.valueBinding, linkContext);
    }
    // Затем проверяем component.value (для прямой ссылки вида @state.field)
    else if (component.value !== undefined) {
      if (
        typeof component.value === "string" &&
        component.value.startsWith("@")
      ) {
        resolvedVal = LinkResolver.resolve(component.value, linkContext);
      } else {
        resolvedVal = component.value;
      }
    }

    setResolvedValue(resolvedVal);

    // Разрешаем visibleBinding / visible
    if (component.visibleBinding) {
      setResolvedVisible(
        LinkResolver.resolve(component.visibleBinding, linkContext),
      );
    } else {
      setResolvedVisible(component.visible);
    }

    // Разрешаем disabledBinding / disabled
    if (component.disabledBinding) {
      setResolvedDisabled(
        LinkResolver.resolve(component.disabledBinding, linkContext),
      );
    } else {
      setResolvedDisabled(component.disabled);
    }
  }, [component, appConfig, pageId]);

  // Первоначальное разрешение binding-ов
  useEffect(() => {
    resolveBindings();
  }, [resolveBindings]);

  // Подписка на изменения stateManager для реактивности
  useEffect(() => {
    if (!stateManager) return;

    // Подписываемся на изменения состояния — при любом изменении перерезолвляем binding-и
    const unsubscribe = stateManager.subscribe(() => {
      resolveBindings();
    });

    return unsubscribe;
  }, [stateManager, resolveBindings]);

  const handleEvent = useCallback(
    (eventType: string, eventValue: any) => {
      if (!component.events || !commandContextRef.current) return;

      const eventHandlers = component.events.filter(
        (e) => e.event === eventType,
      );

      for (const handler of eventHandlers) {
        for (const cmd of handler.commands) {
          const executor = new CommandExecutor(commandContextRef.current);
          executor.executeCommand(cmd.type, cmd.params, eventValue);
        }
      }
    },
    [component.events],
  );

  // Обновляем флаг монтирования
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  switch (componentType) {
    case "Text": {
      const level = props.level as number | undefined;
      const value =
        resolvedValue !== undefined ? resolvedValue : (props.value as string);
      if (level === 1)
        return (
          <h1 className={className || ""} style={style}>
            {value}
          </h1>
        );
      if (level === 2)
        return (
          <h2 className={className || ""} style={style}>
            {value}
          </h2>
        );
      if (level === 3)
        return (
          <h3 className={className || ""} style={style}>
            {value}
          </h3>
        );
      return (
        <p className={className || ""} style={style}>
          {value}
        </p>
      );
    }

    case "InputText": {
      // Для контроллированных инпутов всегда задаем значение, чтобы избежать переключения между controlled/uncontrolled
      const defaultValue =
        resolvedValue !== undefined ? resolvedValue : (props.value ?? "");

      const inputProps = {
        ...props,
        value: defaultValue,
        disabled: resolvedDisabled ?? props.disabled,
        visible: resolvedVisible ?? props.visible,
      };
      return (
        <InputText
          {...inputProps}
          className={`field w-full ${className || ""}`}
          style={style}
          onChange={(e) => handleEvent("onChange", { value: e.target.value })}
        />
      );
    }

    case "InputNumber": {
      const inputNumberProps = {
        ...props,
        value: resolvedValue !== undefined ? resolvedValue : (props.value ?? 0),
        disabled: resolvedDisabled ?? props.disabled,
      };
      return (
        <InputNumber
          {...inputNumberProps}
          className={`field w-full ${className || ""}`}
          style={style}
          onValueChange={(e) => handleEvent("onChange", { value: e.value })}
        />
      );
    }

    case "InputTextarea": {
      const textareaProps = {
        ...props,
        value:
          resolvedValue !== undefined ? resolvedValue : (props.value ?? ""),
        disabled: resolvedDisabled ?? props.disabled,
      };
      return (
        <InputTextarea
          {...textareaProps}
          className={`field w-full ${className || ""}`}
          style={style}
          onChange={(e) => handleEvent("onChange", { value: e.target.value })}
        />
      );
    }

    case "Password": {
      const passwordProps = {
        ...props,
        value:
          resolvedValue !== undefined ? resolvedValue : (props.value ?? ""),
        disabled: resolvedDisabled ?? props.disabled,
      };
      return (
        <Password
          {...passwordProps}
          className={`field w-full ${className || ""}`}
          style={style}
          onChange={(e) => handleEvent("onChange", { value: e.target.value })}
        />
      );
    }

    case "Dropdown": {
      const dropdownProps = {
        ...props,
        value:
          resolvedValue !== undefined ? resolvedValue : (props.value ?? null),
        disabled: resolvedDisabled ?? props.disabled,
      };
      return (
        <Dropdown
          {...dropdownProps}
          className={`field w-full ${className || ""}`}
          style={style}
          onChange={(e) => handleEvent("onChange", { value: e.value })}
        />
      );
    }

    case "MultiSelect": {
      const multiSelectProps = {
        ...props,
        value:
          resolvedValue !== undefined ? resolvedValue : (props.value ?? []),
        disabled: resolvedDisabled ?? props.disabled,
      };
      return (
        <MultiSelect
          {...multiSelectProps}
          className={`field w-full ${className || ""}`}
          style={style}
          onChange={(e) => handleEvent("onChange", { value: e.value })}
        />
      );
    }

    case "AutoComplete": {
      const autoCompleteProps = {
        ...props,
        value:
          resolvedValue !== undefined ? resolvedValue : (props.value ?? ""),
        disabled: resolvedDisabled ?? props.disabled,
      };
      return (
        <AutoComplete
          {...autoCompleteProps}
          className={`field w-full ${className || ""}`}
          style={style}
          completeMethod={(e) => {
            const suggestions = (props.suggestions || []).filter((s: string) =>
              s.toLowerCase().includes(e.query.toLowerCase()),
            );
          }}
          onChange={(e) => handleEvent("onChange", { value: e.value })}
        />
      );
    }

    case "Calendar": {
      // Преобразуем значение для Calendar - принимает Date объект
      let calendarValue: any =
        resolvedValue !== undefined ? resolvedValue : props.value;

      // Конвертация строки в Date объект
      if (typeof calendarValue === "string" && calendarValue.trim() !== "") {
        // Сначала пробуем parseDateString (для формата dd.mm.yyyy HH:mm)
        const parsedDate = parseDateString(calendarValue);
        if (parsedDate) {
          calendarValue = parsedDate;
        } else if (isIsoDateLike(calendarValue)) {
          // ISO строка — конвертируем в Date
          const date = new Date(calendarValue);
          if (!isNaN(date.getTime())) {
            calendarValue = date;
          }
        }
      }

      // Устанавливаем формат даты если не указан
      const dateFormat = props.dateFormat || "dd.mm.yy";

      const calendarProps = {
        ...props,
        value: calendarValue,
        disabled: resolvedDisabled ?? props.disabled,
        dateFormat,
      };
      return (
        <Calendar
          {...calendarProps}
          className={`field w-full ${className || ""}`}
          style={style}
          onChange={(e) => handleEvent("onChange", { value: e.value })}
        />
      );
    }

    case "Checkbox": {
      const checkboxProps = {
        ...props,
        checked:
          resolvedValue !== undefined
            ? resolvedValue
            : component.state?.value || false,
        disabled: resolvedDisabled ?? props.disabled,
        visible: resolvedVisible ?? props.visible,
      };
      return (
        <div className="mb-2 flex align-items-center">
          <Checkbox
            {...checkboxProps}
            className={className}
            style={style}
            onChange={(e) => handleEvent("onChange", { value: e.checked })}
          />
          {props.label && (
            <label className="ml-2 text-200">{props.label as string}</label>
          )}
        </div>
      );
    }

    case "RadioButton": {
      const radioButtonProps = {
        ...props,
        value: resolvedValue !== undefined ? resolvedValue : props.value,
        disabled: resolvedDisabled ?? props.disabled,
      };
      return (
        <div className="field flex align-items-center">
          <RadioButton
            {...radioButtonProps}
            className={className}
            style={style}
            onChange={(e) => handleEvent("onChange", { value: e.value })}
          />
          {props.label && (
            <label className="ml-2 text-200">{props.label as string}</label>
          )}
        </div>
      );
    }

    case "InputSwitch": {
      const inputSwitchProps = {
        ...props,
        checked:
          resolvedValue !== undefined
            ? resolvedValue
            : component.state?.value || false,
        disabled: resolvedDisabled ?? props.disabled,
        visible: resolvedVisible ?? props.visible,
      };
      return (
        <div className="field flex align-items-center">
          <InputSwitch
            {...inputSwitchProps}
            className={className}
            style={style}
            onChange={(e) => handleEvent("onChange", { value: e.value })}
          />
          {props.label && (
            <label className="ml-2 text-200">{props.label as string}</label>
          )}
        </div>
      );
    }

    case "Slider": {
      const sliderProps = {
        ...props,
        value: resolvedValue !== undefined ? resolvedValue : props.value,
        disabled: resolvedDisabled ?? props.disabled,
      };
      return (
        <Slider
          {...sliderProps}
          className={`field w-full ${className || ""}`}
          style={style}
          onChange={(e) => handleEvent("onChange", { value: e.value })}
        />
      );
    }

    case "Rating":
      return (
        <Rating
          {...props}
          className={className}
          style={style}
          onChange={(e) => handleEvent("onChange", { value: e.value })}
        />
      );

    case "ColorPicker":
      return (
        <div className="flex align-items-center mb-2">
          <ColorPicker
            {...props}
            className={className}
            style={style}
            onChange={(e) => handleEvent("onChange", { value: e.value })}
          />
        </div>
      );

    case "FileUpload":
      return (
        <div className="mb-3">
          <FileUpload
            {...props}
            className={`w-full ${className || ""}`}
            style={style}
          />
        </div>
      );

    case "Button":
      return (
        <Button
          {...props}
          className={className || ""}
          style={style}
          onClick={(e) => handleEvent("onClick", e)}
        />
      );

    case "DataTable":
      return (
        <DataTable
          {...props}
          value={props.value || []}
          className={`w-full ${className || ""}`}
          style={style}
        >
          {props.columns?.map((col: any, index: number) => (
            <Column key={index} field={col.field} header={col.header} />
          ))}
        </DataTable>
      );

    case "Card":
      return (
        <Card {...props} className={className || ""} style={style}>
          {component.state?.data}
        </Card>
      );

    case "Toast":
      return <Toast ref={toastRef} className={className} style={style} />;

    case "Menubar": {
      const menuModel = (props.model || []).map((item: any) => ({
        ...item,
        template: item.route ? (
          <Link
            href={item.route}
            className="p-menuitem-link flex align-items-center gap-2"
          >
            {item.icon && <i className={item.icon}></i>}
            <span className="p-menuitem-text">{item.label}</span>
          </Link>
        ) : undefined,
        command: item.route ? () => router.push(item.route) : undefined,
      }));
      if (!isMountedRef.current)
        return <div className="h-3rem surface-800 border-round-md" />;
      return (
        <Menubar
          model={menuModel}
          className={`w-full mb-4 ${className || ""}`}
          style={style}
        />
      );
    }

    case "Breadcrumb": {
      const breadcrumbModel = (props.model || []).map((item: any) => ({
        ...item,
        command: item.route ? () => router.push(item.route) : undefined,
      }));
      return (
        <BreadCrumb
          model={breadcrumbModel}
          className={`mb-4 ${className || ""}`}
          style={style}
        />
      );
    }

    case "TabView": {
      const tabs = props.tabs || [];
      return (
        <TabView className={`mb-4 ${className || ""}`} style={style}>
          {tabs.map((tab: any, index: number) => (
            <TabPanel key={index} header={tab.label}>
              <div className="p-3">
                {tab.content?.type === "table" ? (
                  <DataTable value={tab.content.data || []} className="w-full">
                    {tab.content.columns?.map((col: any, i: number) => (
                      <Column key={i} field={col.field} header={col.header} />
                    ))}
                  </DataTable>
                ) : (
                  <p className="text-300 m-0">{tab.content}</p>
                )}
              </div>
            </TabPanel>
          ))}
        </TabView>
      );
    }

    case "Steps": {
      const stepsModel = (props.model || []).map((item: any) => ({
        label: item.label,
        icon: item.icon,
        command: item.route ? () => router.push(item.route) : undefined,
      }));
      return (
        <Steps
          model={stepsModel}
          className={className || ""}
          style={style}
          activeIndex={props.activeIndex || 0}
          readOnly={props.readOnly !== false}
        />
      );
    }

    case "Accordion": {
      const tabs = props.tabs || [];
      return (
        <Accordion
          className={className || ""}
          style={style}
          activeIndex={props.activeIndex}
        >
          {tabs.map((tab: any, index: number) => (
            <AccordionTab key={index} header={tab.header}>
              <p className="text-300 m-0">{tab.content}</p>
            </AccordionTab>
          ))}
        </Accordion>
      );
    }

    case "Carousel": {
      const carouselValue = props.value || [];
      return (
        <Carousel
          {...props}
          value={carouselValue}
          className={`mb-4 ${className || ""}`}
          style={style}
          itemTemplate={(item: any) => (
            <div className="p-4 text-center surface-800 border-round-md mx-2">
              <p className="font-bold text-100 mb-1">{item.name}</p>
              <p className="text-400 text-sm">Sales: {item.sales}</p>
            </div>
          )}
        />
      );
    }

    case "Skeleton":
      return (
        <Skeleton
          {...props}
          className={`${className || ""} mb-2`}
          style={style}
        />
      );

    case "Chip":
      return (
        <Chip
          {...props}
          className={`${className || ""} mr-2 mb-2`}
          style={style}
        />
      );

    case "Avatar":
      return (
        <Avatar
          {...props}
          className={`${className || ""} mr-2`}
          style={style}
        />
      );

    case "Badge":
      return <Badge {...props} className={className || ""} style={style} />;

    case "Tag":
      return <Tag {...props} className={className || ""} style={style} />;

    case "ProgressBar":
      return (
        <ProgressBar
          {...props}
          className={`${className || ""} mb-3`}
          style={style}
        />
      );

    case "ProgressSpinner":
      return (
        <div className="flex justify-content-center mb-3">
          <ProgressSpinner {...props} className={className} style={style} />
        </div>
      );

    case "Message":
      return (
        <Message
          {...props}
          className={`${className || ""} mb-3`}
          style={style}
        />
      );

    case "Divider":
      return (
        <Divider
          {...props}
          className={`${className || ""} my-4`}
          style={style}
        />
      );

    case "Timeline": {
      const timelineValue = props.value || [];
      return (
        <div className={`${className || ""} mb-3`} style={style}>
          <Timeline
            value={timelineValue}
            content={(item: any) => (
              <div className="flex flex-column align-items-start">
                <span className="font-semibold text-100 mb-1">
                  {item.status}
                </span>
                <small className="text-500">{item.date}</small>
              </div>
            )}
            marker={(item: any) => (
              <span
                className="flex w-2rem h-2rem align-items-center justify-content-center border-circle text-white"
                style={{
                  backgroundColor: item.color || "var(--primary-color)",
                }}
              >
                <i className={item.icon} />
              </span>
            )}
          />
        </div>
      );
    }

    case "Chart": {
      if (!isMountedRef.current)
        return <Skeleton width="100%" height="20rem" />;
      return (
        <div className="mb-4">
          <Chart {...props} className={`${className || ""}`} style={style} />
        </div>
      );
    }

    default:
      return (
        <div className={className} style={style}>
          <p className="text-500 text-sm">
            [Component: {componentType} - Not implemented]
          </p>
        </div>
      );
  }
}
