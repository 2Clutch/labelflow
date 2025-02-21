import React from "react";
import {
  Tooltip,
  Text,
  Flex,
  Button,
  IconButton,
  chakra,
  useBreakpointValue,
  useColorModeValue as mode,
} from "@chakra-ui/react";
import { HiSelector } from "react-icons/hi";
import { RiCheckboxBlankCircleFill } from "react-icons/ri";
import { LabelClass } from "@labelflow/graphql-types";
import { ClassSelectionPopover } from "../../../class-selection-popover";

// The class selection menu doesn't need all the attributes of the label class
export type LabelClassItem = Omit<LabelClass, "dataset">;

const CircleIcon = chakra(RiCheckboxBlankCircleFill);
const SelectorIcon = chakra(HiSelector);

const ClassSelectionButton = React.forwardRef<
  null,
  {
    selectedLabelClass?: LabelClassItem | null;
    toggle: () => void;
  }
>(({ selectedLabelClass, toggle }, ref) => {
  const largeButton = (
    <Button
      rightIcon={<SelectorIcon fontSize="md" />}
      minW="60"
      justifyContent="space-between"
      ref={ref}
      onClick={toggle}
      bg={mode("white", "gray.800")}
      pointerEvents="initial"
      aria-label="Open class selection popover"
    >
      <Tooltip
        label={`Selected class (${selectedLabelClass?.name ?? "None"})`}
        placement="bottom"
        openDelay={1000}
      >
        <Flex alignItems="center">
          <CircleIcon
            color={selectedLabelClass?.color ?? "gray.300"}
            fontSize="2xl"
            mr="2"
          />
          <Text display={{ base: "none", md: "block" }}>
            {selectedLabelClass?.name ?? "None"}
          </Text>
        </Flex>
      </Tooltip>
    </Button>
  );

  const smallButton = (
    <IconButton
      icon={
        <CircleIcon
          color={selectedLabelClass?.color ?? "gray.300"}
          fontSize="2xl"
        />
      }
      ref={ref}
      onClick={toggle}
      bg={mode("white", "gray.800")}
      pointerEvents="initial"
      aria-label="Open class selection popover"
    />
  );

  const result =
    useBreakpointValue({
      base: smallButton,
      md: largeButton,
    }) ?? largeButton;
  return result;
});

export const ClassSelectionMenu = ({
  isOpen,
  setIsOpen,
  labelClasses,
  onSelectedClassChange,
  createNewClass,
  selectedLabelClass,
  isContextMenuOpen,
  includeNoneClass,
}: {
  isOpen: boolean;
  setIsOpen: (b: boolean) => void;
  labelClasses: LabelClassItem[];
  onSelectedClassChange: (item: LabelClassItem | null) => void;
  createNewClass: (name: string) => void;
  selectedLabelClass?: LabelClassItem | null;
  isContextMenuOpen?: boolean;
  includeNoneClass?: boolean;
}) => {
  const toggle = () => setIsOpen(!isOpen);
  const close = () => setIsOpen(false);

  return (
    <ClassSelectionPopover
      ariaLabel="Class selection menu popover"
      isOpen={isOpen}
      onClose={close}
      labelClasses={labelClasses}
      includeNoneClass={includeNoneClass}
      onSelectedClassChange={(labelClass: LabelClassItem | null) => {
        onSelectedClassChange(labelClass);
        close();
      }}
      createNewClass={(name: string) => {
        createNewClass(name);
        close();
      }}
      selectedLabelClassId={selectedLabelClass?.id ?? null}
      trigger={
        <ClassSelectionButton
          toggle={toggle}
          selectedLabelClass={selectedLabelClass}
        />
      }
      activateShortcuts={!isContextMenuOpen}
    />
  );
};
