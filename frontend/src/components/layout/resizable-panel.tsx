import React from "react";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
  ImperativePanelHandle,
} from "react-resizable-panels";
import {
  VscChevronDown,
  VscChevronLeft,
  VscChevronRight,
  VscChevronUp,
} from "react-icons/vsc";
import { twMerge } from "tailwind-merge";
import { IconButton } from "../shared/buttons/icon-button";

export enum Orientation {
  HORIZONTAL = "horizontal",
  VERTICAL = "vertical",
}

type ResizablePanelProps = {
  firstChild: React.ReactNode;
  firstClassName?: string;
  secondChild: React.ReactNode;
  secondClassName?: string;
  className?: string;
  orientation: Orientation;
  initialSize: number;
};

export function ResizablePanel({
  firstChild,
  firstClassName,
  secondChild,
  secondClassName,
  className,
  orientation,
  initialSize,
}: ResizablePanelProps) {
  const firstPanelRef = React.useRef<ImperativePanelHandle>(null);
  const secondPanelRef = React.useRef<ImperativePanelHandle>(null);
  const [isFirstCollapsed, setIsFirstCollapsed] = React.useState(false);
  const [isSecondCollapsed, setIsSecondCollapsed] = React.useState(false);

  const isHorizontal = orientation === Orientation.HORIZONTAL;

  // Convert pixel size to percentage (assuming container is roughly 1000px wide/high)
  const initialSizePercent = Math.min(
    Math.max((initialSize / 1000) * 100, 10),
    90,
  );
  const secondSizePercent = 100 - initialSizePercent;

  const handleCollapseFirst = () => {
    if (isFirstCollapsed) {
      firstPanelRef.current?.expand();
      setIsFirstCollapsed(false);
    } else {
      firstPanelRef.current?.collapse();
      setIsFirstCollapsed(true);
    }
  };

  const handleCollapseSecond = () => {
    if (isSecondCollapsed) {
      secondPanelRef.current?.expand();
      setIsSecondCollapsed(false);
    } else {
      secondPanelRef.current?.collapse();
      setIsSecondCollapsed(true);
    }
  };

  return (
    <div className={twMerge("flex h-full w-full", className)}>
      <PanelGroup direction={isHorizontal ? "horizontal" : "vertical"}>
        <Panel
          ref={firstPanelRef}
          defaultSize={initialSizePercent}
          collapsible
          minSize={10}
          onCollapse={() => setIsFirstCollapsed(true)}
          onExpand={() => setIsFirstCollapsed(false)}
          className={twMerge(firstClassName, "transition-all ease-soft-spring")}
        >
          {firstChild}
        </Panel>

        <PanelResizeHandle
          className={`group ${
            isHorizontal
              ? "w-3 cursor-ew-resize flex-col"
              : "h-3 cursor-ns-resize flex-row"
          } shrink-0 flex justify-center items-center`}
        >
          <div className="flex items-center justify-center gap-1">
            <IconButton
              icon={isHorizontal ? <VscChevronLeft /> : <VscChevronUp />}
              ariaLabel="Collapse first panel"
              onClick={handleCollapseFirst}
            />
            <IconButton
              icon={isHorizontal ? <VscChevronRight /> : <VscChevronDown />}
              ariaLabel="Collapse second panel"
              onClick={handleCollapseSecond}
            />
          </div>
        </PanelResizeHandle>

        <Panel
          ref={secondPanelRef}
          defaultSize={secondSizePercent}
          collapsible
          minSize={10}
          onCollapse={() => setIsSecondCollapsed(true)}
          onExpand={() => setIsSecondCollapsed(false)}
          className={twMerge(
            secondClassName,
            "transition-all ease-soft-spring",
          )}
        >
          {secondChild}
        </Panel>
      </PanelGroup>
    </div>
  );
}
