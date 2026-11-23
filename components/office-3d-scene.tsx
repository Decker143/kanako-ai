"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type SceneAgent = {
  id: string; name: string; jobTitle: string; status: string;
  departmentColor: string; working: boolean; taskCount: number;
};
type DeskProps = {
  agent: SceneAgent; position: [number, number, number];
  selected: boolean; onSelect: (id: string) => void;
};

function Workstation({ agent, position, selected, onSelect }: DeskProps) {
  const screen = useRef<THREE.Mesh>(null);
  const character = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Mesh>(null);
  const rightArm = useRef<THREE.Mesh>(null);
  const glow = agent.working ? "#59e6b0" : agent.departmentColor;
  useFrame(({ clock }) => {
    if (character.current) character.current.position.y = agent.working ? Math.sin(clock.elapsedTime * 4) * 0.025 : 0;
    if (leftArm.current) leftArm.current.rotation.x = agent.working ? Math.sin(clock.elapsedTime * 5) * 0.12 : 0;
    if (rightArm.current) rightArm.current.rotation.x = agent.working ? Math.cos(clock.elapsedTime * 5) * 0.12 : 0;
    if (screen.current && agent.working) {
      const pulse = 0.7 + Math.sin(clock.elapsedTime * 3.2) * 0.18;
      (screen.current.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse;
    }
  });
  return (
    <group position={position} onClick={(event) => { event.stopPropagation(); onSelect(agent.id); }}>
      <mesh position={[0, 0.62, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.05, 0.16, 1.15]} />
        <meshStandardMaterial color={selected ? "#6659a9" : "#66513f"} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.31, 0]} castShadow>
        <boxGeometry args={[0.12, 0.62, 0.12]} />
        <meshStandardMaterial color="#48546b" metalness={0.35} />
      </mesh>
      <mesh position={[0, 0.22, 0]} castShadow>
        <boxGeometry args={[1.1, 0.1, 0.65]} />
        <meshStandardMaterial color="#344158" />
      </mesh>
      <mesh position={[0, 1.12, 0.32]} castShadow>
        <boxGeometry args={[0.76, 0.52, 0.08]} />
        <meshStandardMaterial color="#111827" metalness={0.55} roughness={0.25} />
      </mesh>
      <mesh ref={screen} position={[0, 1.12, 0.37]}>
        <planeGeometry args={[0.65, 0.4]} />
        <meshStandardMaterial color={agent.working ? "#0d6d5a" : "#273d65"} emissive={glow} emissiveIntensity={agent.working ? 0.7 : 0.12} />
      </mesh>
      <mesh position={[0, 0.87, 0.3]}>
        <cylinderGeometry args={[0.035, 0.035, 0.22, 8]} />
        <meshStandardMaterial color="#73819b" />
      </mesh>
      <mesh position={[0.68, 0.77, 0.1]}>
        <boxGeometry args={[0.2, 0.06, 0.28]} />
        <meshStandardMaterial color="#1d2638" />
      </mesh>
      <mesh position={[-0.7, 0.76, 0.05]}>
        <cylinderGeometry args={[0.09, 0.09, 0.05, 16]} />
        <meshStandardMaterial color="#b6a48d" />
      </mesh>
      <group ref={character} position={[0, 0, -0.92]}>
        <mesh position={[0, 0.56, 0]} castShadow>
          <boxGeometry args={[0.7, 0.12, 0.68]} />
          <meshStandardMaterial color="#34445b" />
        </mesh>
        <mesh position={[0, 0.95, -0.2]} castShadow>
          <capsuleGeometry args={[0.2, 0.38, 4, 8]} />
          <meshStandardMaterial color={agent.departmentColor} roughness={0.82} />
        </mesh>
        <mesh position={[0, 0.69, -0.2]} castShadow>
          <cylinderGeometry args={[0.09, 0.09, 0.18, 10]} />
          <meshStandardMaterial color="#d6b69b" roughness={0.9} />
        </mesh>
        <mesh position={[-0.105, 0.31, -0.18]} castShadow>
          <capsuleGeometry args={[0.075, 0.34, 4, 8]} />
          <meshStandardMaterial color="#263247" roughness={0.9} />
        </mesh>
        <mesh position={[0.105, 0.31, -0.18]} castShadow>
          <capsuleGeometry args={[0.075, 0.34, 4, 8]} />
          <meshStandardMaterial color="#263247" roughness={0.9} />
        </mesh>
        <mesh position={[-0.105, 0.09, 0.0]} castShadow>
          <boxGeometry args={[0.16, 0.09, 0.3]} />
          <meshStandardMaterial color="#171f30" roughness={0.8} />
        </mesh>
        <mesh position={[0.105, 0.09, 0.0]} castShadow>
          <boxGeometry args={[0.16, 0.09, 0.3]} />
          <meshStandardMaterial color="#171f30" roughness={0.8} />
        </mesh>
        <mesh position={[0, 1.38, -0.2]} castShadow>
          <sphereGeometry args={[0.23, 20, 16]} />
          <meshStandardMaterial color="#d6b69b" roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.53, -0.23]}>
          <sphereGeometry args={[0.235, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.48]} />
          <meshStandardMaterial color="#342b2d" roughness={1} />
        </mesh>
        <mesh position={[-0.205, 1.39, -0.17]} rotation={[0, 0, -0.18]}>
          <sphereGeometry args={[0.075, 10, 10]} />
          <meshStandardMaterial color="#342b2d" roughness={1} />
        </mesh>
        <mesh position={[0.205, 1.39, -0.17]} rotation={[0, 0, 0.18]}>
          <sphereGeometry args={[0.075, 10, 10]} />
          <meshStandardMaterial color="#342b2d" roughness={1} />
        </mesh>
        <mesh position={[0.09, 1.39, 0.005]}>
          <sphereGeometry args={[0.018, 8, 8]} />
          <meshBasicMaterial color="#24202a" />
        </mesh>
        <mesh position={[-0.09, 1.39, 0.005]}>
          <sphereGeometry args={[0.018, 8, 8]} />
          <meshBasicMaterial color="#24202a" />
        </mesh>
        <mesh ref={leftArm} position={[-0.23, 1.0, 0.08]} rotation={[0.4, 0, -0.35]}>
          <capsuleGeometry args={[0.055, 0.32, 4, 8]} />
          <meshStandardMaterial color="#d6b69b" />
        </mesh>
        <mesh ref={rightArm} position={[0.23, 1.0, 0.08]} rotation={[0.4, 0, 0.35]}>
          <capsuleGeometry args={[0.055, 0.32, 4, 8]} />
          <meshStandardMaterial color="#d6b69b" />
        </mesh>
        <Html position={[0, 1.92, -0.2]} center distanceFactor={11} style={{ pointerEvents: "none" }}>
          <div className={`office-3d-label ${selected ? "selected" : ""}`}>
            <strong>{agent.name}</strong>
            <span>{agent.working ? "● WORKING" : agent.status === "active" ? "● AVAILABLE" : "● INACTIVE"}</span><small>{agent.jobTitle}</small>{agent.taskCount > 0 && <em>{agent.taskCount} OPEN TASK{agent.taskCount === 1 ? "" : "S"}</em>}
          </div>
        </Html>
      </group>
      {selected && <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.12, 1.23, 48]} />
        <meshBasicMaterial color="#a99bff" transparent opacity={0.9} />
      </mesh>}
      <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.08, 32]} />
        <meshBasicMaterial color={glow} transparent opacity={selected ? 0.12 : 0.035} />
      </mesh>
    </group>
  );
}

function Plant({ position }: { position: [number, number, number] }) {
  return <group position={position}>
    <mesh position={[0, 0.25, 0]} castShadow><cylinderGeometry args={[0.32, 0.24, 0.5, 8]} /><meshStandardMaterial color="#8c6a52" /></mesh>
    <mesh position={[0, 0.88, 0]}><cylinderGeometry args={[0.045, 0.07, 1.0, 7]} /><meshStandardMaterial color="#49785c" /></mesh>
    {Array.from({ length: 5 }).map((_, i) => <mesh key={i} position={[Math.sin(i * 1.25) * 0.28, 0.88 + (i % 2) * 0.16, Math.cos(i * 1.25) * 0.22]} rotation={[0.2, i * 1.2, 0.55]}>
      <coneGeometry args={[0.16, 0.62, 6]} /><meshStandardMaterial color={i % 2 ? "#4b9a70" : "#367d5d"} />
    </mesh>)}
  </group>;
}

function OfficeArchitecture() {
  const chairs = useMemo(() => Array.from({ length: 6 }, (_, i) => i * Math.PI / 3), []);
  return <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} receiveShadow>
      <planeGeometry args={[19, 22]} />
      <meshStandardMaterial color="#28364a" roughness={0.88} />
    </mesh>
    <gridHelper args={[18, 36, "#526078", "#36445a"]} position={[0, -0.065, 0]} />
    <mesh position={[0, 2.2, -10.8]} receiveShadow>
      <boxGeometry args={[19, 4.4, 0.25]} />
      <meshStandardMaterial color="#1c2638" />
    </mesh>
    <mesh position={[-9.3, 2.2, 0]} receiveShadow><boxGeometry args={[0.25, 4.4, 21.5]} /><meshStandardMaterial color="#202b3d" /></mesh>
    <mesh position={[9.3, 2.2, 0]} receiveShadow><boxGeometry args={[0.25, 4.4, 13.5]} /><meshStandardMaterial color="#202b3d" /></mesh>
    <mesh position={[0, 5.25, -10.62]}><boxGeometry args={[5.2, 1.25, 0.08]} /><meshStandardMaterial color="#344968" emissive="#385b88" emissiveIntensity={0.24} /></mesh>
    <mesh position={[0, 5.25, -10.55]}><boxGeometry args={[4.7, 0.75, 0.04]} /><meshStandardMaterial color="#182d48" /></mesh>
    <Html position={[0, 5.25, -10.45]} center distanceFactor={10} style={{ pointerEvents: "none" }}>
      <div className="office-3d-wall-sign">KANAKO <b>AI</b><small>ONE COMPANY · MANY MINDS</small></div>
    </Html>
    <mesh position={[0, 0.12, -8.65]} castShadow><boxGeometry args={[5.4, 0.24, 2.2]} /><meshStandardMaterial color="#4a3e38" /></mesh>
    <mesh position={[0, 0.72, -8.65]} castShadow><boxGeometry args={[4.4, 1.05, 0.08]} /><meshStandardMaterial color="#5d6680" transparent opacity={0.65} /></mesh>
    <Html position={[0, 1.35, -8.0]} center distanceFactor={12}><div className="office-3d-room-label">CEO OFFICE</div></Html>
    <mesh position={[0, 0.45, 8.4]} castShadow><cylinderGeometry args={[1.25, 1.25, 0.18, 48]} /><meshStandardMaterial color="#5a4a40" /></mesh>
    <mesh position={[0, 0.57, 8.4]} castShadow><cylinderGeometry args={[1.05, 1.05, 0.08, 48]} /><meshStandardMaterial color="#a18b72" /></mesh>
    {chairs.map((angle) => <group key={angle} position={[Math.cos(angle) * 1.65, 0, 8.4 + Math.sin(angle) * 1.65]} rotation={[0, -angle, 0]}>
      <mesh position={[0, 0.42, 0]} castShadow><boxGeometry args={[0.55, 0.12, 0.55]} /><meshStandardMaterial color="#52627c" /></mesh>
      <mesh position={[0, 0.75, -0.2]} castShadow><boxGeometry args={[0.55, 0.7, 0.12]} /><meshStandardMaterial color="#39465d" /></mesh>
    </group>)}
    <Html position={[0, 1.4, 8.4]} center distanceFactor={12}><div className="office-3d-room-label">COLLABORATION HUB</div></Html>
    <Plant position={[-8, 0, -9.5]} /><Plant position={[8, 0, -9.5]} /><Plant position={[-8, 0, 9.5]} /><Plant position={[8, 0, 9.5]} />
    <mesh position={[-7.6, 1.55, -6.5]}><boxGeometry args={[0.1, 2.9, 3.2]} /><meshStandardMaterial color="#43546d" transparent opacity={0.45} /></mesh>
    <mesh position={[7.6, 1.55, -6.5]}><boxGeometry args={[1.4, 2.9, 0.1]} /><meshStandardMaterial color="#43546d" transparent opacity={0.45} /></mesh>
    <Html position={[-7.6, 3.2, -6.5]} center><div className="office-3d-room-label">OPERATIONS</div></Html>
    <Html position={[7.6, 3.2, -6.5]} center><div className="office-3d-room-label">STRATEGY</div></Html>
    <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[18, 21]} /><meshBasicMaterial color="#111a2a" transparent opacity={0.08} /></mesh>
    <ambientLight intensity={1.15} />
    <directionalLight position={[5, 11, 7]} intensity={2.0} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
    <pointLight position={[-5, 3.5, -4]} color="#9b8cff" intensity={20} distance={12} />
    <pointLight position={[5, 3.5, -4]} color="#6bb6ff" intensity={16} distance={12} />
  </>;
}

function SceneContents({ agents, selected, onSelect }: {
  agents: SceneAgent[]; selected: string | null; onSelect: (id: string) => void;
}) {
  const positions = useMemo(() => agents.map((_, index): [number, number, number] => {
    const columns = 5;
    const row = Math.floor(index / columns);
    const col = index % columns;
    return [-6.4 + col * 3.2, 0, -3.5 + row * 3.5];
  }), [agents]);
  return <>
    <OfficeArchitecture />
    {agents.map((agent, index) => <Workstation key={agent.id} agent={agent} position={positions[index]} selected={selected === agent.id} onSelect={onSelect} />)}
    <OrbitControls makeDefault minDistance={11} maxDistance={31} maxPolarAngle={Math.PI / 2.05} minPolarAngle={0.45} target={[0, 0.4, 0]} />
  </>;
}

export function Office3DScene({ agents, selected, onSelect }: {
  agents: SceneAgent[]; selected: string | null; onSelect: (id: string) => void;
}) {
  const sceneAgents = agents.slice(0, 15);
  return (
    <div className="office-3d-canvas">
      <Canvas shadows dpr={[1, 1.6]} camera={{ position: [15, 17, 21], fov: 42 }} gl={{ antialias: true, alpha: false }}>
        <color attach="background" args={["#111a2a"]} />
        <fog attach="fog" args={["#111a2a", 18, 34]} />
        <SceneContents agents={sceneAgents} selected={selected} onSelect={onSelect} />
      </Canvas>
      <div className="office-3d-hint">DRAG TO ROTATE · SCROLL TO ZOOM · CLICK AN EMPLOYEE</div>
    </div>
  );
}
