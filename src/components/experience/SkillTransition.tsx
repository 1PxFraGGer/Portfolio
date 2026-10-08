"use client";
import { useDimensionTravel } from "./DimensionTravelProvider";
import type { ArtifactKey } from "./PortalCanvas";
export default function SkillPageMotion({ skill }: { skill: ArtifactKey }) {
  const {travel,busy}=useDimensionTravel();
  return <button type="button" className="skill-return-action" disabled={busy} onClick={()=>travel(skill,"return")}>← RETURN TO MULTIVERSE</button>;
}
