import React, { useId } from 'react';
import Svg, { Circle, Defs, LinearGradient, Line, Polygon, RadialGradient, Stop } from 'react-native-svg';

/**
 * The Adamas "Prisma" mark — a brilliant-cut diamond of four Aurora facets
 * (cyan, azur, indigo, violet) with fine gold brilliant-cut edges. Ported
 * 1:1 from the corporate-design gem geometry. `detail="flat"` drops the gold
 * facet lines for small sizes so the silhouette stays crisp.
 */

const FACET = ['#2FE3D6', '#36A8F0', '#5566EE', '#9A4FF2'];
const FACET_DEEP = ['#1FA59E', '#2C72D4', '#4642C2', '#7B36C8'];

const topY = 36;
const girY = 50;
const tipY = 96;
const pt = (x: number, y: number) => `${x},${y}`;

const CROWN = [
  [pt(24, topY), pt(42, topY), pt(37, girY), pt(14, girY)],
  [pt(42, topY), pt(60, topY), pt(60, girY), pt(37, girY)],
  [pt(60, topY), pt(78, topY), pt(83, girY), pt(60, girY)],
  [pt(78, topY), pt(96, topY), pt(106, girY), pt(83, girY)],
].map((p) => p.join(' '));

const PAV = [
  [pt(14, girY), pt(37, girY), pt(60, tipY)],
  [pt(37, girY), pt(60, girY), pt(60, tipY)],
  [pt(60, girY), pt(83, girY), pt(60, tipY)],
  [pt(83, girY), pt(106, girY), pt(60, tipY)],
].map((p) => p.join(' '));

const OUTLINE = [pt(24, topY), pt(96, topY), pt(106, girY), pt(60, tipY), pt(14, girY)].join(' ');

const LINES: [number, number, number, number][] = [
  [24, topY, 14, girY], [42, topY, 37, girY], [60, topY, 60, girY], [78, topY, 83, girY], [96, topY, 106, girY],
  [24, topY, 96, topY], [14, girY, 106, girY],
  [37, girY, 60, tipY], [60, girY, 60, tipY], [83, girY, 60, tipY],
  [14, girY, 60, tipY], [106, girY, 60, tipY],
];

interface Props {
  size?: number;
  detail?: 'full' | 'flat';
  glow?: boolean;
}

export function PrismGem({ size = 96, detail = 'full', glow = false }: Props) {
  const uid = useId().replace(/:/g, '');
  const flat = detail === 'flat';
  const gold = `url(#gold-${uid})`;

  return (
    <Svg width={size} height={size} viewBox="9 14 102 102">
      <Defs>
        <LinearGradient id={`gold-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#F3DC99" />
          <Stop offset="50%" stopColor="#E3BE6E" />
          <Stop offset="100%" stopColor="#B98A3F" />
        </LinearGradient>
        <LinearGradient id={`sheen-${uid}`} x1="0" y1="0" x2="0.4" y2="1">
          <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.5} />
          <Stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
        </LinearGradient>
        <RadialGradient id={`glow-${uid}`} cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0%" stopColor="#5C9AF5" stopOpacity={0.55} />
          <Stop offset="100%" stopColor="#5C9AF5" stopOpacity={0} />
        </RadialGradient>
      </Defs>

      {glow && <Circle cx={60} cy={64} r={46} fill={`url(#glow-${uid})`} />}

      {CROWN.map((p, i) => (
        <Polygon key={`c${i}`} points={p} fill={FACET[i]} />
      ))}
      {PAV.map((p, i) => (
        <Polygon key={`p${i}`} points={p} fill={FACET_DEEP[i]} />
      ))}

      {!flat && <Polygon points={CROWN[0]} fill={`url(#sheen-${uid})`} opacity={0.55} />}
      {!flat && <Polygon points={CROWN[2]} fill="#ffffff" opacity={0.1} />}
      {!flat && <Polygon points={PAV[1]} fill="#000000" opacity={0.1} />}
      {!flat && <Polygon points={PAV[3]} fill="#000000" opacity={0.14} />}

      {!flat &&
        LINES.map((l, i) => (
          <Line
            key={`l${i}`}
            x1={l[0]}
            y1={l[1]}
            x2={l[2]}
            y2={l[3]}
            stroke={gold}
            strokeWidth={0.9}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.92}
          />
        ))}
      {flat && <Line x1={14} y1={50} x2={106} y2={50} stroke={gold} strokeWidth={2} />}
      <Polygon points={OUTLINE} fill="none" stroke={gold} strokeWidth={flat ? 2.4 : 1.5} strokeLinejoin="round" />

      {!flat && <Polygon points={CROWN[1]} fill="#ffffff" opacity={0.12} />}
    </Svg>
  );
}
