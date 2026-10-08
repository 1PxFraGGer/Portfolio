"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdditiveBlending, CatmullRomCurve3, Color, DoubleSide, Group, MathUtils, Mesh, Vector3 } from "three";
import type { ArtifactKey } from "./PortalCanvas";

type Direction = "enter" | "return";
type Flight = { skill: ArtifactKey; direction: Direction; id: number; reduced: boolean };
type TravelContextType = { travel: (skill: ArtifactKey, direction?: Direction) => void; busy: boolean };
const TravelContext = createContext<TravelContextType | null>(null);
export function useDimensionTravel() {
  const context = useContext(TravelContext);
  if (!context) throw new Error("DimensionTravelProvider is missing from app/layout.tsx");
  return context;
}
const THEMES: Record<ArtifactKey, { color: string; label: string; second: string }> = {
  frontend: { color: "#00c8ff", label: "CONSTRUCTING THE INTERFACE", second: "#7edfff" },
  backend: { color: "#ffad47", label: "DESCENDING INTO THE ENGINE", second: "#fa5e2b" },
  seo: { color: "#34d399", label: "TRACING THE DISCOVERY NETWORK", second: "#8cfacc" },
  content: { color: "#ac84ff", label: "ENTERING THE STORY ARCHIVE", second: "#f4b6ff" },
};
const CLAMP = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (p: number) => p * p * (3 - 2 * p);

function CameraRail({ flight, progression }: { flight: Flight; progression: React.MutableRefObject<number> }) {
  const { camera } = useThree();
  const curve = useMemo(() => {
    const points: Record<ArtifactKey, Vector3[]> = {
      frontend: [[-8,5,16],[-4,3,6],[-2,2,-5],[1,3,-18],[0,2,-32]].map(p=>new Vector3(p[0],p[1],p[2])),
      backend: [[0,12,17],[1,8,5],[-1,3,-7],[1,-2,-20],[0,-7,-36]].map(p=>new Vector3(p[0],p[1],p[2])),
      seo: [[-12,3,16],[-8,3,3],[-2,2,-9],[6,3,-22],[0,2,-37]].map(p=>new Vector3(p[0],p[1],p[2])),
      content: [[8,4,16],[4,4,4],[0,3,-9],[-4,4,-23],[0,3,-38]].map(p=>new Vector3(p[0],p[1],p[2])),
    };
    return new CatmullRomCurve3(points[flight.skill], false, "catmullrom", 0.45);
  }, [flight.skill]);
  const ahead = useMemo(() => new Vector3(), []);
  const location = useMemo(() => new Vector3(), []);
  useFrame(({clock}) => {
    const direction = flight.direction === "enter";
    const p = smooth(CLAMP(progression.current));
    const travelT = direction ? p : 1 - p;
    curve.getPointAt(MathUtils.clamp(travelT, 0.001, 0.999), location);
    curve.getPointAt(MathUtils.clamp(travelT + (direction ? 0.02 : -0.02), 0.001, 0.999), ahead);
    camera.position.copy(location);
    camera.lookAt(ahead);
    camera.rotateZ(flight.skill === "content" ? Math.sin(p * Math.PI * 5) * 0.1 : flight.skill === "seo" ? (direction ? 1 : -1) * Math.sin(p * Math.PI) * 0.15 : flight.skill === "backend" ? Math.sin(p * Math.PI * 3) * 0.055 : Math.sin(p * Math.PI * 2) * 0.04);
    if ("fov" in camera) {
      const perspective = camera as import("three").PerspectiveCamera;
      perspective.fov = 55 + (flight.skill === "backend" ? 24 : 15) * Math.sin(p * Math.PI);
      perspective.updateProjectionMatrix();
    }
  });
  return null;
}

function Passage({ flight, progression }: { flight: Flight; progression: React.MutableRefObject<number> }) {
  const theme = THEMES[flight.skill];
  const root = useRef<Group>(null);
  const pieces = useRef<Group>(null);
  useFrame(({ clock }, delta) => {
    const p = progression.current;
    if (root.current) root.current.rotation.z = flight.skill === "content" ? Math.sin(clock.elapsedTime * 0.5) * 0.15 : 0;
    if (pieces.current) pieces.current.children.forEach((c, i) => {
      const phase = clock.elapsedTime * (flight.direction === "return" ? -1 : 1);
      if (flight.skill === "frontend") {
        c.rotation.y = Math.sin(phase * 1.3 + i) * 0.22;
        c.position.x = Math.sin(i * 2.4 + phase * 0.4) * (3.6 + p * 0.8);
      } else if (flight.skill === "backend") {
        c.position.y = MathUtils.damp(c.position.y, (i % 2 ? 1 : -1) * (3.8 + Math.sin(phase + i) * 0.45), 4, delta);
      } else if (flight.skill === "seo") {
        c.rotation.y += (flight.direction === "return" ? -1 : 1) * delta * 0.17;
        c.scale.setScalar(0.8 + 0.22 * Math.sin(phase * 2 + i));
      } else {
        c.rotation.z = Math.sin(phase + i * 0.7) * 0.55;
        c.rotation.y = Math.sin(phase * 0.8 + i) * 0.6;
      }
    });
  });
  return <group ref={root}>
    <ambientLight intensity={1.2}/>
    <fog attach="fog" args={["#02050c", 4, 70]}/>
    <pointLight position={[0,3,2]} color={theme.color} intensity={75} distance={35}/>
    <pointLight position={[0,-2,-25]} color={theme.second} intensity={90} distance={35}/>
    <group ref={pieces}>
      {Array.from({length: flight.skill === "content" ? 75 : 58}, (_,i) => {
        const z = 14 - i * 0.88;
        const angle = i * 2.39996;
        const x = Math.sin(angle) * 5.4;
        const y = Math.cos(angle) * 3.75;
        return <group key={i} position={[x,y,z]} rotation={[0,0,angle]}>
          {flight.skill === "frontend" ? <>
            <mesh><boxGeometry args={[2.0,1.25,0.12]}/><meshBasicMaterial color={theme.color} wireframe transparent opacity={0.65} side={DoubleSide}/></mesh>
            <mesh position={[0,0,0.07]}><planeGeometry args={[1.35,0.06]}/><meshBasicMaterial color={theme.second} toneMapped={false}/></mesh>
          </> : flight.skill === "backend" ? <>
            <mesh><boxGeometry args={[5.5,0.8,0.7]}/><meshStandardMaterial color="#29292c" metalness={0.8} roughness={0.35}/></mesh>
            <mesh position={[0,0,0.37]}><boxGeometry args={[5,0.055,0.02]}/><meshBasicMaterial color={theme.color} toneMapped={false}/></mesh>
          </> : flight.skill === "seo" ? <>
            <mesh><icosahedronGeometry args={[0.3,1]}/><meshBasicMaterial color={theme.color} wireframe toneMapped={false}/></mesh>
            <mesh rotation={[0,0,angle]}><torusGeometry args={[0.78,0.025,6,36]}/><meshBasicMaterial color={theme.second} toneMapped={false} transparent opacity={0.7}/></mesh>
          </> : <>
            <mesh><planeGeometry args={[1.65,2.2]}/><meshBasicMaterial color={theme.color} transparent opacity={0.23} side={DoubleSide} depthWrite={false}/></mesh>
            {Array.from({length:4},(_,j)=><mesh key={j} position={[0,0.55-j*0.35,0.03]}><planeGeometry args={[1.15-j*0.12,0.055]}/><meshBasicMaterial color={theme.second} transparent opacity={0.85} side={DoubleSide}/></mesh>)}
          </>}
        </group>;
      })}
    </group>
    {Array.from({length: flight.skill === "backend" ? 16 : 26},(_,i)=><mesh key={`ring${i}`} position={[0,0,9-i*2.25]} rotation={[0,0,i*0.25]}>
      {flight.skill === "backend" ? <boxGeometry args={[13,9,0.13]}/> : <torusGeometry args={[flight.skill === "content" ? 6 : 5.8,0.045,8,64]}/>}
      <meshBasicMaterial color={theme.color} wireframe={flight.skill === "backend"} toneMapped={false} transparent opacity={0.2 + (i%4===0?0.3:0)}/>
    </mesh>)}
  </group>;
}

function FlightScene({ flight, onFinished, onNavigate }: { flight: Flight; onFinished: () => void; onNavigate: () => void }) {
  const progression = useRef(0);
  const navigated = useRef(false);
  const finished = useRef(false);
  const start = useRef<number | null>(null);
  const duration = flight.reduced ? 0.12 : flight.direction === "return" ? 2.7 : 3.15;
  useEffect(() => { start.current = null; navigated.current = false; finished.current = false; progression.current = 0; }, [flight.id]);
  useFrame(({clock}) => {
    if (start.current === null) start.current = clock.elapsedTime;
    const p = CLAMP((clock.elapsedTime - start.current) / duration);
    progression.current = p;
    if (p >= (flight.direction === "enter" ? 0.62 : 0.58) && !navigated.current) { navigated.current = true; window.setTimeout(onNavigate,0); }
    if (p >= 1 && !finished.current) { finished.current = true; window.setTimeout(onFinished,0); }
  });
  return <><CameraRail flight={flight} progression={progression}/><Passage flight={flight} progression={progression}/></>;
}

export default function DimensionTravelProvider({children}: {children: React.ReactNode}) {
  const router = useRouter();
  const [flight,setFlight] = useState<Flight | null>(null);
  const busyRef=useRef(false);
  const sequence=useRef(0);
  const travel = useCallback((skill: ArtifactKey,direction: Direction="enter")=>{
    if(busyRef.current) return;
    busyRef.current=true;
    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if(direction === "return") {
      sessionStorage.setItem("multiverse:return-to-hub", "1");
      sessionStorage.setItem("multiverse:return-skill", skill);
    }
    setFlight({skill,direction,id:++sequence.current,reduced});
  },[]);
  const navigate = useCallback(()=>{
    if(!flight) return;
    router.push(flight.direction === "return" ? "/" : `/skills/${flight.skill}`);
  },[flight,router]);
  const finish = useCallback(()=>{setFlight(null); busyRef.current=false;},[]);
  const ctx = useMemo(()=>({travel,busy:!!flight}),[travel,flight]);
  return <TravelContext.Provider value={ctx}>
    {children}
    {flight && <div className={`dimension-flight dimension-flight--${flight.skill} dimension-flight--${flight.direction}`} role="status" aria-label={flight.direction === "return" ? "Returning to the multiverse" : `Travelling to ${flight.skill}`}>
      <Canvas gl={{antialias:true,alpha:false}} camera={{position:[0,3,14],fov:62,near:0.05,far:135}} dpr={[1,1.5]}>
        <color attach="background" args={["#02050c"]}/>
        <FlightScene key={flight.id} flight={flight} onNavigate={navigate} onFinished={finish}/>
      </Canvas>
      <div className="dimension-flight__hud"><span>BEYOND THE CODE // {flight.direction === "enter" ? "DIMENSION TRANSFER" : "RETURN VECTOR"}</span><strong>{flight.direction === "enter" ? THEMES[flight.skill].label : `REASSEMBLING ${flight.skill.toUpperCase()} PORTAL`}</strong></div>
    </div>}
  </TravelContext.Provider>;
}
