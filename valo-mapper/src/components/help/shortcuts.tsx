import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { useTranslations } from "next-intl";

export const Shortcuts = () => {
  const t = useTranslations("help.shortcuts");
  const shortcuts = [
    {
      category: t("general"),
      items: [
        {
          keys: [
            ["Ctrl", "Z"],
            ["Cmd", "Z"],
          ],
          description: t("undo"),
        },
        {
          keys: [
            ["Ctrl", "Shift", "Z"],
            ["Cmd", "Shift", "Z"],
          ],
          description: t("redo"),
        },
        {
          keys: [["E"]],
          description: t("deleteHovered"),
        },
        {
          keys: [["N"]],
          description: t("addEditNote"),
        },
        {
          keys: [["R"]],
          description: t("recenter"),
        },
      ],
    },
    {
      category: t("drawTool"),
      items: [
        {
          keys: [["Q"]],
          description: t("toggleDraw"),
        },
        {
          keys: [
            ["Ctrl", "Q"],
            ["Cmd", "Q"],
          ],
          description: t("toggleDashed"),
        },
        {
          keys: [
            ["Ctrl", "Shift", "Q"],
            ["Cmd", "Shift", "Q"],
          ],
          description: t("toggleArrow"),
        },
      ],
    },
    {
      category: t("eraserTool"),
      items: [
        {
          keys: [["W"]],
          description: t("toggleEraser"),
        },
        {
          keys: [["Shift", "W"]],
          description: t("toggleEntireLine"),
        },
      ],
    },
    {
      category: t("phaseNavigation"),
      items: [
        {
          keys: [["A"]],
          description: t("previousPhase"),
        },
        {
          keys: [["D"]],
          description: t("nextPhase"),
        },
      ],
    },
  ];

  return (
    <div className="space-y-6 text-muted-foreground">
      {shortcuts.map((section, idx) => (
        <div key={idx} className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground/80 uppercase tracking-wide">
            {section.category}
          </h3>
          <div className="space-y-1.5">
            {section.items.map((shortcut, itemIdx) => (
              <div
                key={itemIdx}
                className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 py-1"
              >
                <span className="text-sm">{shortcut.description}</span>
                <KbdGroup className="ms-auto flex-wrap justify-end">
                  {shortcut.keys.map((combo, comboIdx) => (
                    <Kbd key={comboIdx}>{combo.join(" + ")}</Kbd>
                  ))}
                </KbdGroup>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
