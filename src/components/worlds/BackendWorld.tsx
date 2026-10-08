"use client";



/**

 * DIMENSION 02: THE REQUEST

 *

 * A one-take shot. A packet of light falls through a glass floor into a city

 * of light, gets rejected at a security gate (401), fetches a token, is routed

 * through middleware rings, reads a row from a wall of database tables, and

 * shoots back up to the interface.

 *

 * Nothing here is clickable, so there is no raycasting to fight with. The

 * camera rides a curve and everything reads from the shared `journey` object.

 */



import {

  useEffect,

  useLayoutEffect,

  useMemo,

  useRef,

  type MutableRefObject,

} from "react";

import { useFrame, useThree } from "@react-three/fiber";

import { Sparkles } from "@react-three/drei";

import {

  AdditiveBlending,

  CanvasTexture,

  CatmullRomCurve3,

  Color,

  DoubleSide,

  Group,

  GridHelper,

  InstancedMesh,

  LineBasicMaterial,

  MathUtils,

  Mesh,

  MeshBasicMaterial,

  Object3D,

  PerspectiveCamera,

  PointLight,

  Quaternion,

  SRGBColorSpace,

  TubeGeometry,

  Vector3,

} from "three";

import { MARKS, type Journey } from "./journey";



/* ------------------------------------------------------------------ */

/* Constants + shared helpers                                          */

/* ------------------------------------------------------------------ */



const CYAN = "#35d8ff";

const AMBER = "#ffb547";

const RED = "#ff4258";

const GREEN = "#38f2a5";

const WHITE = "#eaf9ff";

const VIOLET = "#8b5cf6";



const GLASS_Y = 17;

const WALL_Z = -112;

const COLS = 9;

const ROWS = 10;

const TARGET_ROW = 3;

const TARGET_COL = 5;

const TARGET_I = TARGET_ROW * COLS + TARGET_COL;

const TARGET_POS = new Vector3((TARGET_COL - 4) * 6.8, 3 + TARGET_ROW * 3.9, WALL_Z + 0.5);

const WALL_CENTER = new Vector3(0, 16, WALL_Z);



/** 10 control points: point i sits exactly at t = i / 9 */

const POINTS = [

  new Vector3(0, 30, 16), // 0 high above the glass floor

  new Vector3(0, 14, 12), // 1 falling

  new Vector3(0, 2.6, 4), // 2 street level

  new Vector3(0, 2.6, -16), // 3 security gate

  new Vector3(0, 2.6, -32), // 4

  new Vector3(0, 2.6, -46), // 5 rail junction

  new Vector3(7, 2.6, -58), // 6 routed right

  new Vector3(7, 2.6, -72), // 7

  new Vector3(0, 2.6, -88), // 8 approaching the archive

  new Vector3(0, 3.4, -96), // 9 in front of the wall

];

const PATH = new CatmullRomCurve3(POINTS, false, "centripetal");

const STATION = PATH.getPoint(MARKS.bounce).add(new Vector3(-6, 1.5, 0));



const smooth = (x: number) => {

  const t = MathUtils.clamp(x, 0, 1);

  return t * t * (3 - 2 * t);

};



function packetPosition(j: Journey, out: Vector3) {

  PATH.getPoint(MathUtils.clamp(j.p, 0, 1), out);

  if (j.rise > 0) out.y += Math.pow(j.rise, 1.7) * 90;

  return out;

}



function rng(seed: number) {

  return () => {

    seed |= 0;

    seed = (seed + 0x6d2b79f5) | 0;

    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);

    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;

  };

}



type JourneyRef = MutableRefObject<Journey>;

type Common = { journey: JourneyRef; reducedMotion?: boolean };



/* ------------------------------------------------------------------ */

/* The city: towers with light strips, plus overhead traffic            */

/* ------------------------------------------------------------------ */



const TOWER_COUNT = 150;



function City() {

  const towers = useRef<InstancedMesh>(null);

  const strips = useRef<InstancedMesh>(null);



  const data = useMemo(() => {

    const r = rng(7);

    return Array.from({ length: TOWER_COUNT }, () => {

      const side = r() < 0.5 ? -1 : 1;

      return {

        side,

        x: side * (15 + Math.pow(r(), 1.4) * 70),

        z: 34 - r() * 139,

        w: 2 + r() * 4,

        d: 2 + r() * 4,

        h: 3 + Math.pow(r(), 2.2) * 12,

        sy: 0.3 + r() * 0.6,

        warm: r() < 0.22,

      };

    });

  }, []);



  useLayoutEffect(() => {

    const t = towers.current;

    const s = strips.current;

    if (!t || !s) return;

    const o = new Object3D();

    const c = new Color();

    data.forEach((d, i) => {

      o.position.set(d.x, d.h / 2, d.z);

      o.scale.set(d.w, d.h, d.d);

      o.updateMatrix();

      t.setMatrixAt(i, o.matrix);



      o.position.set(d.x - d.side * (d.w / 2 + 0.03), (d.h * d.sy) / 2, d.z);

      o.scale.set(0.12, d.h * d.sy, d.d * 0.6);

      o.updateMatrix();

      s.setMatrixAt(i, o.matrix);

      s.setColorAt(i, c.set(d.warm ? AMBER : CYAN));

    });

    t.instanceMatrix.needsUpdate = true;

    s.instanceMatrix.needsUpdate = true;

    if (s.instanceColor) s.instanceColor.needsUpdate = true;

  }, [data]);



  return (

    <>

      <instancedMesh ref={towers} args={[undefined, undefined, TOWER_COUNT]} frustumCulled={false}>

        <boxGeometry args={[1, 1, 1]} />

        <meshStandardMaterial color="#0a1422" emissive="#04101c" metalness={0.6} roughness={0.5} />

      </instancedMesh>

      <instancedMesh ref={strips} args={[undefined, undefined, TOWER_COUNT]} frustumCulled={false}>

        <boxGeometry args={[1, 1, 1]} />

        <meshBasicMaterial toneMapped={false} />

      </instancedMesh>

    </>

  );

}



const CAR_COUNT = 140;



function Traffic({ journey, reducedMotion }: Common) {

  const mesh = useRef<InstancedMesh>(null);

  const dummy = useMemo(() => new Object3D(), []);

  const cars = useMemo(() => {

    const r = rng(21);

    return Array.from({ length: CAR_COUNT }, () => {

      const pick = r();

      return {

        x: (r() < 0.5 ? -1 : 1) * (8.7 + r() * 2.7),

        y: 0.5 + r() * 11,

        z: 34 - r() * 142,

        v: (6 + r() * 18) * (r() < 0.5 ? -1 : 1),

        len: 0.9 + r() * 2.4,

        color: pick < 0.5 ? CYAN : pick < 0.8 ? WHITE : AMBER,

      };

    });

  }, []);



  useLayoutEffect(() => {

    const m = mesh.current;

    if (!m) return;

    const c = new Color();

    cars.forEach((car, i) => m.setColorAt(i, c.set(car.color)));

    if (m.instanceColor) m.instanceColor.needsUpdate = true;

  }, [cars]);



  useFrame((_, delta) => {

    const m = mesh.current;

    if (!m) return;

    const dt = Math.min(delta, 0.05);

    const k = reducedMotion ? 0 : 1 - journey.current.slow * 0.88;

    cars.forEach((c, i) => {

      c.z += c.v * dt * k;

      if (c.z < -108) c.z = 34;

      if (c.z > 34) c.z = -108;

      dummy.position.set(c.x, c.y, c.z);

      dummy.scale.set(0.14, 0.14, c.len);

      dummy.updateMatrix();

      m.setMatrixAt(i, dummy.matrix);

    });

    m.instanceMatrix.needsUpdate = true;

  });



  return (

    <instancedMesh ref={mesh} args={[undefined, undefined, CAR_COUNT]} frustumCulled={false}>

      <boxGeometry args={[1, 1, 1]} />

      <meshBasicMaterial toneMapped={false} />

    </instancedMesh>

  );

}



/* ------------------------------------------------------------------ */

/* The glass floor you fall through                                    */

/* ------------------------------------------------------------------ */



function GlassFloor({ journey }: { journey: JourneyRef }) {

  const pane = useRef<Group>(null);

  const grid = useRef<GridHelper>(null);

  const fill = useRef<MeshBasicMaterial>(null);

  const ring = useRef<Mesh>(null);

  const ringMat = useRef<MeshBasicMaterial>(null);

  const p = useMemo(() => new Vector3(), []);



  useFrame(() => {

    const j = journey.current;

    packetPosition(j, p);

    const fade = j.rise > 0 ? 1 : MathUtils.clamp((GLASS_Y + 0.5 - p.y) / 5, 0, 1);



    if (pane.current) {

      pane.current.visible = fade < 0.995;

      pane.current.scale.set(1 + fade * 0.7, 1, 1 + fade * 0.7);

    }

    if (grid.current) {

      const m = grid.current.material as LineBasicMaterial;

      m.transparent = true;

      m.opacity = 0.8 * (1 - fade);

    }

    if (fill.current) fill.current.opacity = 0.1 * (1 - fade);

    if (ring.current && ringMat.current) {

      const on = fade > 0.001 && fade < 0.995;

      ring.current.visible = on;

      ring.current.scale.setScalar(2 + fade * 70);

      ringMat.current.opacity = (1 - fade) * 0.9;

    }

  });



  return (

    <group position={[0, GLASS_Y, 0]}>

      <group ref={pane} position={[0, 0, -30]}>

        <gridHelper ref={grid} args={[170, 68, "#7fe9ff", "#2a6e8a"]} />

        <mesh rotation={[-Math.PI / 2, 0, 0]}>

          <planeGeometry args={[170, 170]} />

          <meshBasicMaterial

            ref={fill}

            color="#0a5070"

            transparent

            opacity={0.1}

            side={DoubleSide}

            depthWrite={false}

            blending={AdditiveBlending}

          />

        </mesh>

      </group>

      <mesh ref={ring} position={[0, 0, 8]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>

        <ringGeometry args={[1, 1.06, 96]} />

        <meshBasicMaterial

          ref={ringMat}

          color={WHITE}

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

/* Chapter 1: the security gate                                        */

/* ------------------------------------------------------------------ */



function Gate({ journey, reducedMotion }: Common) {

  const z = useMemo(() => PATH.getPoint(MARKS.gate).z, []);

  const left = useRef<Group>(null);

  const right = useRef<Group>(null);

  const scan = useRef<Mesh>(null);

  const ringMat = useRef<MeshBasicMaterial>(null);

  const discMat = useRef<MeshBasicMaterial>(null);

  const scanMat = useRef<MeshBasicMaterial>(null);

  const stripA = useRef<MeshBasicMaterial>(null);

  const stripB = useRef<MeshBasicMaterial>(null);

  const light = useRef<PointLight>(null);

  const k = useMemo(

    () => ({ c: new Color(), cyan: new Color(CYAN), red: new Color(RED), green: new Color(GREEN) }),

    []

  );



  useFrame(({ clock }) => {

    const j = journey.current;

    const t = clock.elapsedTime;

    const open = smooth(j.gate);

    k.c.copy(k.cyan).lerp(k.red, j.rejected).lerp(k.green, open);



    [ringMat, discMat, scanMat, stripA, stripB].forEach((m) => m.current?.color.copy(k.c));



    if (left.current) left.current.position.x = -open * 6.2;

    if (right.current) right.current.position.x = open * 6.2;

    if (discMat.current) discMat.current.opacity = (0.12 + j.rejected * 0.3) * (1 - open);

    if (scan.current) {

      scan.current.visible = open < 0.98;

      scan.current.position.y = 5.4 + Math.sin(t * (reducedMotion ? 0 : 1.6 + j.rejected * 6)) * 4.6;

    }

    if (scanMat.current) scanMat.current.opacity = 0.5 + j.rejected * 0.5;

    if (light.current) {

      light.current.color.copy(k.c);

      light.current.intensity = 14 + j.rejected * 60 + open * 20;

    }

  });



  return (

    <group position={[0, 0, z]}>

      {[-1, 1].map((s) => (

        <group key={s}>

          <mesh position={[s * 7.6, 7, 0]}>

            <boxGeometry args={[1.6, 14, 2]} />

            <meshStandardMaterial color="#0b1828" metalness={0.7} roughness={0.4} />

          </mesh>

          <mesh position={[s * 6.74, 7, 0.6]}>

            <boxGeometry args={[0.1, 13, 0.3]} />

            <meshBasicMaterial ref={s < 0 ? stripA : stripB} color={CYAN} toneMapped={false} />

          </mesh>

        </group>

      ))}

      <mesh position={[0, 14.4, 0]}>

        <boxGeometry args={[17.2, 1.2, 2]} />

        <meshStandardMaterial color="#0b1828" metalness={0.7} roughness={0.4} />

      </mesh>



      <mesh position={[0, 5.4, 0]}>

        <torusGeometry args={[5.4, 0.13, 12, 96]} />

        <meshBasicMaterial ref={ringMat} color={CYAN} toneMapped={false} />

      </mesh>

      <mesh position={[0, 5.4, -0.1]}>

        <circleGeometry args={[5.3, 64]} />

        <meshBasicMaterial

          ref={discMat}

          color={CYAN}

          transparent

          opacity={0.12}

          side={DoubleSide}

          depthWrite={false}

          blending={AdditiveBlending}

          toneMapped={false}

        />

      </mesh>



      <group ref={left} position={[0, 5.4, -1.4]}>

        <mesh>

          <circleGeometry args={[5.3, 48, Math.PI / 2, Math.PI]} />

          <meshStandardMaterial color="#07121f" metalness={0.8} roughness={0.35} side={DoubleSide} />

        </mesh>

      </group>

      <group ref={right} position={[0, 5.4, -1.4]}>

        <mesh>

          <circleGeometry args={[5.3, 48, -Math.PI / 2, Math.PI]} />

          <meshStandardMaterial color="#07121f" metalness={0.8} roughness={0.35} side={DoubleSide} />

        </mesh>

      </group>



      <mesh ref={scan} position={[0, 5.4, 0.1]}>

        <boxGeometry args={[10.8, 0.07, 0.07]} />

        <meshBasicMaterial ref={scanMat} color={CYAN} transparent opacity={0.6} toneMapped={false} />

      </mesh>

      <pointLight ref={light} position={[0, 6, 5]} color={CYAN} intensity={14} distance={30} />

    </group>

  );

}



/* ------------------------------------------------------------------ */

/* Chapter 2: rail yard, switch and middleware rings                   */

/* ------------------------------------------------------------------ */



const SEG = 220;

const RADIAL = 6;



function Rails({ journey }: { journey: JourneyRef }) {

  const lit = useRef<TubeGeometry>(null);



  const geo = useMemo(() => {

    const jz = PATH.getPoint(MARKS.junction).z;

    const ground = new CatmullRomCurve3(

      POINTS.slice(2).map((p) => new Vector3(p.x, 0.14, p.z)),

      false,

      "centripetal"

    );

    const branch = (pts: [number, number][]) =>

      new TubeGeometry(

        new CatmullRomCurve3(pts.map(([x, z]) => new Vector3(x, 0.14, z)), false, "centripetal"),

        80,

        0.07,

        6,

        false

      );

    return {

      main: new TubeGeometry(ground, SEG, 0.1, RADIAL, false),

      lit: new TubeGeometry(ground, SEG, 0.125, RADIAL, false),

      left: branch([[0, jz], [-2, jz - 6], [-7, jz - 14], [-8, jz - 26]]),

      center: branch([[0, jz], [0, jz - 12], [0, jz - 26]]),

    };

  }, []);



  useEffect(

    () => () => {

      Object.values(geo).forEach((g) => g.dispose());

    },

    [geo]

  );



  useFrame(() => {

    const frac = MathUtils.clamp((journey.current.p - MARKS.landed) / (1 - MARKS.landed), 0, 1);

    geo.lit.setDrawRange(0, Math.floor(frac * SEG) * RADIAL * 6);

  });



  return (

    <group>

      <mesh geometry={geo.main}>

        <meshBasicMaterial color="#12607f" transparent opacity={0.55} toneMapped={false} />

      </mesh>

      <mesh geometry={geo.lit}>

        <meshBasicMaterial color={CYAN} toneMapped={false} />

      </mesh>

      <mesh geometry={geo.left}>

        <meshBasicMaterial color="#1b4a63" transparent opacity={0.7} toneMapped={false} />

      </mesh>

      <mesh geometry={geo.center}>

        <meshBasicMaterial color="#1b4a63" transparent opacity={0.7} toneMapped={false} />

      </mesh>

      {[[-8, -72], [0, -72]].map(([x, zz]) => (

        <mesh key={`${x}`} position={[x, 0.15, zz]} rotation={[-Math.PI / 2, 0, 0]}>

          <planeGeometry args={[3, 3]} />

          <meshBasicMaterial color="#1b6a8a" transparent opacity={0.3} toneMapped={false} />

        </mesh>

      ))}

    </group>

  );

}



function Switch({ journey }: { journey: JourneyRef }) {

  const plate = useRef<Group>(null);

  const jz = useMemo(() => PATH.getPoint(MARKS.junction).z, []);



  useFrame(() => {

    const k = smooth((journey.current.p - (MARKS.junction - 0.075)) / 0.04);

    if (plate.current) plate.current.rotation.y = -Math.atan2(7, 12) * k;

  });



  return (

    <group position={[0, 0.18, jz]}>

      <mesh rotation={[-Math.PI / 2, 0, 0]}>

        <torusGeometry args={[2.2, 0.06, 8, 64]} />

        <meshBasicMaterial color={CYAN} transparent opacity={0.7} toneMapped={false} />

      </mesh>

      <group ref={plate}>

        <mesh position={[0, 0, -1.8]}>

          <boxGeometry args={[0.5, 0.12, 3.6]} />

          <meshBasicMaterial color={AMBER} toneMapped={false} />

        </mesh>

      </group>

    </group>

  );

}



const RING_COLORS = [CYAN, VIOLET, WHITE];



function MiddlewareRings({ journey }: { journey: JourneyRef }) {

  const refs = useRef<(Mesh | null)[]>([]);

  const data = useMemo(

    () =>

      MARKS.rings.map((t, i) => ({

        t,

        color: RING_COLORS[i],

        pos: PATH.getPoint(t),

        q: new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), PATH.getTangent(t)),

      })),

    []

  );



  useFrame(({ clock }) => {

    const p = journey.current.p;

    const time = clock.elapsedTime;

    data.forEach((d, i) => {

      const m = refs.current[i];

      if (!m) return;

      const near = Math.exp(-Math.pow((p - d.t) / 0.022, 2));

      (m.material as MeshBasicMaterial).opacity = 0.4 + near * 0.6;

      m.scale.setScalar(1 + near * 0.35);

      m.rotation.z = time * (0.4 + i * 0.15);

    });

  });



  return (

    <>

      {data.map((d, i) => (

        <group key={i} position={d.pos} quaternion={d.q}>

          <mesh

            ref={(el) => {

              refs.current[i] = el;

            }}

          >

            <torusGeometry args={[3.1, 0.09, 10, 80]} />

            <meshBasicMaterial color={d.color} transparent opacity={0.4} toneMapped={false} />

          </mesh>

          <mesh>

            <torusGeometry args={[2.55, 0.035, 8, 64]} />

            <meshBasicMaterial color={d.color} transparent opacity={0.25} toneMapped={false} />

          </mesh>

        </group>

      ))}

    </>

  );

}



/* ------------------------------------------------------------------ */

/* Chapter 3: the archive, a wall of database tables                    */

/* ------------------------------------------------------------------ */



function Archive({ journey }: { journey: JourneyRef }) {

  const mesh = useRef<InstancedMesh>(null);

  const dummy = useMemo(() => new Object3D(), []);

  const colors = useMemo(() => ({ c: new Color(), cyan: new Color(CYAN), white: new Color(WHITE) }), []);



  const texture = useMemo(() => {

    const c = document.createElement("canvas");

    c.width = 256;

    c.height = 140;

    const g = c.getContext("2d")!;

    g.fillStyle = "#04141f";

    g.fillRect(0, 0, 256, 140);

    g.fillStyle = "#0e4560";

    g.fillRect(0, 0, 256, 26);

    g.strokeStyle = "#35d8ff";

    g.lineWidth = 4;

    g.strokeRect(2, 2, 252, 136);

    g.strokeStyle = "#176a8c";

    g.lineWidth = 2;

    for (let y = 54; y < 140; y += 28) {

      g.beginPath();

      g.moveTo(0, y);

      g.lineTo(256, y);

      g.stroke();

    }

    g.beginPath();

    g.moveTo(96, 0);

    g.lineTo(96, 140);

    g.stroke();

    g.fillStyle = "#7fe9ff";

    g.fillRect(10, 9, 50, 8);

    g.fillRect(110, 9, 80, 8);

    g.fillStyle = "#2a8fb5";

    for (let r = 0; r < 3; r++) {

      g.fillRect(10, 26 + r * 28 + 10, 30 + ((r * 17) % 40), 7);

      g.fillRect(110, 26 + r * 28 + 10, 60 + ((r * 29) % 70), 7);

    }

    const tex = new CanvasTexture(c);

    tex.colorSpace = SRGBColorSpace;

    tex.anisotropy = 4;

    return tex;

  }, []);



  useEffect(() => () => texture.dispose(), [texture]);



  useLayoutEffect(() => {

    const m = mesh.current;

    if (!m) return;

    for (let r = 0; r < ROWS; r++) {

      for (let c = 0; c < COLS; c++) {

        const i = r * COLS + c;

        dummy.position.set((c - 4) * 6.8, 3 + r * 3.9, WALL_Z);

        dummy.updateMatrix();

        m.setMatrixAt(i, dummy.matrix);

        m.setColorAt(i, colors.c.set("#ffffff"));

      }

    }

    m.instanceMatrix.needsUpdate = true;

    if (m.instanceColor) m.instanceColor.needsUpdate = true;

  }, [dummy, colors]);



  useFrame(({ clock }) => {

    const m = mesh.current;

    if (!m) return;

    const j = journey.current;

    const t = clock.elapsedTime;

    for (let r = 0; r < ROWS; r++) {

      for (let c = 0; c < COLS; c++) {

        const i = r * COLS + c;

        let b = 0.45 + 0.15 * Math.sin(t * 1.1 + i * 1.7);

        if (j.query > 0 && j.query < 1) {

          const front = j.query * (ROWS + 2) - 1; // sweeps top -> bottom

          b += Math.max(0, 1 - Math.abs(ROWS - 1 - r - front) * 0.5) * 1.4;

        }

        colors.c.copy(colors.cyan).multiplyScalar(b);

        if (i === TARGET_I) {

          const hot = j.query >= 1 ? 3 - j.fetch * 2.6 : j.query * 0.8;

          colors.c.copy(colors.cyan).lerp(colors.white, MathUtils.clamp(hot, 0, 1)).multiplyScalar(b + hot);

        }

        m.setColorAt(i, colors.c);

      }

    }

    if (m.instanceColor) m.instanceColor.needsUpdate = true;

  });



  return (

    <group>

      <mesh position={[0, 20, WALL_Z - 0.6]}>

        <planeGeometry args={[90, 64]} />

        <meshBasicMaterial color="#020a12" />

      </mesh>

      <instancedMesh ref={mesh} args={[undefined, undefined, ROWS * COLS]} frustumCulled={false}>

        <planeGeometry args={[6.2, 3.4]} />

        <meshBasicMaterial map={texture} toneMapped={false} />

      </instancedMesh>

      <mesh position={[0, 0.1, -96]} rotation={[-Math.PI / 2, 0, 0]}>

        <circleGeometry args={[4, 48]} />

        <meshBasicMaterial color={CYAN} transparent opacity={0.18} toneMapped={false} />

      </mesh>

      <pointLight position={[0, 10, -104]} color={CYAN} intensity={40} distance={45} />

    </group>

  );

}



/** The query beam from the packet to the target slab. */

function QueryBeam({ journey }: { journey: JourneyRef }) {

  const beam = useRef<Mesh>(null);

  const s = useMemo(

    () => ({ a: new Vector3(), b: new Vector3(), d: new Vector3(), up: new Vector3(0, 1, 0), q: new Quaternion() }),

    []

  );



  useFrame(() => {

    const m = beam.current;

    if (!m) return;

    const j = journey.current;

    const on = j.query > 0 && j.fetch < 0.15;

    m.visible = on;

    if (!on) return;

    packetPosition(j, s.a);

    s.b.lerpVectors(s.a, TARGET_POS, smooth(j.query));

    s.d.subVectors(s.b, s.a);

    const len = Math.max(s.d.length(), 0.001);

    m.position.copy(s.a).addScaledVector(s.d, 0.5);

    m.scale.set(1, len, 1);

    m.quaternion.setFromUnitVectors(s.up, s.d.normalize());

  });



  return (

    <mesh ref={beam} visible={false}>

      <cylinderGeometry args={[0.05, 0.05, 1, 8]} />

      <meshBasicMaterial

        color={WHITE}

        transparent

        opacity={0.85}

        blending={AdditiveBlending}

        depthWrite={false}

        toneMapped={false}

      />

    </mesh>

  );

}



/* ------------------------------------------------------------------ */

/* The protagonist: packet, trail, token and the fetched row            */

/* ------------------------------------------------------------------ */



const TRAIL = 36;



function Actors({ journey, reducedMotion }: Common) {

  const packet = useRef<Group>(null);

  const glow = useRef<Mesh>(null);

  const coreMat = useRef<MeshBasicMaterial>(null);

  const glowMat = useRef<MeshBasicMaterial>(null);

  const light = useRef<PointLight>(null);

  const trail = useRef<InstancedMesh>(null);

  const trailMat = useRef<MeshBasicMaterial>(null);

  const token = useRef<Group>(null);

  const row = useRef<Mesh>(null);



  const s = useMemo(

    () => ({

      pos: new Vector3(),

      col: new Color(),

      cyan: new Color(CYAN),

      red: new Color(RED),

      gold: new Color(AMBER),

      hist: Array.from({ length: TRAIL }, () => new Vector3()),

      acc: 0,

      o: new Object3D(),

    }),

    []

  );



  useFrame(({ clock }, delta) => {

    const j = journey.current;

    const dt = Math.min(delta, 0.05);

    const t = clock.elapsedTime;



    packetPosition(j, s.pos);

    if (!reducedMotion && j.go < 0.5 && j.p === 0) s.pos.y += Math.sin(t * 1.6) * 0.25;

    packet.current?.position.copy(s.pos);



    s.col.copy(s.cyan).lerp(s.red, j.rejected).lerp(s.gold, smooth(j.token) * 0.65);

    coreMat.current?.color.set(WHITE).lerp(s.col, 0.25);

    glowMat.current?.color.copy(s.col);

    glow.current?.scale.setScalar(1 + (reducedMotion ? 0 : Math.sin(t * 6) * 0.1) + j.rejected * 0.9);

    if (light.current) {

      light.current.color.copy(s.col);

      light.current.intensity = 55 + j.rejected * 90;

    }



    // Trail: a short history of packet positions

    const h = s.hist;

    if (h[0].distanceTo(s.pos) > 6) h.forEach((v) => v.copy(s.pos));

    s.acc += dt;

    if (s.acc > 0.022) {

      s.acc = 0;

      for (let i = TRAIL - 1; i > 0; i--) h[i].copy(h[i - 1]);

      h[0].copy(s.pos);

    }

    const tm = trail.current;

    if (tm) {

      for (let i = 0; i < TRAIL; i++) {

        const f = 1 - i / TRAIL;

        s.o.position.copy(h[i]);

        s.o.scale.setScalar(0.3 * f * f + 0.02);

        s.o.updateMatrix();

        tm.setMatrixAt(i, s.o.matrix);

      }

      tm.instanceMatrix.needsUpdate = true;

    }

    trailMat.current?.color.copy(s.col);



    // Token: waits at its station, flies to the packet, then orbits it

    const tk = token.current;

    if (tk) {

      if (j.token <= 0) {

        tk.position.copy(STATION);

        tk.position.y += reducedMotion ? 0 : Math.sin(t * 2) * 0.2;

      } else if (j.token < 1) {

        const e = smooth(j.token);

        tk.position.lerpVectors(STATION, s.pos, e);

        tk.position.y += Math.sin(e * Math.PI) * 2.2;

      } else {

        tk.position.set(s.pos.x + Math.cos(t * 3) * 0.95, s.pos.y + 0.35, s.pos.z + Math.sin(t * 3) * 0.95);

      }

      tk.rotation.y = t * 2;

      tk.rotation.x = t * 0.8;

    }



    // Fetched row: leaves the wall, then rides with the packet

    const rw = row.current;

    if (rw) {

      rw.visible = j.fetch > 0;

      if (j.fetch > 0) {

        if (j.fetch < 1) {

          const e = smooth(j.fetch);

          rw.position.lerpVectors(TARGET_POS, s.pos, e);

          rw.position.y += Math.sin(e * Math.PI) * 2.5;

        } else {

          rw.position.set(

            s.pos.x + Math.cos(t * 3 + Math.PI) * 0.95,

            s.pos.y - 0.3,

            s.pos.z + Math.sin(t * 3 + Math.PI) * 0.95

          );

        }

        rw.rotation.y = t * 2;

      }

    }

  });



  return (

    <>

      <group ref={packet}>

        <mesh>

          <sphereGeometry args={[0.28, 20, 20]} />

          <meshBasicMaterial ref={coreMat} color={WHITE} toneMapped={false} />

        </mesh>

        <mesh ref={glow}>

          <sphereGeometry args={[0.75, 20, 20]} />

          <meshBasicMaterial

            ref={glowMat}

            color={CYAN}

            transparent

            opacity={0.35}

            blending={AdditiveBlending}

            depthWrite={false}

            toneMapped={false}

          />

        </mesh>

        <pointLight ref={light} color={CYAN} intensity={55} distance={26} />

      </group>



      <instancedMesh ref={trail} args={[undefined, undefined, TRAIL]} frustumCulled={false}>

        <sphereGeometry args={[1, 8, 8]} />

        <meshBasicMaterial

          ref={trailMat}

          color={CYAN}

          transparent

          opacity={0.55}

          blending={AdditiveBlending}

          depthWrite={false}

          toneMapped={false}

        />

      </instancedMesh>



      <group ref={token}>

        <mesh>

          <octahedronGeometry args={[0.42, 0]} />

          <meshBasicMaterial color={AMBER} toneMapped={false} />

        </mesh>

        <pointLight color={AMBER} intensity={14} distance={9} />

      </group>



      <mesh ref={row} visible={false}>

        <boxGeometry args={[0.8, 0.45, 0.45]} />

        <meshBasicMaterial color={WHITE} toneMapped={false} />

      </mesh>

    </>

  );

}



/* ------------------------------------------------------------------ */

/* Camera on rails                                                     */

/* ------------------------------------------------------------------ */



function RailCamera({ journey, active, reducedMotion }: Common & { active: boolean }) {

  const camera = useThree((st) => st.camera) as PerspectiveCamera;

  const s = useMemo(

    () => ({

      P: new Vector3(),

      base: new Vector3(),

      ahead: new Vector3(),

      idlePos: new Vector3(),

      idleLook: new Vector3(),

      pos: new Vector3(),

      look: new Vector3(),

      tmpA: new Vector3(),

      tmpB: new Vector3(),

      smPos: new Vector3(),

      smLook: new Vector3(),

      ready: false,

      prevP: 0,

      speed: 0,

    }),

    []

  );



  useFrame(({ clock }, delta) => {

    if (!active) {

      s.ready = false;

      return;

    }

    const j = journey.current;

    const dt = Math.min(delta, 0.05);

    const t = clock.elapsedTime;



    packetPosition(j, s.P);



    // Idle: slow orbit high above the glass, looking down at the city

    const orbit = reducedMotion ? 0 : t * 0.18;

    s.idlePos.set(s.P.x + Math.sin(orbit) * 11, s.P.y + 7, s.P.z + 15 + Math.cos(orbit) * 3);

    s.idleLook.set(s.P.x, s.P.y - 9, s.P.z - 4);



    // Rail: behind and above the packet, looking slightly ahead of it

    PATH.getPoint(Math.max(j.p - 0.055, 0), s.base);

    const sway = reducedMotion ? 0 : Math.sin(t * 0.35) * 1.4 * (1 - j.zoom * 0.5);

    s.pos.set(s.base.x + sway, s.base.y + 2.2 + j.zoom * 6, s.base.z + 5.5 + j.zoom * 13);

    PATH.getPoint(Math.min(j.p + 0.035, 1), s.ahead);

    s.look.copy(s.ahead).lerp(s.P, 0.35).lerp(WALL_CENTER, j.zoom * 0.55);



    // Idle -> rail

    const g = smooth(j.go);

    s.tmpA.copy(s.pos);

    s.pos.copy(s.idlePos).lerp(s.tmpA, g);

    s.tmpA.copy(s.look);

    s.look.copy(s.idleLook).lerp(s.tmpA, g);



    // Ascent: camera drops below the packet and looks up

    if (j.rise > 0) {

      const b = smooth(j.rise * 5);

      s.tmpA.set(s.P.x, s.P.y - 6, s.P.z + 11);

      s.tmpB.set(s.P.x, s.P.y + 7, s.P.z);

      s.pos.lerp(s.tmpA, b);

      s.look.lerp(s.tmpB, b);

    }



    if (!s.ready) {

      s.smPos.copy(s.pos);

      s.smLook.copy(s.look);

      s.prevP = j.p;

      camera.fov = 56;

      s.ready = true;

    } else {

      s.smPos.lerp(s.pos, 1 - Math.exp(-6 * dt));

      s.smLook.lerp(s.look, 1 - Math.exp(-7 * dt));

    }



    s.speed = MathUtils.damp(s.speed, Math.abs(j.p - s.prevP) / Math.max(dt, 0.001), 4, dt);

    s.prevP = j.p;



    // Shake is added after smoothing so it never accumulates

    const shake = reducedMotion ? 0 : j.rejected * 0.3 + j.rise * 0.1;

    camera.position.copy(s.smPos);

    if (shake > 0) {

      camera.position.x += (Math.sin(t * 43) + Math.sin(t * 27)) * 0.5 * shake;

      camera.position.y += (Math.sin(t * 39) + Math.sin(t * 21)) * 0.5 * shake;

    }

    camera.lookAt(s.smLook);



    const targetFov = 54 + j.zoom * 9 + MathUtils.clamp(s.speed * 110, 0, 12) + j.rise * 14;

    camera.fov = MathUtils.damp(camera.fov, targetFov, 3, dt);

    camera.updateProjectionMatrix();

  });



  return null;

}



/* ------------------------------------------------------------------ */

/* World                                                               */

/* ------------------------------------------------------------------ */



type Props = {

  journey: JourneyRef;

  /** true only while stage === "backend". The RailCamera is off otherwise. */

  active?: boolean;

  reducedMotion?: boolean;

};



export default function BackendWorld({ journey, active = true, reducedMotion }: Props) {

  return (

    <group>

      {/* Ground */}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, -40]}>

        <planeGeometry args={[420, 420]} />

        <meshBasicMaterial color="#02060c" />

      </mesh>

      <gridHelper args={[320, 128, "#0e5f80", "#07263a"]} position={[0, 0.01, -40]} />



      <City />

      <Traffic journey={journey} reducedMotion={reducedMotion} />

      <GlassFloor journey={journey} />



      <Gate journey={journey} reducedMotion={reducedMotion} />

      <Rails journey={journey} />

      <Switch journey={journey} />

      <MiddlewareRings journey={journey} />

      <Archive journey={journey} />

      <QueryBeam journey={journey} />



      <Actors journey={journey} reducedMotion={reducedMotion} />

      <RailCamera journey={journey} active={active} reducedMotion={reducedMotion} />



      <Sparkles

        count={220}

        scale={[60, 30, 150]}

        position={[0, 12, -45]}

        size={3}

        speed={reducedMotion ? 0 : 0.25}

        color="#7fe9ff"

      />

    </group>

  );

}