import { Fragment, type PointerEvent } from "react";
import { ToolIconButton } from "./tool-icon-button";

interface WeaponColumnProps {
  weapons: { name: string; width: number; height: number }[];
  onClick: (name: string, width: number, height: number) => void;
  onPointerDown: (
    event: PointerEvent<HTMLButtonElement>,
    name: string,
    width: number,
    height: number,
  ) => void;
}

export const WeaponColumn = ({
  weapons,
  onClick,
  onPointerDown,
}: WeaponColumnProps) => (
  <div className="flex flex-col gap-2 flex-1">
    {weapons.map((weapon) => (
      <Fragment key={weapon.name}>
        <ToolIconButton
          name={weapon.name}
          onClick={() => onClick(weapon.name, weapon.width, weapon.height)}
          onPointerDown={(event) =>
            onPointerDown(event, weapon.name, weapon.width, weapon.height)
          }
        />
      </Fragment>
    ))}
  </div>
);
