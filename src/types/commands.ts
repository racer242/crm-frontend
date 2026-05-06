import { ElementPath, Condition } from "./base";

/** Тип команды */
export type CommandType =
  | "setState"
  | "mergeState"
  | "clearState"
  | "toggleState"
  | "setProperty"
  | "apiRequest"
  | "getData"
  | "setData"
  | "transformData"
  | "validateData"
  | "navigate"
  | "goBack"
  | "goForward"
  | "scrollTo"
  | "openUrl"
  | "showDialog"
  | "hideDialog"
  | "showToast"
  | "confirm"
  | "sequence"
  | "parallel"
  | "conditional"
  | "loop"
  | "delay"
  | "debounce"
  | "throttle"
  | "log"
  | "emit"
  | "custom"
  | "setUrlParams"
  | "setUrlParam"
  | "removeUrlParam";

/** Триггер выполнения команды */
export interface CommandTrigger {
  type: TriggerType;
  delay?: number;
  interval?: number;
  condition?: Condition;
}

/** Тип триггера */
export type TriggerType =
  | "onLoad"
  | "onUnload"
  | "onClick"
  | "onChange"
  | "onSubmit"
  | "onTimer"
  | "onCondition"
  | "manual";

/** Конфигурация повторов */
export interface RetryConfig {
  attempts: number;
  delay: number;
  backoff?: "linear" | "exponential";
}

/** Базовая команда */
export interface Command {
  id: string;
  type: CommandType;
  params: Record<string, any>;
  description?: string;
  trigger?: CommandTrigger;
  conditions?: Condition[];
  onSuccess?: Command[];
  onError?: Command[];
  timeout?: number;
  retry?: RetryConfig;
}
