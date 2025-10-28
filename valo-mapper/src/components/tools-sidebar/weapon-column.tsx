import { Fragment } from "react";
import { ToolIconButton } from "./tool-icon-button";

interface WeaponColumnProps {
  weapons: { name: string }[];
  onClick?: () => void;
}

export const WeaponColumn = ({ weapons, onClick }: WeaponColumnProps) => (
  <div className="flex flex-col gap-2 flex-1">
    {weapons.map((weapon) => (
      <Fragment key={weapon.name}>
        <ToolIconButton name={weapon.name} onClick={onClick} />
      </Fragment>
    ))}
  </div>
);
