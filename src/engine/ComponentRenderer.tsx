"use client";

import React, { useEffect, useState } from "react";
import { Component } from "@/types";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { SplitButton } from "primereact/splitbutton";
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
import { useRef } from "react";

export function ComponentRenderer({ component }: { component: Component }) {
  const { componentType, props = {}, className, style } = component;
  const toastRef = useRef<Toast>(null);
  const router = useRouter();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleEvent = (eventType: string, eventValue: any) => {
    if (!component.events) return;
    const eventHandlers = component.events.filter((e) => e.event === eventType);
    eventHandlers.forEach((handler) => {
      handler.commands.forEach((cmd) => {
        console.log(`[Command] ${cmd.type}:`, cmd.params);
      });
    });
  };

  switch (componentType) {
    case "Text": {
      const level = props.level as number | undefined;
      const value = props.value as string;
      if (level === 1)
        return (
          <h1
            className={`text-3xl font-bold text-100 ${className || ""}`}
            style={style}
          >
            {value}
          </h1>
        );
      if (level === 2)
        return (
          <h2
            className={`text-2xl font-bold text-100 ${className || ""}`}
            style={style}
          >
            {value}
          </h2>
        );
      if (level === 3)
        return (
          <h3
            className={`text-xl font-bold text-100 ${className || ""}`}
            style={style}
          >
            {value}
          </h3>
        );
      return (
        <p className={`text-200 ${className || ""}`} style={style}>
          {value}
        </p>
      );
    }

    case "InputText":
      return (
        <InputText
          {...props}
          className={`w-full ${className || ""}`}
          style={style}
          onChange={(e) => handleEvent("onChange", { value: e.target.value })}
        />
      );

    case "InputNumber":
      return (
        <InputNumber
          {...props}
          className={`w-full ${className || ""}`}
          style={style}
          onValueChange={(e) => handleEvent("onChange", { value: e.value })}
        />
      );

    case "InputTextarea":
      return (
        <InputTextarea
          {...props}
          className={`w-full ${className || ""}`}
          style={style}
          onChange={(e) => handleEvent("onChange", { value: e.target.value })}
        />
      );

    case "Password":
      return (
        <Password
          {...props}
          className={`w-full ${className || ""}`}
          style={style}
          onChange={(e) => handleEvent("onChange", { value: e.target.value })}
        />
      );

    case "Dropdown":
      return (
        <Dropdown
          {...props}
          className={`w-full ${className || ""}`}
          style={style}
          onChange={(e) => handleEvent("onChange", { value: e.value })}
        />
      );

    case "MultiSelect":
      return (
        <MultiSelect
          {...props}
          className={`w-full ${className || ""}`}
          style={style}
          onChange={(e) => handleEvent("onChange", { value: e.value })}
        />
      );

    case "AutoComplete":
      return (
        <AutoComplete
          {...props}
          className={`w-full ${className || ""}`}
          style={style}
          completeMethod={(e) => {
            const suggestions = (props.suggestions || []).filter((s: string) =>
              s.toLowerCase().includes(e.query.toLowerCase()),
            );
          }}
          onChange={(e) => handleEvent("onChange", { value: e.value })}
        />
      );

    case "Calendar":
      return (
        <Calendar
          {...props}
          className={`w-full ${className || ""}`}
          style={style}
          onChange={(e) => handleEvent("onChange", { value: e.value })}
        />
      );

    case "Checkbox":
      return (
        <Checkbox
          {...props}
          checked={component.state?.value || false}
          className={className}
          style={style}
          onChange={(e) => handleEvent("onChange", { value: e.checked })}
        />
      );

    case "RadioButton":
      return (
        <RadioButton
          {...props}
          className={className}
          style={style}
          onChange={(e) => handleEvent("onChange", { value: e.value })}
        />
      );

    case "InputSwitch":
      return (
        <InputSwitch
          {...props}
          checked={component.state?.value || false}
          className={className}
          style={style}
          onChange={(e) => handleEvent("onChange", { value: e.value })}
        />
      );

    case "Slider":
      return (
        <Slider
          {...props}
          className={`w-full ${className || ""}`}
          style={style}
          onChange={(e) => handleEvent("onChange", { value: e.value })}
        />
      );

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
        <ColorPicker
          {...props}
          className={className}
          style={style}
          onChange={(e) => handleEvent("onChange", { value: e.value })}
        />
      );

    case "FileUpload":
      return (
        <FileUpload
          {...props}
          className={`w-full ${className || ""}`}
          style={style}
        />
      );

    case "Button":
      return (
        <Button
          {...props}
          className={className}
          style={style}
          onClick={(e) => handleEvent("onClick", e)}
        />
      );

    case "SplitButton":
      return (
        <SplitButton
          {...props}
          className={className}
          style={style}
          onClick={(e) => handleEvent("onClick", e)}
        />
      );

    case "DataTable":
      return (
        <DataTable
          {...props}
          value={props.value || []}
          className={className}
          style={style}
        >
          {props.columns?.map((col: any, index: number) => (
            <Column key={index} field={col.field} header={col.header} />
          ))}
        </DataTable>
      );

    case "Card":
      return (
        <Card {...props} className={className} style={style}>
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
      if (!isMounted)
        return <div className="h-3rem surface-800 border-round-md" />;
      return <Menubar model={menuModel} className={className} style={style} />;
    }

    case "Breadcrumb": {
      const breadcrumbModel = (props.model || []).map((item: any) => ({
        ...item,
        command: item.route ? () => router.push(item.route) : undefined,
      }));
      return (
        <BreadCrumb
          model={breadcrumbModel}
          className={className}
          style={style}
        />
      );
    }

    case "TabView": {
      const tabs = props.tabs || [];
      return (
        <TabView className={className} style={style}>
          {tabs.map((tab: any, index: number) => (
            <TabPanel key={index} header={tab.label}>
              {tab.content?.type === "table" ? (
                <DataTable value={tab.content.data || []} className="w-full">
                  {tab.content.columns?.map((col: any, i: number) => (
                    <Column key={i} field={col.field} header={col.header} />
                  ))}
                </DataTable>
              ) : (
                <p>{tab.content}</p>
              )}
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
          className={className}
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
          className={className}
          style={style}
          activeIndex={props.activeIndex}
        >
          {tabs.map((tab: any, index: number) => (
            <AccordionTab key={index} header={tab.header}>
              <p>{tab.content}</p>
            </AccordionTab>
          ))}
        </Accordion>
      );
    }

    case "Carousel":
      const carouselValue = props.value || [];
      return (
        <Carousel
          {...props}
          value={carouselValue}
          className={className}
          style={style}
          itemTemplate={(item: any) => (
            <div className="p-3 text-center">
              <p className="font-bold">{item.name}</p>
              <p className="text-500">Sales: {item.sales}</p>
            </div>
          )}
        />
      );

    case "Skeleton":
      return <Skeleton {...props} className={className} style={style} />;

    case "Chip":
      return <Chip {...props} className={className} style={style} />;

    case "Avatar":
      return <Avatar {...props} className={className} style={style} />;

    case "Badge":
      return <Badge {...props} className={className} style={style} />;

    case "Tag":
      return <Tag {...props} className={className} style={style} />;

    case "ProgressBar":
      return <ProgressBar {...props} className={className} style={style} />;

    case "ProgressSpinner":
      return <ProgressSpinner {...props} className={className} style={style} />;

    case "Message":
      return <Message {...props} className={className} style={style} />;

    case "Divider":
      return <Divider {...props} className={className} style={style} />;

    case "Timeline": {
      const timelineValue = props.value || [];
      return (
        <Timeline
          {...props}
          value={timelineValue}
          className={className}
          style={style}
          content={(item: any) => (
            <div>
              <p className="font-semibold">{item.status}</p>
              <small className="text-500">{item.date}</small>
            </div>
          )}
          marker={(item: any) => (
            <span
              className="flex w-2rem h-2rem align-items-center justify-content-center border-circle border-200"
              style={{ backgroundColor: item.color || "#6366f1" }}
            >
              <i className={item.icon} />
            </span>
          )}
        />
      );
    }

    case "Chart": {
      if (!isMounted) return <Skeleton width="100%" height="20rem" />;
      return <Chart {...props} className={className} style={style} />;
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
