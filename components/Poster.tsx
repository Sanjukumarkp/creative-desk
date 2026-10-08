/** Fills a .media box with the thumbnail, or the video's own first frame when no thumbnail was made. */
export default function Poster({ kind, url, thumb }: { kind: string; url: string; thumb: string | null }) {
  if (thumb || kind === 'image') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="fill" src={thumb ?? url} alt="" loading="lazy" />
  }
  return <video className="fill" src={`${url}#t=0.5`} preload="metadata" muted playsInline aria-hidden />
}
