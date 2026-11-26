import {
  buildFolderFlatData,
  buildLocationPath,
  buildTree,
  convertFolderOrStrategyId,
  flattenData,
  getFolderOrStrategyId,
} from "@/lib/strategy-tree";
import { Folder, Strategy, StrategyData } from "@/lib/types";

const now = new Date("2026-01-01T00:00:00Z");

const createFolder = (overrides: Partial<Folder>): Folder => ({
  id: 1,
  userId: 1,
  name: "Folder",
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

const createStrategy = (overrides: Partial<Strategy>): Strategy => ({
  id: 1,
  userId: 1,
  name: "Strategy",
  selectedMapId: "ascent",
  tags: [],
  isFavorite: false,
  lobbyCode: "AAAA",
  updatedAt: now,
  ...overrides,
});

describe("buildTree", () => {
  const folders = [
    createFolder({ id: 1, name: "Root" }),
    createFolder({ id: 2, name: "Child", parentFolderId: 1 }),
    createFolder({ id: 3, name: "Deep", parentFolderId: 2 }),
    createFolder({ id: 4, name: "Orphan", parentFolderId: 99 }),
  ];
  const strategies = [
    createStrategy({ id: 10, name: "Root strategy" }),
    createStrategy({ id: 11, name: "Nested strategy", folderId: 3 }),
    createStrategy({ id: 12, name: "Missing folder strategy", folderId: 99 }),
  ];

  it("builds nested folder and strategy nodes", () => {
    const tree = buildTree(folders, strategies);

    // The orphan folder has no parent node and is not attached to the root.
    expect(tree.map((node) => node.id)).toEqual([
      "folder-1",
      "strategy-10",
    ]);

    const root = tree[0];
    expect(root.children?.map((node) => node.id)).toEqual(["folder-2"]);
    expect(root.children?.[0].children?.map((node) => node.id)).toEqual([
      "folder-3",
    ]);
    expect(root.children?.[0].children?.[0].children?.map((node) => node.id)).toEqual([
      "strategy-11",
    ]);
  });

  it("preserves strategy metadata on strategy nodes", () => {
    const [rootStrategy] = buildTree(folders, strategies).slice(1);

    expect(rootStrategy).toEqual({
      id: "strategy-10",
      strategyId: 10,
      name: "Root strategy",
      type: "strategy",
      lobbyCode: "AAAA",
      selectedMapId: "ascent",
      mapSide: undefined,
      tags: [],
      isFavorite: false,
      folderId: null,
      updatedAt: now,
    });
  });

  it("drops strategies that reference a missing folder", () => {
    const tree = buildTree(folders, strategies);
    const allIds = Object.keys(flattenData({ id: "root", name: "root", type: "folder", children: tree }));

    expect(allIds).not.toContain("strategy-12");
  });
});

describe("flattenData", () => {
  it("collects a node and all of its descendants into a map", () => {
    const data: StrategyData = {
      id: "folder-1",
      name: "Root",
      type: "folder",
      children: [
        {
          id: "strategy-1",
          name: "Inside",
          type: "strategy",
        },
        {
          id: "folder-2",
          name: "Nested",
          type: "folder",
          children: [{ id: "strategy-2", name: "Deep", type: "strategy" }],
        },
      ],
    };

    expect(Object.keys(flattenData(data)).sort()).toEqual([
      "folder-1",
      "folder-2",
      "strategy-1",
      "strategy-2",
    ]);
  });

  it("returns an empty map for a childless node", () => {
    expect(
      flattenData({ id: "strategy-1", name: "Solo", type: "strategy" }),
    ).toEqual({
      "strategy-1": { id: "strategy-1", name: "Solo", type: "strategy" },
    });
  });
});

describe("buildFolderFlatData", () => {
  it("wraps data in a virtual root with a named root folder", () => {
    const data: StrategyData[] = [
      { id: "strategy-1", name: "One", type: "strategy" },
    ];
    const flat = buildFolderFlatData(data);

    expect(flat._virtual_root.children).toEqual([flat.root]);
    expect(flat.root).toMatchObject({
      id: "root",
      name: "My Strategies",
      type: "folder",
    });
    expect(flat["strategy-1"].name).toBe("One");
  });
});

describe("buildLocationPath", () => {
  const data: Record<string, StrategyData> = {
    _virtual_root: {
      id: "_virtual_root",
      name: "Virtual Root",
      type: "folder",
      children: [
        {
          id: "root",
          name: "My Strategies",
          type: "folder",
          children: [
            {
              id: "folder-1",
              name: "Lineups",
              type: "folder",
              children: [
                { id: "strategy-7", name: "B Site Rush", type: "strategy" },
              ],
            },
          ],
        },
      ],
    },
    root: {
      id: "root",
      name: "My Strategies",
      type: "folder",
      children: [
        {
          id: "folder-1",
          name: "Lineups",
          type: "folder",
          children: [
            { id: "strategy-7", name: "B Site Rush", type: "strategy" },
          ],
        },
      ],
    },
    "folder-1": {
      id: "folder-1",
      name: "Lineups",
      type: "folder",
      children: [
        { id: "strategy-7", name: "B Site Rush", type: "strategy" },
      ],
    },
    "strategy-7": { id: "strategy-7", name: "B Site Rush", type: "strategy" },
  };

  it("returns the full ancestor path for a nested strategy", () => {
    expect(buildLocationPath("strategy-7", data)).toEqual([
      { id: "root", name: "My Strategies" },
      { id: "folder-1", name: "Lineups" },
      { id: "strategy-7", name: "B Site Rush" },
    ]);
  });

  it("returns only the root for the root selection", () => {
    expect(buildLocationPath("root", data)).toEqual([
      { id: "root", name: "My Strategies" },
    ]);
  });

  it("stops walking when an id is unknown", () => {
    expect(buildLocationPath("missing", data)).toEqual([
      { id: "root", name: "My Strategies" },
    ]);
  });
});

describe("strategy id helpers", () => {
  it("strips the entity prefix", () => {
    expect(convertFolderOrStrategyId("folder-12", "folder")).toBe(12);
    expect(convertFolderOrStrategyId("strategy-34", "strategy")).toBe(34);
  });

  it("treats the root node as having no numeric id", () => {
    expect(getFolderOrStrategyId("root", "folder")).toBeUndefined();
    expect(getFolderOrStrategyId("root", "strategy")).toBeUndefined();
    expect(getFolderOrStrategyId("folder-12", "folder")).toBe(12);
  });
});
