import { useId } from 'react';
import type { Appearance, ArtworkPreset } from './appearance';

export function PresetArtwork({ preset }: { preset: ArtworkPreset }) {
  const id = useId();
  return <svg className="preset-artwork" viewBox="0 0 520 560" fill="none" aria-hidden="true" focusable="false">
    <defs><radialGradient id={id}><stop stopColor="var(--art-disc)" stopOpacity=".55" /><stop offset="1" stopColor="var(--art-disc)" stopOpacity=".24" /></radialGradient></defs>
    {preset === 'balance' && <>
      <circle cx="310" cy="290" r="122" fill={`url(#${id})`} stroke="var(--art-disc)" strokeOpacity=".25" strokeWidth=".7" />
      <path d="M258 16v257m0 16v222" stroke="var(--art-line)" strokeOpacity=".55" strokeWidth=".85" />
      <g stroke="var(--art-line)" strokeWidth="1.25">
        <path d="M98 256Q260 264 447 355M98 256v78M447 355v89" />
        <circle cx="98" cy="414" r="80" /><circle cx="447" cy="481" r="37" />
        <circle cx="258" cy="282" r="8.5" />
      </g>
      <g fill="var(--art-line)"><circle cx="98" cy="256" r="4" /><circle cx="447" cy="355" r="4" /></g>
      <circle cx="258" cy="518" r="8" fill="var(--vermilion)" />
    </>}
    {preset === 'mountains' && <>
      <circle cx="330" cy="194" r="106" fill={`url(#${id})`} />
      <g stroke="var(--art-line)" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        <path d="m34 382 133-157 138 157M188 382l140-211 157 211M74 421h373" />
        <path d="m132 267 35-42 35 40-25-10-13 13-15-17M298 217l30-46 40 54-29-16-15 13-14-15" />
        <path d="M260 421v54" strokeOpacity=".45" />
      </g>
      <circle cx="260" cy="482" r="7" fill="var(--vermilion)" />
    </>}
    {preset === 'orbit' && <>
      <circle cx="268" cy="280" r="122" fill={`url(#${id})`} />
      <g stroke="var(--art-line)" strokeWidth="1.2">
        <ellipse cx="260" cy="280" rx="217" ry="83" transform="rotate(-32 260 280)" />
        <ellipse cx="260" cy="280" rx="186" ry="83" transform="rotate(40 260 280)" strokeOpacity=".55" />
        <circle cx="260" cy="280" r="12" /><path d="M260 68v79m0 266v79" strokeOpacity=".4" />
      </g>
      <circle cx="432" cy="170" r="8" fill="var(--vermilion)" /><circle cx="155" cy="165" r="4" fill="var(--art-line)" />
    </>}
  </svg>;
}

export function Artwork({ value, customUrl }: { value: Appearance; customUrl: string }) {
  return value.selected === 'custom' && customUrl
    ? <img className="custom-artwork" src={customUrl} alt="" />
    : <PresetArtwork preset={value.selected === 'custom' ? 'balance' : value.selected} />;
}
