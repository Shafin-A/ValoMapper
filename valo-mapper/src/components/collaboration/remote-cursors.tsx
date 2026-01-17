"use client";

import { useWebSocket } from "@/contexts/websocket-context";
import { CursorMoveData } from "@/lib/websocket-types";
import { Group, Circle, Label, Tag, Text } from "react-konva";
import { useMemo } from "react";

interface RemoteCursorsProps {
  scale: number;
}

export const RemoteCursors = ({ scale }: RemoteCursorsProps) => {
  const { cursors } = useWebSocket();

  const cursorArray = useMemo(() => Array.from(cursors.values()), [cursors]);

  return (
    <Group>
      {cursorArray.map((cursor) => (
        <RemoteCursor key={cursor.userId} cursor={cursor} scale={scale} />
      ))}
    </Group>
  );
};

interface RemoteCursorProps {
  cursor: CursorMoveData;
  scale: number;
}

const RemoteCursor = ({ cursor, scale }: RemoteCursorProps) => {
  const cursorSize = 8 / scale;
  const fontSize = 12 / scale;
  const labelOffset = 10 / scale;

  return (
    <Group x={cursor.x} y={cursor.y}>
      <Circle
        radius={cursorSize}
        fill={cursor.color}
        stroke="white"
        strokeWidth={2 / scale}
        shadowColor="black"
        shadowBlur={4 / scale}
        shadowOpacity={0.3}
      />

      <Label x={labelOffset} y={labelOffset} listening={false}>
        <Tag
          fill="rgba(0, 0, 0, 0.6)"
          cornerRadius={3 / scale}
          pointerDirection="none"
        />
        <Text
          text={cursor.username}
          fontSize={fontSize}
          fontStyle="bold"
          fill="#ffffff"
          padding={3 / scale}
          align="center"
        />
      </Label>
    </Group>
  );
};
