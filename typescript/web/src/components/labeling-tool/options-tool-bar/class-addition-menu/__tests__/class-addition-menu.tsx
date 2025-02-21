/* eslint-disable import/first */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/extend-expect";
import { mockMatchMedia } from "../../../../../utils/mock-window";

mockMatchMedia(jest);

import { ClassAdditionMenu, LabelClassItem } from "../class-addition-menu";

const labelClasses = [
  {
    id: "coaisndoiasndi0",
    index: 0,
    createdAt: "today",
    updatedAt: "today",
    name: "Person",
    color: "#6B7280",
    shortcut: "1",
    labels: [],
  },
  {
    id: "coaisndoiasndi1",
    index: 1,
    createdAt: "today",
    updatedAt: "today",
    name: "Dog",
    color: "#EF4444 ",
    shortcut: "2",
    labels: [],
  },
];

const [onSelectedClassChange, createNewClass] = [jest.fn(), jest.fn()];
const setIsOpen = jest.fn();

const renderClassAdditionMenu = (
  labelClassesInput: LabelClassItem[],
  selectedLabelClass?: LabelClassItem,
  isOpen: boolean = false
): void => {
  render(
    <ClassAdditionMenu
      labelClasses={labelClassesInput}
      onSelectedClassChange={onSelectedClassChange}
      createNewClass={createNewClass}
      selectedLabelClass={selectedLabelClass}
      isOpen={isOpen}
      setIsOpen={setIsOpen}
    />
  );
};

describe("Class addition popover tests", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("Should render component", () => {
    renderClassAdditionMenu(labelClasses);

    expect(screen.getByRole("button")).toBeDefined();
  });

  test("Should render with a selected label class", () => {
    renderClassAdditionMenu(labelClasses, labelClasses[0]);

    expect(screen.getByRole("button")).toBeDefined();
  });

  test("Should open popover when clicking on the button", () => {
    renderClassAdditionMenu(labelClasses);

    expect(screen.getByRole("dialog", { hidden: true })).toBeDefined();
    userEvent.click(screen.getByRole("button"));

    expect(setIsOpen).toHaveBeenCalledWith(true);
  });

  test("Should close popover when clicking on a class", () => {
    renderClassAdditionMenu(labelClasses, undefined, true);
    userEvent.click(
      screen.getByRole("option", { name: RegExp(labelClasses[0].name) })
    );

    expect(onSelectedClassChange).toHaveBeenCalledWith(labelClasses[0]);
    expect(setIsOpen).toHaveBeenCalledWith(false);
  });

  test("Should close popover when creating a new class", () => {
    renderClassAdditionMenu(labelClasses, undefined, true);
    userEvent.type(screen.getByPlaceholderText(/search/i), "Perso");
    userEvent.click(screen.getByRole("option", { name: /Create class/ }));

    expect(createNewClass).toHaveBeenCalledWith("Perso");
    expect(setIsOpen).toHaveBeenCalledWith(false);
  });
});
