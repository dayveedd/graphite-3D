import React from 'react';
import { Box, Cylinder, Sphere, Text, Line, Edges, Billboard } from '@react-three/drei';
import { CSGPart, Unit } from '../types';
import * as THREE from 'three';

interface ModelRendererProps {
  parts: CSGPart[];
  viewMode: 'assembled' | 'separated';
  wireframe: boolean;
  showDimensions: boolean;
  unit: Unit;
}

const convertUnit = (val: number, unit: Unit): string => {
  let displayVal = val;
  if (unit === 'mm') displayVal = val;
  if (unit === 'cm') displayVal = val / 10;
  if (unit === 'm') displayVal = val / 1000;
  return `${displayVal.toFixed(1)}${unit}`;
};

const DimensionLine = ({ start, end, label, color = "#dc2626" }: { start: [number, number, number], end: [number, number, number], label: string, color?: string }) => {
  const midX = (start[0] + end[0]) / 2;
  const midY = (start[1] + end[1]) / 2 + 2; // Increased offset for label
  const midZ = (start[2] + end[2]) / 2;

  return (
    <group>
      <Line points={[start, end]} color={color} lineWidth={3} />
      <Line points={[[start[0], start[1] - 0.5, start[2]], [start[0], start[1] + 0.5, start[2]]]} color={color} lineWidth={2} />
      <Line points={[[end[0], end[1] - 0.5, end[2]], [end[0], end[1] + 0.5, end[2]]]} color={color} lineWidth={2} />
      <Billboard position={[midX, midY, midZ]}>
        <Text fontSize={1.2} color={color} anchorX="center" anchorY="middle" fontWeight="bold">
          {label}
        </Text>
      </Billboard>
    </group>
  );
};

const ShapeDimensions = ({ part, unit }: { part: CSGPart, unit: Unit }) => {
  const [d1, d2, d3] = part.dimensions;
  const hX = d1 / 2;
  const hY = d2 / 2;
  const hZ = d3 / 2;

  return (
    <group>
      <DimensionLine start={[-hX, -hY - 3, 0]} end={[hX, -hY - 3, 0]} label={convertUnit(d1, unit)} />
      <DimensionLine start={[hX + 3, -hY, 0]} end={[hX + 3, hY, 0]} label={convertUnit(d2, unit)} />
      {d3 > 0 && <DimensionLine start={[hX, -hY, -hZ - 3]} end={[hX, -hY, hZ + 3]} label={convertUnit(d3, unit)} />}
    </group>
  );
};

const WedgeMesh = ({ args, position, rotation, children }: any) => {
  const shape = React.useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(args[0], 0);
    s.lineTo(0, args[1]);
    s.lineTo(0, 0);
    return s;
  }, [args]);

  const extrudeSettings = React.useMemo(() => ({
    steps: 1,
    depth: args[2],
    bevelEnabled: false,
  }), [args]);

  const adjustedPos: [number, number, number] = [
    position[0] - args[0] / 2,
    position[1] - args[1] / 2,
    position[2] - args[2] / 2
  ];

  return (
    <mesh position={adjustedPos} rotation={rotation} castShadow receiveShadow>
      <extrudeGeometry args={[shape, extrudeSettings]} />
      {children}
    </mesh>
  );
};

const Shape = ({ part, wireframe }: { part: CSGPart; wireframe: boolean }) => {
  const [d1, d2, d3] = part.dimensions;
  const degToRad = (deg: number) => deg * (Math.PI / 180);
  const rotation: [number, number, number] = [
    degToRad(part.rotation[0]),
    degToRad(part.rotation[1]),
    degToRad(part.rotation[2])
  ];
  const position = part.position as [number, number, number];

  const getColor = () => {
    if (part.operation === 'subtract') return '#ef4444';
    if (part.operation === 'base') return '#94a3b8';
    return '#64748b';
  };

  const material = (
    <meshStandardMaterial
      color={getColor()}
      wireframe={wireframe}
      roughness={0.4}
      metalness={0.2}
      transparent={part.operation === 'subtract'}
      opacity={part.operation === 'subtract' ? 0.5 : 1}
    />
  );

  switch (part.type) {
    case 'cube':
      return (
        <mesh position={position} rotation={rotation} castShadow receiveShadow>
          <boxGeometry args={[d1, d2, d3]} />
          {material}
          <Edges threshold={15} color="#1e293b" />
        </mesh>
      );
    case 'cylinder':
      return (
        <mesh position={position} rotation={rotation} castShadow receiveShadow>
          <cylinderGeometry args={[d1, d1, d2, 32]} />
          {material}
          <Edges threshold={15} color="#1e293b" />
        </mesh>
      );
    case 'sphere':
      return (
        <mesh position={position} rotation={rotation} castShadow receiveShadow>
          <sphereGeometry args={[d1, 32, 32]} />
          {material}
          <Edges threshold={15} color="#1e293b" />
        </mesh>
      );
    case 'wedge':
      return (
        <WedgeMesh args={[d1, d2, d3]} position={position} rotation={rotation}>
          {material}
          <Edges threshold={15} color="#1e293b" />
        </WedgeMesh>
      );
    default:
      return null;
  }
};

export const ModelRenderer: React.FC<ModelRendererProps> = ({ parts, viewMode, wireframe, showDimensions, unit }) => {
  if (!parts || parts.length === 0) {
    return null;
  }

  if (viewMode === 'separated') {
    // Calculate grid layout - vertical stacking like e-commerce product grid
    const count = parts.length;
    const cols = Math.min(2, count); // Max 2 columns for side-by-side layout with labels
    const spacingX = 70; // Horizontal spacing (increased for side labels)
    const spacingY = 50; // Vertical spacing

    return (
      <group>
        {parts.map((part, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          // Center the grid horizontally, stack vertically from top
          const offsetX = (col - (cols - 1) / 2) * spacingX;
          const offsetY = -row * spacingY;
          const displayPart = { ...part, position: [0, 0, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] };

          // Position text to the right side of each model
          const modelHalfWidth = Math.max(...part.dimensions) / 2;
          const labelOffsetX = modelHalfWidth + 8; // Position to the right

          return (
            <group key={part.id} position={[offsetX, offsetY, 0]}>
              <Shape part={displayPart} wireframe={wireframe} />
              {showDimensions && <ShapeDimensions part={displayPart} unit={unit} />}
              {/* Text label positioned to the side in a box-like layout */}
              <Billboard position={[labelOffsetX, 0, 0]}>
                {/* Part number badge */}
                <Text
                  fontSize={1.2}
                  color="#1e40af"
                  anchorX="left"
                  anchorY="middle"
                  fontWeight="bold"
                >
                  Part {i + 1}
                </Text>
                {/* Operation type */}
                <Text
                  position={[0, -1.8, 0]}
                  fontSize={0.8}
                  color="#64748b"
                  anchorX="left"
                  anchorY="middle"
                  fontWeight="bold"
                >
                  [{part.operation.toUpperCase()}]
                </Text>
                {/* Description with word wrap */}
                <Text
                  position={[0, -3.5, 0]}
                  fontSize={0.9}
                  color="#334155"
                  anchorX="left"
                  anchorY="top"
                  maxWidth={18}
                >
                  {part.explanation || 'No description'}
                </Text>
              </Billboard>
            </group>
          );
        })}
      </group>
    );
  }

  // Assembled View - Simplified: Just render all parts at their positions
  // Without CSG - subtractions are shown as semi-transparent overlays
  return (
    <group>
      {parts.map((part) => (
        <group key={part.id}>
          <Shape part={part} wireframe={wireframe} />
          {showDimensions && part.operation !== 'subtract' && (
            <group position={part.position as [number, number, number]}>
              <ShapeDimensions part={{ ...part, position: [0, 0, 0] }} unit={unit} />
            </group>
          )}
        </group>
      ))}
    </group>
  );
};
