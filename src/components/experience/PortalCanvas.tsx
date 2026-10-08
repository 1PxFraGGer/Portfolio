"use client";
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Noise,
  Vignette,
} from "@react-three/postprocessing";

import { BlendFunction } from "postprocessing";
import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Edges, Sparkles, Stars } from "@react-three/drei";
import {
  AdditiveBlending,
  Color,
  BufferAttribute,
  BufferGeometry,
  LineSegments,
  LineBasicMaterial,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PointLight,
  Quaternion,
  Vector3,
  Vector2,
} from "three";

export type SceneStage =
  | "opening"
  | "charged"
  | "jump"
  | "world"
  | "returning"
;
export type ArtifactKey = "frontend" | "backend" | "seo" | "content";

type Props = {
  stage: SceneStage;
  reducedMotion?: boolean;
  activeArtifact?: ArtifactKey | null;
  onArtifactSelect?: (artifact: ArtifactKey) => void;
  onSkillOpen?: (artifact: ArtifactKey) => void;
  /** Slowly cycles through the artifacts when the visitor is idle. Default: true */
  autoTour?: boolean;
};

const BLUE = "#00C8FF";
const VIOLET = "#8B5CF6";
const GOLD = "#FFB547";
const GREEN = "#34D399";

const ARTIFACT_ORDER: ArtifactKey[] = ["frontend", "backend", "seo", "content"];
const AUTO_TOUR_MS = 9000;
const CORE_POS = new Vector3(0, 1.9, -8.4);

const TOTEMS: {
  id: ArtifactKey;
  color: string;
  position: [number, number, number];
  delay: number;
}[] = [
  { id: "frontend", color: BLUE, position: [-5.5, 1.25, -6.7], delay: 0.2 },
  { id: "backend", color: GOLD, position: [-1.8, 1.4, -11], delay: 0.4 },
  { id: "seo", color: GREEN, position: [1.8, 1.4, -11], delay: 0.6 },
  { id: "content", color: VIOLET, position: [5.5, 1.25, -6.7], delay: 0.8 },
];

const clamp01 = (x: number) => MathUtils.clamp(x, 0, 1);

const easeOutBack = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

/* ------------------------------------------------------------------ */
/* Camera: portal opening, jump, and the cinematic world fly-in        */
/* ------------------------------------------------------------------ */


function FrameCamera({
  stage,
  reducedMotion,
  activeArtifact = "frontend",
}: {
  stage: SceneStage;
  reducedMotion?: boolean;
  activeArtifact?: ArtifactKey | null;
}) {
  const { camera } = useThree();

  const lastStage = useRef<SceneStage>(stage);
  const jumpStart = useRef(0);
  const worldStart = useRef(0);
  const roll = useRef(0);

  // Return animation references
  const returnStart = useRef(0);
  const returnCameraStart = useRef(new Vector3());
  const returnLookStart = useRef(new Vector3());

  const currentLook = useRef(new Vector3(0, 2.3, -8));
  const destination = useMemo(() => new Vector3(), []);
  const targetLook = useMemo(() => new Vector3(), []);

  const returnDestination = useMemo(
    () => new Vector3(0, 3.4, 21),
    []
  );

  const portalLook = useMemo(
    () => new Vector3(0, 2.3, -8),
    []
  );

  useEffect(() => {
    camera.position.set(0, 2.1, 18);
    camera.fov = 48;
    camera.lookAt(currentLook.current);
    camera.updateProjectionMatrix();
  }, [camera]);

  useFrame(({ clock, pointer }, delta) => {
    const t = clock.elapsedTime;
    const dt = Math.min(delta, 0.05);

    // Runs once whenever the stage changes
    if (lastStage.current !== stage) {
      if (stage === "jump") {
        jumpStart.current = t;
      }

      if ((stage === "returning")) {
        returnStart.current = t;
        returnCameraStart.current.copy(camera.position);
        returnLookStart.current.copy(currentLook.current);
      }
      if (stage === "world") {
        worldStart.current = t;

        camera.position.set(-7, 7.5, 26);
        currentLook.current.set(0, 2.0, -8);

        camera.fov = reducedMotion ? 52 : 66;
        camera.lookAt(currentLook.current);
      }

      lastStage.current = stage;
    }


    // Runs continuously to animate the camera
    if ((stage === "returning")) {
      const p = reducedMotion
        ? 1
        : clamp01((t - returnStart.current) / 2.25);

      const ease = p * p * (3 - 2 * p);

      destination
        .copy(returnCameraStart.current)
        .lerp(returnDestination, ease);

      targetLook
        .copy(returnLookStart.current)
        .lerp(portalLook, ease);

      camera.fov = MathUtils.damp(
        camera.fov,
        68,
        2.5,
        dt
      );
    } else if (stage === "world") {
      const intro = reducedMotion
        ? 1
        : clamp01((t - worldStart.current) / 4.5);

      const e = 1 - Math.pow(1 - intro, 3);

      const offset =
        activeArtifact === "frontend"
          ? -0.7
          : activeArtifact === "content"
          ? 0.7
          : 0;

      const drift = reducedMotion
        ? 0
        : Math.sin(t * 0.18) * 0.2;

      const px = reducedMotion ? 0 : pointer.x * 0.35;
      const py = reducedMotion ? 0 : pointer.y * 0.2;

      destination.set(
        MathUtils.lerp(-7, offset + drift + px, e),
        MathUtils.lerp(7.5, 2.8 + py, e),
        MathUtils.lerp(26, 6, e)
      );

      targetLook.set(
        offset * 1.5 + px * 0.6,
        2.0 + py * 0.4,
        -8
      );

      camera.fov = MathUtils.damp(
        camera.fov,
        52,
        3.2,
        dt
      );
    } else if (stage === "jump") {
      const p = clamp01(
        (t - jumpStart.current) / 2.15
      );

      const smooth = p * p * (3 - 2 * p);

      destination.set(
        0,
        2.25,
        MathUtils.lerp(10.5, -13.5, smooth)
      );

      targetLook.set(0, 2.3, -24);

      camera.fov = MathUtils.lerp(48, 78, p);
    } else {
      const p = reducedMotion
        ? 1
        : clamp01(t / 7);

      destination.set(
        0,
        MathUtils.lerp(2.1, 2.65, p),
        MathUtils.lerp(18, 10.5, p)
      );

      targetLook.set(0, 2.3, -8);
      camera.fov = 48;
    }

    const alpha = reducedMotion
      ? 1
      : 1 - Math.exp(
          -(stage === "jump" ? 10 : 3.6) * dt
        );

    camera.position.lerp(destination, alpha);
    currentLook.current.lerp(targetLook, alpha);

    camera.lookAt(currentLook.current);
    if (!reducedMotion) {
      const rollTarget = (stage === "jump") ? 0.05 : (stage === "returning") ? -0.03 : 0;
      roll.current = MathUtils.damp(roll.current, rollTarget, 3, dt);
      camera.rotateZ(roll.current);
      const shake = (stage === "jump") ? 0.035 : (stage === "returning") ? 0.012 : 0;
      camera.translateX((Math.sin(t * 37) + Math.sin(t * 23.7)) * shake * 0.5);
      camera.translateY((Math.sin(t * 31) + Math.sin(t * 19.3)) * shake * 0.5);
    }
    camera.updateProjectionMatrix();
  });

  return null;
}


/* ------------------------------------------------------------------ */
/* Portal hangar (opening scene) - unchanged                           */
/* ------------------------------------------------------------------ */

function EnergyRing({
  radius,
  thickness,
  color,
  speed,
  z = 0,
}: {
  radius: number;
  thickness: number;
  color: string;
  speed: number;
  z?: number;
}) {
  const ring = useRef<Mesh>(null);

  useFrame((_, delta) => {
    if (ring.current) {
      ring.current.rotation.z += delta * speed;
    }
  });

  return (
    <mesh ref={ring} position={[0, 0, z]}>
      <torusGeometry args={[radius, thickness, 14, 140]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

function HangarArchitecture() {
  const columns = useMemo(() => Array.from({ length: 9 }, (_, i) => i), []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, -10]}>
        <planeGeometry args={[70, 110]} />
        <meshStandardMaterial color="#0F1624" metalness={0.8} roughness={0.34} />
      </mesh>

      {[-4.6, 4.6].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.015, -11]}>
          <planeGeometry args={[0.065, 68]} />
          <meshBasicMaterial color={BLUE} toneMapped={false} />
        </mesh>
      ))}

      {columns.map((i) => (
        <mesh
          key={`runway-${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.018, 13 - i * 6]}
        >
          <planeGeometry args={[1.4, 0.055]} />
          <meshBasicMaterial color="#1B658B" />
        </mesh>
      ))}

      {[-1, 1].map((side) =>
        columns.map((i) => {
          const z = 13 - i * 7;
          const x = side * 8.5;
          return (
            <group key={`${side}-${i}`}>
              <mesh position={[x, 4.5, z]}>
                <boxGeometry args={[1.3, 9, 1.6]} />
                <meshStandardMaterial color="#172031" metalness={0.85} roughness={0.36} />
              </mesh>
              <mesh position={[x - side * 0.7, 4.5, z]}>
                <boxGeometry args={[0.045, 7.6, 0.14]} />
                <meshBasicMaterial color="#008FC0" toneMapped={false} />
              </mesh>
              <mesh position={[x, 9.1, z]}>
                <boxGeometry args={[3, 0.65, 2.2]} />
                <meshStandardMaterial color="#202B3E" metalness={0.7} roughness={0.4} />
              </mesh>
              <mesh position={[x, 8.65, z]} rotation={[0, 0, side * 0.27]}>
                <boxGeometry args={[0.12, 2.3, 0.1]} />
                <meshBasicMaterial color={VIOLET} />
              </mesh>
            </group>
          );
        })
      )}

      {columns.map((i) => (
        <mesh key={`ceiling-${i}`} position={[0, 9.3, 13 - i * 7]}>
          <boxGeometry args={[19, 0.48, 1.3]} />
          <meshStandardMaterial color="#1B2638" metalness={0.75} roughness={0.4} />
        </mesh>
      ))}

      <mesh position={[0, 0.35, -8]}>
        <cylinderGeometry args={[5.1, 5.5, 0.7, 64]} />
        <meshStandardMaterial color="#182437" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.73, -8]}>
        <cylinderGeometry args={[4.7, 4.7, 0.08, 64]} />
        <meshBasicMaterial color="#115D86" />
      </mesh>
    </group>
  );
}

function PortalMachine({
  stage,
  reducedMotion,
}: {
  stage: SceneStage;
  reducedMotion?: boolean;
}) {
  const portal = useRef<Group>(null);
  const energy = useRef<Mesh>(null);
  const core = useRef<Mesh>(null);
  const activated = stage === "charged" || stage === "jump";

  const segments = useMemo(() => {
    return Array.from({ length: 40 }, (_, i) => {
      const angle = (i / 40) * Math.PI * 2;
      return {
        angle,
        x: Math.cos(angle) * 4.75,
        y: Math.sin(angle) * 4.75,
      };
    });
  }, []);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;

    if (portal.current) {
      portal.current.rotation.y = reducedMotion ? 0 : Math.sin(t * 0.22) * 0.045;
    }

    if (energy.current) {
      const scale = MathUtils.damp(energy.current.scale.x, activated ? 1 : 0.05, 3.5, delta);
      energy.current.scale.set(scale, scale, 1);
    }

    if (core.current && !reducedMotion) {
      core.current.rotation.z += delta * (activated ? 0.35 : 0.05);
    }
  });

  return (
    <group position={[0, 4.8, -8]} ref={portal}>
      <EnergyRing radius={5.05} thickness={0.24} color="#27364D" speed={0.015} />
      <EnergyRing radius={4.66} thickness={0.075} color="#005E86" speed={-0.07} z={0.13} />
      <EnergyRing radius={4.36} thickness={0.085} color={BLUE} speed={0.11} z={0.25} />
      <EnergyRing radius={4.05} thickness={0.035} color={VIOLET} speed={-0.18} z={0.3} />

      <mesh position={[0, 0, -0.25]}>
        <circleGeometry args={[4, 96]} />
        <meshBasicMaterial color="#01050E" side={DoubleSide} />
      </mesh>

      <mesh ref={energy} position={[0, 0, -0.12]}>
        <circleGeometry args={[3.94, 96]} />
        <meshBasicMaterial
          color="#087DAD"
          transparent
          opacity={0.55}
          side={DoubleSide}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={core} position={[0, 0, 0.02]}>
        <torusKnotGeometry args={[2.15, 0.012, 128, 8, 3, 7]} />
        <meshBasicMaterial
          color="#4DE6FF"
          transparent
          opacity={activated ? 0.48 : 0.06}
          toneMapped={false}
        />
      </mesh>

      {segments.map((s, i) => (
        <group key={i} position={[s.x, s.y, 0]} rotation={[0, 0, s.angle]}>
          <mesh>
            <boxGeometry args={[0.7, 0.22, 0.35]} />
            <meshStandardMaterial
              color={i % 4 === 0 ? "#39567F" : "#273448"}
              metalness={0.85}
              roughness={0.3}
            />
          </mesh>
          <mesh position={[0, 0, 0.19]}>
            <boxGeometry args={[0.3, 0.04, 0.02]} />
            <meshBasicMaterial color={i % 3 === 0 ? VIOLET : BLUE} />
          </mesh>
        </group>
      ))}

      <Sparkles count={160} scale={[10, 10, 2]} size={3} speed={reducedMotion ? 0 : 0.8} color={BLUE} />
      <pointLight color={BLUE} intensity={activated ? 85 : 27} distance={20} position={[0, 0, 2]} />
      <pointLight color={VIOLET} intensity={activated ? 45 : 12} distance={15} position={[3, 2, 1]} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Frontend world: floating code panels                                */
/* ------------------------------------------------------------------ */

const CODE_LINE_WIDTHS = [1.9, 1.3, 1.7, 0.9, 1.5, 1.1];

function CodePanel({
  pos,
  rot,
  color,
  index,
  reducedMotion,
}: {
  pos: [number, number, number];
  rot: [number, number, number];
  color: string;
  index: number;
  reducedMotion?: boolean;
}) {
  const group = useRef<Group>(null);
  const lines = useRef<Group>(null);
  const scan = useRef<Mesh>(null);
  const cursor = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;

    if (group.current && !reducedMotion) {
      group.current.position.y = pos[1] + Math.sin(t * 0.6 + index * 1.7) * 0.14;
      group.current.rotation.z = rot[2] + Math.sin(t * 0.4 + index) * 0.015;
    }

    lines.current?.children.forEach((line, i) => {
      line.scale.x = reducedMotion
        ? 1
        : 0.7 + 0.3 * (0.5 + 0.5 * Math.sin(t * 1.4 + i * 1.3 + index * 2.1));
    });

    if (scan.current) {
      scan.current.position.y = reducedMotion
        ? 0
        : 0.95 - ((t * 0.45 + index * 0.23) % 1) * 1.9;
    }

    if (cursor.current) {
      cursor.current.visible = reducedMotion ? true : Math.sin(t * 5 + index) > 0;
    }
  });

  return (
    <group ref={group} position={pos} rotation={rot}>
      <mesh>
        <planeGeometry args={[3.6, 2.2]} />
        <meshStandardMaterial
          color="#0C213D"
          metalness={0.35}
          roughness={0.25}
          transparent
          opacity={0.9}
        />
      </mesh>
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[3.35, 1.95]} />
        <meshBasicMaterial color={color} transparent opacity={0.14} />
      </mesh>

      <group ref={lines}>
        {CODE_LINE_WIDTHS.map((w, i) => (
          <group key={i} position={[-1.15, 0.7 - i * 0.28, 0.03]}>
            <mesh position={[w / 2, 0, 0]}>
              <planeGeometry args={[w, 0.05]} />
              <meshBasicMaterial color={i === 0 ? color : "#3E75A5"} />
            </mesh>
          </group>
        ))}
      </group>

      <mesh position={[-1.3, 0, 0.03]}>
        <planeGeometry args={[0.08, 1.45]} />
        <meshBasicMaterial color={color} />
      </mesh>

      <mesh ref={cursor} position={[0.1, -0.98, 0.03]}>
        <planeGeometry args={[0.12, 0.06]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>

      <mesh ref={scan} position={[0, 0, 0.04]}>
        <planeGeometry args={[3.35, 0.035]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.5}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function FloatingCodePanels({ reducedMotion }: { reducedMotion?: boolean }) {
  const group = useRef<Group>(null);

  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    const targetRotation = reducedMotion
      ? 0
      : Math.sin(clock.elapsedTime * 0.12) * 0.008;
    group.current.rotation.y = MathUtils.damp(
      group.current.rotation.y,
      targetRotation,
      2,
      delta
    );
  });

  const panels = useMemo(
    () => [
      { pos: [-7.5, 4.2, -9] as [number, number, number], rot: [0, 0.4, -0.06] as [number, number, number], color: BLUE },
      { pos: [-3.8, 5.3, -12] as [number, number, number], rot: [0, 0.12, 0.05] as [number, number, number], color: VIOLET },
      { pos: [4.6, 4.6, -10] as [number, number, number], rot: [0, -0.25, 0.07] as [number, number, number], color: GOLD },
      { pos: [8, 3.8, -14] as [number, number, number], rot: [0, -0.45, -0.05] as [number, number, number], color: GREEN },
      { pos: [0, 6.1, -16] as [number, number, number], rot: [0, 0, 0.04] as [number, number, number], color: BLUE },
    ],
    []
  );

  return (
    <group ref={group}>
      {panels.map((panel, index) => (
        <CodePanel
          key={index}
          index={index}
          pos={panel.pos}
          rot={panel.rot}
          color={panel.color}
          reducedMotion={reducedMotion}
        />
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Frontend world: hologram core (reacts to the active artifact)       */
/* ------------------------------------------------------------------ */

function HologramCore({
  reducedMotion,
  activeArtifact,
}: {
  reducedMotion?: boolean;
  activeArtifact?: ArtifactKey | null;
}) {
  const group = useRef<Group>(null);
  const ringA = useRef<Mesh>(null);
  const ringB = useRef<Mesh>(null);
  const ringC = useRef<Mesh>(null);
  const shell = useRef<Mesh>(null);
  const wireMat = useRef<MeshBasicMaterial>(null);
  const platformMat = useRef<MeshBasicMaterial>(null);
  const light = useRef<PointLight>(null);
  const born = useRef<number | null>(null);

  const targets = useMemo(
    () => ({
      frontend: new Color(BLUE),
      backend: new Color(GOLD),
      seo: new Color(GREEN),
      content: new Color(VIOLET),
    }),
    []
  );

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    if (born.current === null) born.current = t;
    const g = group.current;
    if (!g) return;

    const enter = reducedMotion
      ? 1
      : easeOutBack(clamp01((t - born.current - 0.1) / 1.5));
    g.scale.setScalar(Math.max(enter, 0.0001));

    if (!reducedMotion) {
      g.position.y = 1.9 + Math.sin(t * 0.55) * 0.06;
      g.rotation.y = t * 0.2;
      if (ringA.current) ringA.current.rotation.z += delta * 0.35;
      if (ringB.current) ringB.current.rotation.z -= delta * 0.5;
      if (ringC.current) ringC.current.rotation.x += delta * 0.3;
      if (shell.current) shell.current.scale.setScalar(1 + Math.sin(t * 1.6) * 0.06);
    }

    const target = targets[activeArtifact ?? "frontend"];
    const k = 1 - Math.exp(-4 * delta);
    wireMat.current?.color.lerp(target, k);
    platformMat.current?.color.lerp(target, k);
    light.current?.color.lerp(target, k);
    if (wireMat.current) wireMat.current.opacity = 0.17 + (reducedMotion ? 0 : 0.08 * Math.sin(t * 2));
  });

  return (
    <group ref={group} position={[0, 1.9, -8.4]}>
      <mesh position={[0, -1.55, 0]}>
        <cylinderGeometry args={[2.5, 3.2, 0.55, 48]} />
        <meshStandardMaterial color="#112036" metalness={0.7} roughness={0.28} />
      </mesh>
      <mesh position={[0, -1.23, 0]}>
        <cylinderGeometry args={[2.15, 2.15, 0.05, 48]} />
        <meshBasicMaterial ref={platformMat} color={BLUE} />
      </mesh>

      <mesh ref={shell} position={[0, 0, 0]}>
        <icosahedronGeometry args={[0.95, 1]} />
        <meshBasicMaterial ref={wireMat} color={VIOLET} transparent opacity={0.17} wireframe />
      </mesh>

      <mesh ref={ringA}>
        <torusGeometry args={[1.55, 0.03, 8, 100]} />
        <meshBasicMaterial color={BLUE} toneMapped={false} />
      </mesh>
      <mesh ref={ringB} rotation={[0.8, 0.2, 0]}>
        <torusGeometry args={[1.15, 0.025, 8, 100]} />
        <meshBasicMaterial color={VIOLET} toneMapped={false} />
      </mesh>
      <mesh ref={ringC} rotation={[0.3, 0.6, 0]}>
        <torusGeometry args={[1.95, 0.018, 8, 100]} />
        <meshBasicMaterial color={GOLD} toneMapped={false} />
      </mesh>

      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={i} position={[0, -0.6 + i * 0.35, 0]}>
          <planeGeometry args={[3.2 - i * 0.36, 0.035]} />
          <meshBasicMaterial color={i % 2 === 0 ? BLUE : VIOLET} transparent opacity={0.45} />
        </mesh>
      ))}

      <Sparkles count={90} scale={[4.2, 4.2, 4.2]} size={4} speed={reducedMotion ? 0 : 0.5} color="#8FEBFF" />
      <pointLight ref={light} color={VIOLET} intensity={55} distance={18} />
      <pointLight color={VIOLET} intensity={28} distance={12} position={[1.5, 0.8, 0.8]} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Per-artifact live demos (appear above the active totem)             */
/* ------------------------------------------------------------------ */

/** UI SYSTEMS: loose blocks assemble into a component grid and break apart again. */
function UiAssembleDemo({
  color,
  active,
  reducedMotion,
}: {
  color: string;
  active: boolean;
  reducedMotion?: boolean;
}) {
  const items = useRef<Group>(null);

  const cells = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        grid: [(i % 3 - 1) * 0.42, (1 - Math.floor(i / 3)) * 0.42, 0] as [number, number, number],
        scatter: [
          Math.sin(i * 12.9898) * 1.7,
          Math.cos(i * 78.233) * 1.3,
          Math.sin(i * 37.719) * 1.1,
        ] as [number, number, number],
        spin: Math.sin(i * 5.17) * 3,
      })),
    []
  );

  useFrame(({ clock }) => {
    const g = items.current;
    if (!g || !active) return;
    const t = clock.elapsedTime;
    const raw = reducedMotion ? 1 : clamp01(0.5 + 0.85 * Math.sin(t * 0.9));
    const a = raw * raw * (3 - 2 * raw);

    g.children.forEach((k, i) => {
      const c = cells[i];
      k.position.set(
        MathUtils.lerp(c.scatter[0], c.grid[0], a),
        MathUtils.lerp(c.scatter[1], c.grid[1], a),
        MathUtils.lerp(c.scatter[2], c.grid[2], a)
      );
      k.rotation.set((1 - a) * c.spin, (1 - a) * c.spin * 0.7, 0);
    });
    g.rotation.y = reducedMotion ? 0 : Math.sin(t * 0.5) * 0.4;
  });

  return (
    <group ref={items}>
      {cells.map((_, i) => (
        <mesh key={i}>
          <boxGeometry args={[0.34, 0.34, 0.12]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={i === 4 ? 1.6 : 0.7}
            metalness={0.2}
            roughness={0.25}
            transparent
            opacity={0.92}
          />
        </mesh>
      ))}
    </group>
  );
}

/** MOTION DESIGN: a travelling double-helix wave. */
const WAVE_POINTS = 26;

function MotionWaveDemo({
  color,
  active,
  reducedMotion,
}: {
  color: string;
  active: boolean;
  reducedMotion?: boolean;
}) {
  const items = useRef<Group>(null);

  useFrame(({ clock }) => {
    const g = items.current;
    if (!g || !active) return;
    const t = reducedMotion ? 0 : clock.elapsedTime;

    g.children.forEach((k, i) => {
      const strand = i < WAVE_POINTS ? 0 : 1;
      const idx = i % WAVE_POINTS;
      const phase = t * 2.2 + idx * 0.45 + strand * Math.PI;
      k.position.set(
        (idx - (WAVE_POINTS - 1) / 2) * 0.1,
        Math.sin(phase) * 0.5,
        Math.cos(phase) * 0.5
      );
      k.scale.setScalar(0.7 + 0.5 * (0.5 + 0.5 * Math.cos(phase)));
    });
    g.rotation.z = 0.35;
    g.rotation.y = reducedMotion ? 0 : Math.sin(t * 0.4) * 0.3;
  });

  return (
    <group ref={items}>
      {Array.from({ length: WAVE_POINTS * 2 }, (_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshBasicMaterial color={i < WAVE_POINTS ? color : "#E9D5FF"} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** RESPONSIVE UX: one frame morphs phone -> tablet -> desktop while its content reflows. */
const RESPONSIVE_PRESETS: {
  w: number;
  h: number;
  blocks: [number, number, number, number][];
}[] = [
  { w: 0.75, h: 1.4, blocks: [[0, 0.42, 0.6, 0.28], [0, 0, 0.6, 0.28], [0, -0.42, 0.6, 0.28]] },
  { w: 1.3, h: 1.4, blocks: [[0, 0.45, 1.1, 0.28], [-0.3, -0.2, 0.5, 0.6], [0.3, -0.2, 0.5, 0.6]] },
  { w: 2.0, h: 1.1, blocks: [[-0.64, 0, 0.55, 0.78], [0, 0, 0.55, 0.78], [0.64, 0, 0.55, 0.78]] },
];

function ResponsiveDemo({
  color,
  active,
  reducedMotion,
}: {
  color: string;
  active: boolean;
  reducedMotion?: boolean;
}) {
  const root = useRef<Group>(null);
  const frame = useRef<Mesh>(null);
  const blocks = useRef<Group>(null);

  useFrame(({ clock }, delta) => {
    if (!active) return;
    const t = clock.elapsedTime;
    const idx = reducedMotion ? 1 : Math.floor(t / 1.8) % 3;
    const p = RESPONSIVE_PRESETS[idx];

    if (frame.current) {
      frame.current.scale.x = MathUtils.damp(frame.current.scale.x, p.w, 5, delta);
      frame.current.scale.y = MathUtils.damp(frame.current.scale.y, p.h, 5, delta);
    }

    blocks.current?.children.forEach((k, i) => {
      const b = p.blocks[i];
      k.position.x = MathUtils.damp(k.position.x, b[0], 5, delta);
      k.position.y = MathUtils.damp(k.position.y, b[1], 5, delta);
      k.scale.x = MathUtils.damp(k.scale.x, b[2], 5, delta);
      k.scale.y = MathUtils.damp(k.scale.y, b[3], 5, delta);
    });

    if (root.current) {
      root.current.rotation.y = reducedMotion ? 0 : Math.sin(t * 0.6) * 0.45;
    }
  });

  return (
    <group ref={root}>
      <mesh ref={frame} scale={[1.3, 1.4, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={color} transparent opacity={0.08} side={DoubleSide} depthWrite={false} />
        <Edges color={color} />
      </mesh>
      <group ref={blocks}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[0, 0, 0.02]} scale={[0.6, 0.28, 1]}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color={color} transparent opacity={0.55} side={DoubleSide} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** CONTENT WRITING: five floating manuscript pages, each with independently animated text. */
function ContentStoryDemo({ color, active, reducedMotion }: {
  color: string; active: boolean; reducedMotion?: boolean;
}) {
  const root = useRef<Group>(null);
  useFrame(({ clock }, delta) => {
    if (!root.current || !active) return;
    const t = clock.elapsedTime;
    root.current.rotation.y = reducedMotion ? 0 : Math.sin(t * 0.4) * 0.22;
    root.current.children.forEach((child, i) => {
      const page = child as Group;
      page.position.x = MathUtils.damp(page.position.x, (i - 2) * 0.34, 4, delta);
      page.position.y = MathUtils.damp(page.position.y, reducedMotion ? 0.12 : 0.12 + Math.sin(t * 0.9 + i * 0.6) * 0.14, 4, delta);
      page.position.z = MathUtils.damp(page.position.z, reducedMotion ? 0 : Math.cos(t * 0.7 + i * 0.8) * 0.16, 4, delta);
      page.rotation.y = MathUtils.damp(page.rotation.y, reducedMotion ? 0 : Math.sin(t * 1.2 + i * 0.9) * 0.35, 4, delta);
      page.rotation.z = MathUtils.damp(page.rotation.z, reducedMotion ? 0 : Math.sin(t * 0.8 + i) * 0.08, 4, delta);
    });
  });
  return (
    <group ref={root}>
      {Array.from({ length: 5 }, (_, i) => (
        <group key={i} position={[(i - 2) * 0.34, 0, 0]}>
          <mesh>
            <planeGeometry args={[0.56, 0.76]} />
            <meshBasicMaterial color={i === 2 ? color : "#E9D5FF"} transparent opacity={i === 2 ? 0.22 : 0.14} side={DoubleSide} depthWrite={false} toneMapped={false} />
            <Edges color={i === 2 ? color : "#C4B5FD"} />
          </mesh>
          <mesh position={[0, 0.22, 0.015]}>
            <planeGeometry args={[0.36, 0.055]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
          {Array.from({ length: 4 }, (_, line) => (
            <mesh key={line} position={[0, 0.08 - line * 0.11, 0.015]}>
              <planeGeometry args={[0.34 - line * 0.025, 0.026]} />
              <meshBasicMaterial color={line % 2 ? color : "#DDD6FE"} transparent opacity={0.75} toneMapped={false} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function TotemDemo({
  id,
  color,
  active,
  reducedMotion,
}: {
  id: ArtifactKey;
  color: string;
  active: boolean;
  reducedMotion?: boolean;
}) {
  const root = useRef<Group>(null);
  const s = useRef(0);

  useFrame((_, delta) => {
    s.current = MathUtils.damp(s.current, active ? 1 : 0, 5, delta);
    if (!root.current) return;
    root.current.visible = s.current > 0.02;
    root.current.scale.setScalar(Math.max(s.current, 0.0001));
  });

  return (
    <group ref={root} position={[0, 2.05, 0]} visible={false}>
      {id === "frontend" && <UiAssembleDemo color={color} active={active} reducedMotion={reducedMotion} />}
      {id === "backend" && <MotionWaveDemo color={color} active={active} reducedMotion={reducedMotion} />}
      {id === "seo" && <ResponsiveDemo color={color} active={active} reducedMotion={reducedMotion} />}
      {id === "content" && <ContentStoryDemo color={color} active={active} reducedMotion={reducedMotion} />}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Frontend world: interactive totems                                  */
/* ------------------------------------------------------------------ */

function ArtifactTotem({
  id,
  color,
  position,
  delay,
  active,
  reducedMotion,
  onSelect,
  onSkillOpen,
}: {
  id: ArtifactKey;
  color: string;
  position: [number, number, number];
  delay: number;
  active: boolean;
  reducedMotion?: boolean;
  onSelect?: (artifact: ArtifactKey) => void;
  onSkillOpen?: (artifact: ArtifactKey) => void;
}) {
  const group = useRef<Group>(null);
  const crystal = useRef<Mesh>(null);
  const ring = useRef<Mesh>(null);
  const glow = useRef<Mesh>(null);
  const shockwave = useRef<Mesh>(null);
  const crystalMat = useRef<MeshStandardMaterial>(null);
  const light = useRef<PointLight>(null);

  const hovered = useRef(false);
  const born = useRef<number | null>(null);
  const yState = useRef(0);
  const scaleState = useRef(0.88);
  const wasActive = useRef(false);
  const pulseStart = useRef(-10);

  useEffect(() => {
    return () => {
      document.body.style.cursor = "auto";
    };
  }, []);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    if (born.current === null) born.current = t;

    const hover = hovered.current;
    const enter = reducedMotion
      ? 1
      : easeOutBack(clamp01((t - born.current - delay) / 1.3));

    // Float, lift and scale (entrance rises up from below the floor)
    const floatOffset = reducedMotion ? 0 : Math.sin(t * 0.8 + position[0]) * 0.1;
    const targetY =
  (active ? 0.65 : 0) +
  (hover && !active ? 0.18 : 0) +
  floatOffset;
    yState.current = MathUtils.damp(yState.current, targetY, 3.5, delta);

    const targetScale = (active ? 1.35 : 0.88) * (hover ? 1.07 : 1);
    scaleState.current = MathUtils.damp(scaleState.current, targetScale, 4, delta);

    if (group.current) {
      group.current.position.y = yState.current - (1 - enter) * 3.2;
      group.current.scale.setScalar(Math.max(scaleState.current * enter, 0.0001));
    }

    // Spin faster when active or hovered
    const spin = 0.55 + (active ? 0.6 : 0) + (hover ? 0.5 : 0);
    if (crystal.current && !reducedMotion) {
      crystal.current.rotation.y += delta * spin;
      crystal.current.rotation.x += delta * 0.18;
    }
    if (ring.current && !reducedMotion) {
      ring.current.rotation.z += delta * (active ? 0.7 : hover ? 0.45 : 0.2);
    }

    if (glow.current) {
      const target = active ? 1.4 : hover ? 0.7 : 0.15;
      glow.current.scale.setScalar(MathUtils.damp(glow.current.scale.x, target, 3, delta));
    }

    if (crystalMat.current) {
      crystalMat.current.emissiveIntensity = MathUtils.damp(
        crystalMat.current.emissiveIntensity,
        active ? 2.8 : hover ? 1.6 : 0.6,
        4,
        delta
      );
      crystalMat.current.opacity = MathUtils.damp(
        crystalMat.current.opacity,
        active ? 1 : hover ? 0.9 : 0.75,
        4,
        delta
      );
    }

    if (light.current) {
      light.current.intensity = MathUtils.damp(
        light.current.intensity,
        active ? 36 : hover ? 18 : 8,
        4,
        delta
      );
    }

    // Shockwave when this totem becomes the active one
    if (active && !wasActive.current) pulseStart.current = t;
    wasActive.current = active;

    if (shockwave.current) {
      const p = clamp01((t - pulseStart.current) / 1.4);
      shockwave.current.visible = !reducedMotion && p < 1;
      shockwave.current.scale.setScalar(0.5 + p * 5.5);
      (shockwave.current.material as MeshBasicMaterial).opacity = (1 - p) * (1 - p) * 0.9;
    }
  });

  return (
    <group position={position}>
      {/* Stable hit target: outside the floating/scaling visual group. */}
      <mesh
        position={[0, 0.2, 0]}
        onPointerDown={(event) => {
          event.stopPropagation();
          onSelect?.(id);
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          hovered.current = true;
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={(event) => {
          event.stopPropagation();
          hovered.current = false;
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[1.9, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* All original holograms stay in this independently animated group. */}
      <group ref={group}>
      {/* Pedestal */}
      <mesh position={[0, -1.35, 0]}>
        <cylinderGeometry args={[1.1, 1.45, 0.44, 32]} />
        <meshStandardMaterial color="#122139" metalness={0.65} roughness={0.3} />
      </mesh>

      {/* Energy platform */}
      <mesh position={[0, -1.07, 0]}>
        <cylinderGeometry args={[0.92, 0.92, 0.04, 32]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Selection shockwave */}
      <mesh ref={shockwave} position={[0, -1.04, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.9, 1, 64]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {/* Rotating orbit */}
      <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.2, 0.025, 8, 96]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>

      {/* Selection glow */}
      <mesh ref={glow}>
        <sphereGeometry args={[0.95, 24, 24]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.08}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>

      {/* Crystal */}
      <mesh ref={crystal}>
        <octahedronGeometry args={[0.72, 0]} />
        <meshStandardMaterial
          ref={crystalMat}
          color={color}
          emissive={color}
          emissiveIntensity={0.6}
          metalness={0.15}
          roughness={0.1}
          transparent
          opacity={0.75}
        />
      </mesh>

      {/* Live demo that plays above the active totem */}
      <TotemDemo id={id} color={color} active={active} reducedMotion={reducedMotion} />

      <Sparkles
  count={30}
  scale={[2.5, 2.5, 2.5]}
  size={active ? 4 : 2}
  speed={reducedMotion ? 0 : 0.3}
  color={color}
/>

      <pointLight ref={light} color={color} intensity={8} distance={active ? 11 : 6} />

        {/* Labels are DOM controls supplied by CinematicHero. */}
    </group>
  </group>
  );
}

/* ------------------------------------------------------------------ */
/* Energy beams from each totem into the hologram core                 */
/* ------------------------------------------------------------------ */

function EnergyBeam({
  from,
  color,
  active,
}: {
  from: [number, number, number];
  color: string;
  active: boolean;
}) {
  const beamMat = useRef<MeshBasicMaterial>(null);
  const pulse = useRef<Mesh>(null);
  const pulseMat = useRef<MeshBasicMaterial>(null);

  const { mid, quat, length } = useMemo(() => {
    const start = new Vector3(from[0], from[1] + 0.3, from[2]);
    const dir = CORE_POS.clone().sub(start);
    const len = dir.length();
    const m = start.clone().add(CORE_POS).multiplyScalar(0.5);
    const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.normalize());
    return { mid: m, quat: q, length: len };
  }, [from]);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;

    if (beamMat.current) {
      beamMat.current.opacity = MathUtils.damp(
        beamMat.current.opacity,
        active ? 0.6 : 0.07,
        4,
        delta
      );
    }

    if (pulse.current && pulseMat.current) {
      pulse.current.position.y = MathUtils.lerp(-length / 2, length / 2, (t * 0.65) % 1);
      pulseMat.current.opacity = MathUtils.damp(pulseMat.current.opacity, active ? 1 : 0, 6, delta);
      pulse.current.visible = pulseMat.current.opacity > 0.02;
    }
  });

  return (
    <group position={mid} quaternion={quat}>
      <mesh>
        <cylinderGeometry args={[0.025, 0.025, length, 8]} />
        <meshBasicMaterial
          ref={beamMat}
          color={color}
          transparent
          opacity={0.07}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={pulse} visible={false}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshBasicMaterial
          ref={pulseMat}
          color={color}
          transparent
          opacity={0}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Floor: ambient pulses + click ripples                               */
/* ------------------------------------------------------------------ */

type Ripple = { x: number; z: number; t: number };
const RIPPLE_LIFE = 2.2;
const MAX_RIPPLES = 4;

function FloorPulses({ reducedMotion }: { reducedMotion?: boolean }) {
  const group = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return;
    const t = clock.elapsedTime;
    group.current.children.forEach((k, i) => {
      const p = (t * 0.22 + i / 3) % 1;
      k.scale.setScalar(0.35 + p * 3.4);
      ((k as Mesh).material as MeshBasicMaterial).opacity = (1 - p) * (1 - p) * 0.55;
    });
  });

  return (
    <group ref={group} position={[0, -1.46, -8.4]} rotation={[-Math.PI / 2, 0, 0]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i}>
          <ringGeometry args={[4, 4.06, 128]} />
          <meshBasicMaterial
            color={BLUE}
            transparent
            opacity={0.3}
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function FloorRipples({ ripples }: { ripples: React.MutableRefObject<Ripple[]> }) {
  const group = useRef<Group>(null);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const now = performance.now() / 1000;
    ripples.current = ripples.current.filter((r) => now - r.t < RIPPLE_LIFE);

    g.children.forEach((k, i) => {
      const r = ripples.current[i];
      const mesh = k as Mesh;
      if (!r) {
        mesh.visible = false;
        return;
      }
      const p = (now - r.t) / RIPPLE_LIFE;
      mesh.visible = true;
      mesh.position.set(r.x, -1.44, r.z);
      mesh.scale.setScalar(0.3 + p * 5);
      (mesh.material as MeshBasicMaterial).opacity = (1 - p) * (1 - p) * 0.8;
    });
  });

  return (
    <group ref={group}>
      {Array.from({ length: MAX_RIPPLES }, (_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <ringGeometry args={[0.9, 1, 64]} />
          <meshBasicMaterial
            color="#7DD3FC"
            transparent
            opacity={0}
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Exit portal                                                         */
/* ------------------------------------------------------------------ */

function ExitPortal({ reducedMotion }: { reducedMotion?: boolean }) {
  const group = useRef<Group>(null);
  const inner = useRef<Mesh>(null);
  const swirl = useRef<Mesh>(null);
  const discMat = useRef<MeshBasicMaterial>(null);

  useFrame(({ clock }, delta) => {
    if (reducedMotion) return;
    const t = clock.elapsedTime;
    if (group.current) group.current.rotation.y = Math.sin(t * 0.2) * 0.12;
    if (inner.current) inner.current.rotation.z += delta * 0.8;
    if (swirl.current) swirl.current.rotation.z -= delta * 0.5;
    if (discMat.current) discMat.current.opacity = 0.45 + 0.15 * Math.sin(t * 2);
  });

  return (
    <group ref={group} position={[0, 2.3, -24]}>
      <mesh>
        <torusGeometry args={[2.5, 0.08, 20, 120]} />
        <meshBasicMaterial color={GOLD} toneMapped={false} />
      </mesh>
      <mesh ref={inner}>
        <torusGeometry args={[2.1, 0.03, 12, 100]} />
        <meshBasicMaterial color="#FFD28A" toneMapped={false} />
      </mesh>
      <mesh ref={swirl} position={[0, 0, 0.02]}>
        <torusKnotGeometry args={[1.5, 0.012, 128, 8, 2, 5]} />
        <meshBasicMaterial color={GOLD} transparent opacity={0.5} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, -0.08]}>
        <circleGeometry args={[2.3, 80]} />
        <meshBasicMaterial ref={discMat} color="#30220C" transparent opacity={0.55} side={DoubleSide} />
      </mesh>
      <pointLight color={GOLD} intensity={35} distance={15} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Frontend world                                                      */
/* ------------------------------------------------------------------ */

function FrontendWorld({
  reducedMotion,
  activeArtifact = "frontend",
  onArtifactSelect,
  onSkillOpen,
  autoTour = true,
}: {
  reducedMotion?: boolean;
  activeArtifact?: ArtifactKey | null;
  onArtifactSelect?: (artifact: ArtifactKey) => void;
  onSkillOpen?: (artifact: ArtifactKey) => void;
  autoTour?: boolean;
}) {
  const group = useRef<Group>(null);
  const ripples = useRef<Ripple[]>([]);

  const activeRef = useRef<ArtifactKey | null | undefined>(activeArtifact);
  const selectRef = useRef(onArtifactSelect);
  const lastChange = useRef(performance.now());

  useEffect(() => {
    activeRef.current = activeArtifact;
    lastChange.current = performance.now();
  }, [activeArtifact]);

  useEffect(() => {
    selectRef.current = onArtifactSelect;
  }, [onArtifactSelect]);

  // Idle auto-tour: cycles artifacts if the visitor hasn't interacted for a while.
  useEffect(() => {
    if (!autoTour || reducedMotion) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      if (performance.now() - lastChange.current < AUTO_TOUR_MS) return;
      const current = ARTIFACT_ORDER.indexOf(activeRef.current ?? "frontend");
      selectRef.current?.(ARTIFACT_ORDER[(current + 1) % ARTIFACT_ORDER.length]);
    }, 1000);
    return () => window.clearInterval(id);
  }, [autoTour, reducedMotion]);

  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    const targetRotation = reducedMotion
      ? 0
      : Math.sin(clock.elapsedTime * 0.12) * 0.008;
    group.current.rotation.y = MathUtils.damp(
      group.current.rotation.y,
      targetRotation,
      2,
      delta
    );
  });

  return (
    <group ref={group}>
      {/* Floor: click anywhere to send a ripple across the world */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.5, -9]}
        onPointerDown={(event) => {
          event.stopPropagation();
          ripples.current.push({
            x: event.point.x,
            z: event.point.z,
            t: performance.now() / 1000,
          });
          if (ripples.current.length > MAX_RIPPLES) ripples.current.shift();
        }}
      >
        <circleGeometry args={[24, 80]} />
        <meshStandardMaterial color="#07111F" metalness={0.6} roughness={0.35} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.48, -9]}>
        <ringGeometry args={[6, 14, 96]} />
        <meshBasicMaterial color="#0D3763" transparent opacity={0.22} />
      </mesh>

      <FloorPulses reducedMotion={reducedMotion} />
      <FloorRipples ripples={ripples} />

      <mesh position={[0, -4.3, -12]}>
        <sphereGeometry args={[7.6, 48, 48]} />
        <meshBasicMaterial color="#10255C" wireframe transparent opacity={0.17} />
      </mesh>

      <HologramCore reducedMotion={reducedMotion} activeArtifact={activeArtifact} />
      <FloatingCodePanels reducedMotion={reducedMotion} />

      {TOTEMS.map((totem) => (
        <EnergyBeam
          key={`beam-${totem.id}`}
          from={totem.position}
          color={totem.color}
          active={activeArtifact === totem.id}
        />
      ))}

      {TOTEMS.map((totem) => (
        <ArtifactTotem
          key={totem.id}
          id={totem.id}
          color={totem.color}
          position={totem.position}
          delay={totem.delay}
          active={activeArtifact === totem.id}
          reducedMotion={reducedMotion}
          onSelect={onArtifactSelect}
          onSkillOpen={onSkillOpen}
        />
      ))}

      <ExitPortal reducedMotion={reducedMotion} />

      <Sparkles count={160} scale={[22, 12, 28]} size={3} speed={reducedMotion ? 0 : 0.45} color="#7DD3FC" />

      <pointLight position={[0, 5, -4]} intensity={45} distance={20} color={BLUE} />
      <pointLight position={[-7, 4, -9]} intensity={26} distance={18} color={VIOLET} />
      <pointLight position={[7, 4, -9]} intensity={26} distance={18} color={GOLD} />

      <Stars radius={90} depth={50} count={1000} factor={2} saturation={0} fade speed={reducedMotion ? 0 : 0.08} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Scene + canvas                                                      */
/* ------------------------------------------------------------------ */


/* Cinematic hyperspace streaks: shared by jump and reverse journey. */
function WarpTunnel({ stage, reducedMotion }: { stage: SceneStage; reducedMotion?: boolean }) {
  const ref = useRef<LineSegments>(null);
  const power = useRef(0);
  const { geometry, seeds } = useMemo(() => {
    const count = 220;
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(new Float32Array(count * 6), 3));
    const points = Array.from({ length: count }, (_, i) => {
      const a = ((i * 0.61803398875) % 1) * Math.PI * 2;
      const r = 1.5 + ((i * 0.754877666) % 1) * 7;
      return {
        x: Math.cos(a) * r,
        y: Math.sin(a) * r + 2.3,
        z: -((i * 0.56984029) % 1) * 60,
        speed: 0.6 + ((i * 0.414213562) % 1) * 0.8,
        len: 1.5 + ((i * 0.732050807) % 1) * 4,
      };
    });
    return { geometry: geo, seeds: points };
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame((_, delta) => {
    const enabled = !reducedMotion && (stage === "jump" || stage === "returning");
    power.current = MathUtils.damp(power.current, enabled ? 1 : 0, enabled ? 2.5 : 5, delta);
    if (!ref.current) return;
    ref.current.visible = power.current > 0.01;
    (ref.current.material as LineBasicMaterial).opacity = power.current * 0.8;
    const attr = geometry.getAttribute("position") as BufferAttribute;
    const array = attr.array as Float32Array;
    seeds.forEach((s, i) => {
      s.z += delta * (40 * s.speed * power.current + 5);
      if (s.z > 16) s.z -= 76;
      const o = i * 6;
      array[o] = s.x; array[o + 1] = s.y; array[o + 2] = s.z;
      array[o + 3] = s.x; array[o + 4] = s.y;
      array[o + 5] = s.z - s.len * power.current * 3;
    });
    attr.needsUpdate = true;
  });
  return (
    <lineSegments ref={ref} geometry={geometry} frustumCulled={false} visible={false}>
      <lineBasicMaterial color="#7fe9ff" transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
    </lineSegments>
  );
}

function CinematicFX({
  stage,
  reducedMotion,
}: {
  stage: SceneStage;
  reducedMotion?: boolean;
}) {
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        mipmapBlur
        luminanceThreshold={0.55}
        luminanceSmoothing={0.2}
        intensity={
          stage === "jump" ? 1.8 :
          stage === "world" ? 1.1 : 0.8
        }
      />

      <ChromaticAberration
        offset={new Vector2(...(reducedMotion ? [0, 0] : stage === "jump" || stage === "returning" ? [0.006, 0.003] : [0.0005, 0.0003]))}
        radialModulation={false}
      />

      <Noise
        opacity={reducedMotion ? 0 : 0.035}
        blendFunction={BlendFunction.SOFT_LIGHT}
      />

      <Vignette offset={0.2} darkness={0.75} />
    </EffectComposer>
  );
}

function SceneContent({
  stage,
  reducedMotion,
  activeArtifact,
  onArtifactSelect,
  onSkillOpen,
  autoTour,
}: Props) {
  const world = stage === "world" || stage === "returning";

  return (
    <>
      <FrameCamera
        stage={stage}
        reducedMotion={reducedMotion}
        activeArtifact={activeArtifact}
      />

      <color attach="background" args={[world ? "#020816" : "#03050B"]} />

      <fog
        attach="fog"
        args={[
          world ? new Color("#020816") : new Color("#070C17"),
          world ? 32 : 17,
          world ? 110 : 75,
        ]}
      />

      <ambientLight intensity={world ? 1.25 : 0.35} />

      {world ? (
        <FrontendWorld
          reducedMotion={reducedMotion}
          activeArtifact={activeArtifact}
          onArtifactSelect={onArtifactSelect}
          onSkillOpen={onSkillOpen}
          autoTour={autoTour}
        />
      ) : (
        <>
          <HangarArchitecture />
          <PortalMachine stage={stage} reducedMotion={reducedMotion} />
          <Stars radius={90} depth={45} count={700} factor={2} saturation={0} fade speed={reducedMotion ? 0 : 0.1} />
        </>
      )}
      <WarpTunnel stage={stage} reducedMotion={reducedMotion} />
      <CinematicFX stage={stage} reducedMotion={reducedMotion} />
    </>
  );
}

export default function PortalCanvas({
  stage,
  reducedMotion = false,
  activeArtifact = "frontend",
  onArtifactSelect,
  onSkillOpen,
  autoTour = true,
}: Props) {
  return (
    <Canvas
      camera={{
        position: [0, 2.1, 18],
        fov: 48,
        near: 0.08,
        far: 180,
      }}
      dpr={[1, 1.35]}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      }}
      style={{
        width: "100%",
        height: "100%",
      }}
    >
      <SceneContent
        stage={stage}
        reducedMotion={reducedMotion}
        activeArtifact={activeArtifact}
        onArtifactSelect={onArtifactSelect}
        onSkillOpen={onSkillOpen}
        autoTour={autoTour}
      />
    </Canvas>
  );
}