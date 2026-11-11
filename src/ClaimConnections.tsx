import { useId, useLayoutEffect, useRef, useState } from 'react';

type Connection = { key: string; kind: 'main' | 'support' | 'limit'; d: string; arrow?: boolean };
type Diagram = {
  width: number;
  height: number;
  connections: Connection[];
  labels: { text: string; x: number; y: number; kind: string }[];
};

export function ClaimConnections({ structureKey }: { structureKey: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const markerId = useId().replace(/:/g, '');
  const [diagram, setDiagram] = useState<Diagram>({
    width: 1,
    height: 1,
    connections: [],
    labels: [],
  });

  useLayoutEffect(() => {
    const graph = svgRef.current?.parentElement;
    if (!graph) return;
    const measure = () => {
      const origin = graph.getBoundingClientRect();
      const box = (element: Element) => {
        const rect = element.getBoundingClientRect();
        const x = rect.left - origin.left;
        const y = rect.top - origin.top;
        return {
          x,
          y,
          right: x + rect.width,
          bottom: y + rect.height,
          cx: x + rect.width / 2,
          cy: y + rect.height / 2,
        };
      };
      const data = graph.querySelector('.data-node');
      const qualifier = graph.querySelector('.qualifier');
      const claim = graph.querySelector('.claim-node');
      if (!data || !qualifier || !claim || !origin.width) return;
      const d = box(data),
        q = box(qualifier),
        c = box(claim);
      const connections: Connection[] = [
        { key: 'facts-to-judgment', kind: 'main', d: `M ${d.right} ${d.cy} H ${q.x}`, arrow: true },
        { key: 'judgment-to-claim', kind: 'main', d: `M ${q.right} ${q.cy} H ${c.x}`, arrow: true },
      ];
      const labels: Diagram['labels'] = [];
      const reasons = [...graph.querySelectorAll('.reason-node')].map(box);
      const exceptions = [...graph.querySelectorAll('.exception')].map(box);

      // Join every reason to a shared route, outside the cards, pointing toward the judgment.
      if (reasons.length) {
        const spine = 2;
        const junction = (q.bottom + reasons[0].y) / 2;
        const targetX = q.cx - (q.right - q.x) / 4;
        connections.push({
          key: 'reasons-to-judgment',
          kind: 'support',
          d: `M ${spine} ${reasons.at(-1)!.cy} V ${junction} H ${targetX} V ${q.bottom}`,
          arrow: true,
        });
        reasons.forEach((reason, index) =>
          connections.push({
            key: `reason-${index}`,
            kind: 'support',
            d: `M ${reason.x} ${reason.cy} H ${spine}`,
          }),
        );
        labels.push({ text: '支撑', x: (spine + targetX) / 2, y: junction, kind: 'support' });
      }
      graph.querySelectorAll('.reason-group').forEach((group, index) => {
        const reason = box(group.querySelector('.reason-node')!);
        const backing = box(group.querySelector('.backing')!);
        connections.push({
          key: `backing-${index}`,
          kind: 'support',
          d: `M ${backing.cx} ${backing.y} V ${reason.bottom}`,
          arrow: true,
        });
      });

      // Exceptions share a separate route so adding one never implies it supports another.
      if (exceptions.length) {
        const spine = origin.width - 2;
        const junction = (q.bottom + exceptions[0].y) / 2;
        const targetX = q.cx + (q.right - q.x) / 4;
        connections.push({
          key: 'exceptions-to-judgment',
          kind: 'limit',
          d: `M ${spine} ${exceptions.at(-1)!.cy} V ${junction} H ${targetX} V ${q.bottom}`,
          arrow: true,
        });
        exceptions.forEach((exception, index) =>
          connections.push({
            key: `exception-${index}`,
            kind: 'limit',
            d: `M ${exception.right} ${exception.cy} H ${spine}`,
          }),
        );
        labels.push({ text: '限制', x: (targetX + spine) / 2, y: junction, kind: 'limit' });
      }
      const next = { width: origin.width, height: origin.height, connections, labels };
      setDiagram((previous) =>
        JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(graph);
    graph.querySelectorAll('.node').forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [structureKey]);

  return (
    <svg
      ref={svgRef}
      className="claim-connections"
      viewBox={`0 0 ${diagram.width} ${diagram.height}`}
      role="img"
      aria-label="事实支持主张；理由支撑可信程度，依据支撑对应理由；例外限制可信程度。"
    >
      <defs>
        {(['main', 'support', 'limit'] as const).map((kind) => (
          <marker
            key={kind}
            id={`${markerId}-${kind}`}
            className={`connection-${kind}`}
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="5"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d="M 0 0 L 9 5 L 0 10 Z" fill="currentColor" />
          </marker>
        ))}
      </defs>
      {diagram.connections.map((connection) => (
        <path
          key={connection.key}
          data-connection={connection.key}
          className={`connection-line connection-${connection.kind}`}
          d={connection.d}
          markerEnd={connection.arrow ? `url(#${markerId}-${connection.kind})` : undefined}
        />
      ))}
      {diagram.labels.map((label) => (
        <text
          key={label.text}
          className={`connection-label connection-${label.kind}`}
          x={label.x}
          y={label.y}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {label.text}
        </text>
      ))}
    </svg>
  );
}
