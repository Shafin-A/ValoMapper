import { Kbd, KbdGroup } from "@/components/ui/kbd";

export const Shortcuts = () => {
  const shortcuts = [
    {
      category: "General",
      items: [
        {
          keys: [
            ["Ctrl", "Z"],
            ["Cmd", "Z"],
          ],
          description: "Undo",
        },
        {
          keys: [
            ["Ctrl", "Shift", "Z"],
            ["Cmd", "Shift", "Z"],
          ],
          description: "Redo",
        },
        {
          keys: [["E"]],
          description: "Delete Hovered Element",
        },
        {
          keys: [["R"]],
          description: "Recenter Canvas",
        },
      ],
    },
    {
      category: "Draw Tool",
      items: [
        {
          keys: [["Q"]],
          description: "Toggle Draw Tool On/Off",
        },
        {
          keys: [
            ["Ctrl", "Q"],
            ["Cmd", "Q"],
          ],
          description: "Toggle Dashed/Solid Lines",
        },
        {
          keys: [
            ["Ctrl", "Shift", "Q"],
            ["Cmd", "Shift", "Q"],
          ],
          description: "Toggle Arrow Head",
        },
      ],
    },
    {
      category: "Eraser Tool",
      items: [
        {
          keys: [["W"]],
          description: "Toggle Eraser Tool On/Off",
        },
        {
          keys: [["Shift", "W"]],
          description: "Toggle Erase Entire Line On/Off",
        },
      ],
    },
    {
      category: "Phase Navigation",
      items: [
        {
          keys: [["A"]],
          description: "Previous Phase (if not at first phase)",
        },
        {
          keys: [["D"]],
          description: "Next Phase (if not at last phase)",
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
                className="flex items-start justify-between gap-4 py-1"
              >
                <span className="text-sm">{shortcut.description}</span>
                <KbdGroup>
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
