"use client";
import {
  Children,
  forwardRef,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { CheckIcon, ChevronDownIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
type Option = { value: string; label: string; disabled?: boolean };
type Props = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "multiple" | "size"
> & { options?: readonly Option[]; placeholder?: string; portalContainer?: Element | null };
function text(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) =>
      isValidElement<{ children?: ReactNode }>(child)
        ? text(child.props.children)
        : String(child ?? ""),
    )
    .join("");
}
function readOptions(children: ReactNode, inherited = false): Option[] {
  const result: Option[] = [];
  Children.forEach(children, (child) => {
    if (
      !isValidElement<{
        value?: string | number;
        children?: ReactNode;
        disabled?: boolean;
      }>(child)
    )
      return;
    if (child.type === "option")
      result.push({
        value: String(child.props.value ?? text(child.props.children)),
        label: text(child.props.children),
        disabled: inherited || child.props.disabled,
      });
    else
      result.push(
        ...readOptions(child.props.children, inherited || child.props.disabled),
      );
  });
  return result;
}
/** Native form values with a keyboard/touch accessible clay listbox. */
export const DynamicSelect = forwardRef<HTMLSelectElement, Props>(
  function DynamicSelect(
    {
      options: provided,
      children,
      className,
      placeholder,
      value,
      defaultValue,
      id: explicitId,
      onChange,
      onInvalid,
      portalContainer,
      ...props
    },
    forwardedRef,
  ) {
    const generated = useId(),
      id = explicitId ?? `select-${generated}`,
      listId = `${id}-options`;
    const options = useMemo(
      () => (provided ? [...provided] : readOptions(children)),
      [provided, children],
    );
    const initial = String(defaultValue ?? options[0]?.value ?? "");
    const [internal, setInternal] = useState(initial),
      [open, setOpen] = useState(false),
      [active, setActive] = useState(0);
    const [position, setPosition] = useState<{ left: number; top?: number; bottom?: number; width: number; maxHeight: number }>({
      left: 0,
      top: 0,
      width: 0,
      maxHeight: 300,
    });
    const native = useRef<HTMLSelectElement | null>(null),
      trigger = useRef<HTMLButtonElement>(null),
      list = useRef<HTMLDivElement>(null),
      anchor = useRef({ left: 0, top: 0 }),
      typeahead = useRef({ value: "", at: 0 });
    const selected = value === undefined ? internal : String(value),
      label =
        options.find((option) => option.value === selected)?.label ??
        placeholder ??
        "Select an option";
    function choose(index: number) {
      const option = options[index];
      if (!option || option.disabled || native.current?.matches(":disabled"))
        return;
      if (native.current) {
        native.current.value = option.value;
        native.current.dispatchEvent(new Event("change", { bubbles: true }));
      }
      setOpen(false);
      trigger.current?.focus({ preventScroll: true });
    }
    function show(index?: number) {
      if (native.current?.matches(":disabled") || !trigger.current) return;
      const rect = trigger.current.getBoundingClientRect(),
        roomBelow = innerHeight - rect.bottom - 12,
        roomAbove = rect.top - 12,
        below = roomBelow >= 180 || roomBelow >= roomAbove,
        height = Math.max(80, Math.min(300, below ? roomBelow : roomAbove));
      anchor.current = { left: rect.left, top: rect.top };
      setPosition({
        left: Math.max(
          8,
          Math.min(
            rect.left,
            innerWidth - Math.min(rect.width, innerWidth - 16) - 8,
          ),
        ),
        ...(below ? { top: rect.bottom + 6 } : { bottom: innerHeight - rect.top + 6 }),
        width: Math.min(rect.width, innerWidth - 16),
        maxHeight: height,
      });
      const current = options.findIndex(
        (option) => option.value === selected && !option.disabled,
      );
      setActive(
        index ??
          (current >= 0
            ? current
            : options.findIndex((option) => !option.disabled)),
      );
      setOpen(true);
    }
    useEffect(() => {
      if (!open) return;
      const close = (event: Event) => {
        const target = event.target as Node;
        if (
          !trigger.current?.contains(target) &&
          !list.current?.contains(target)
        )
          setOpen(false);
      };
      const scrolled = () => {
        const rect = trigger.current?.getBoundingClientRect();
        if (!rect || Math.abs(rect.top - anchor.current.top) > 2 || Math.abs(rect.left - anchor.current.left) > 2) setOpen(false);
      };
      const resized = () => setOpen(false);
      document.addEventListener("pointerdown", close);
      window.addEventListener("scroll", scrolled, true);
      window.addEventListener("resize", resized);
      return () => {
        document.removeEventListener("pointerdown", close);
        window.removeEventListener("scroll", scrolled, true);
        window.removeEventListener("resize", resized);
      };
    }, [open]);
    useEffect(() => {
      if (!open) return;
      const container = list.current;
      const option = container?.querySelector<HTMLElement>(`[data-option-index="${active}"]`);
      if (!container || !option) return;
      if (option.offsetTop < container.scrollTop) container.scrollTop = option.offsetTop;
      else if (option.offsetTop + option.offsetHeight > container.scrollTop + container.clientHeight) container.scrollTop = option.offsetTop + option.offsetHeight - container.clientHeight;
    }, [active, open]);
    useEffect(() => {
      const form = native.current?.form;
      const reset = () => setInternal(initial);
      form?.addEventListener("reset", reset);
      return () => form?.removeEventListener("reset", reset);
    }, [initial]);
    function changed(event: ChangeEvent<HTMLSelectElement>) {
      if (value === undefined) setInternal(event.currentTarget.value);
      onChange?.(event);
    }
    return (
      <span className="dynamic-select">
        <select
          {...props}
          id={`${id}-native`}
          aria-hidden="true"
          tabIndex={-1}
          className="dynamic-select-native"
          value={selected}
          ref={(element) => {
            native.current = element;
            if (typeof forwardedRef === "function") forwardedRef(element);
            else if (forwardedRef) forwardedRef.current = element;
          }}
          onChange={changed}
          onFocus={() => trigger.current?.focus()}
          onInvalid={(event) => {
            event.preventDefault();
            trigger.current?.focus();
            onInvalid?.(event);
          }}
        >
          {provided
            ? provided.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </option>
              ))
            : children}
        </select>
        <button
          ref={trigger}
          type="button"
          id={id}
          role="combobox"
          className={cn("dynamic-select-trigger neo-input-wrap", className)}
          disabled={props.disabled}
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-haspopup="listbox"
          aria-activedescendant={
            open && active >= 0 ? `${listId}-${active}` : undefined
          }
          aria-label={props["aria-label"]}
          aria-labelledby={props["aria-labelledby"]}
          aria-describedby={props["aria-describedby"]}
          aria-invalid={props["aria-invalid"]}
          aria-required={props.required}
          onClick={() => (open ? setOpen(false) : show())}
          onKeyDown={(event) => {
            if (event.key === "Escape" && open) {
              event.preventDefault();
              event.stopPropagation();
              setOpen(false);
              return;
            }
            if (event.key === "Tab") {
              setOpen(false);
              return;
            }
            if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
              event.preventDefault();
              const enabled = options
                .map((option, index) => (!option.disabled ? index : -1))
                .filter((index) => index >= 0);
              if (!enabled.length) return;
              const current = enabled.indexOf(active),
                next =
                  event.key === "Home"
                    ? enabled[0]
                    : event.key === "End"
                      ? enabled[enabled.length - 1]
                      : enabled[
                          (Math.max(0, current) +
                            (event.key === "ArrowDown" ? 1 : -1) +
                            enabled.length) %
                            enabled.length
                        ];
              if (open) setActive(next);
              else show();
              return;
            }
            if ((event.key === "Enter" || event.key === " ") && open) {
              event.preventDefault();
              event.stopPropagation();
              choose(active);
              return;
            }
            if (
              event.key.length === 1 &&
              event.key !== " " &&
              !event.ctrlKey &&
              !event.metaKey
            ) {
              const now = Date.now();
              typeahead.current.value =
                (now - typeahead.current.at < 650
                  ? typeahead.current.value
                  : "") + event.key.toLowerCase();
              typeahead.current.at = now;
              const found = options.findIndex(
                (option) =>
                  !option.disabled &&
                  option.label
                    .toLowerCase()
                    .startsWith(typeahead.current.value),
              );
              if (found >= 0) {
                event.preventDefault();
                if (open) setActive(found);
                else show(found);
              }
            }
          }}
        >
          <span>{label}</span>
          <ChevronDownIcon />
        </button>
        {open &&
          createPortal(
            <div
              ref={list}
              id={listId}
              role="listbox"
              className="dynamic-select-list"
              style={position}
              aria-label={props["aria-label"] ?? "Options"}
              onMouseDown={(event) => event.preventDefault()}
            >
              {options.map((option, index) => (
                <div
                  key={`${option.value}-${index}`}
                  id={`${listId}-${index}`}
                  role="option"
                  data-option-index={index}
                  aria-selected={option.value === selected}
                  aria-disabled={option.disabled || undefined}
                  className={cn(
                    "dynamic-select-option",
                    index === active && "dynamic-select-option-active",
                  )}
                  onPointerMove={(event) => {
                    if (event.pointerType === "mouse" && !option.disabled) setActive(index);
                  }}
                  onClick={() => choose(index)}
                >
                  <span>{option.label}</span>
                  {option.value === selected && <CheckIcon />}
                </div>
              ))}
            </div>,
            portalContainer ?? document.body,
          )}
      </span>
    );
  },
);
