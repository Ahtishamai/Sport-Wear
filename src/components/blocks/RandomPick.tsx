import { Children, type CSSProperties, type ReactNode } from 'react';

/**
 * Shows `count` of its children, a different random selection on every visit.
 *
 * The pages around this are cached for five minutes, so choosing on the server
 * alone would show the same set to everyone until the cache expired — and a
 * visitor pressing refresh would reasonably conclude it is not random at all.
 * Rendering the page fresh on every request would fix that, at the price of a
 * database round trip per visit on a host that caps connections per hour.
 *
 * So the server sends the whole pool, already shuffled, and a few lines of
 * inline script choose which cards to show. The script sits *before* the grid
 * in the HTML: by the time the browser reaches the cards the choice is already
 * made and applied, so nothing is drawn and then swapped. It writes one rule
 * into <head> rather than touching the cards, so React's hydration of the grid
 * never sees a difference from what the server sent.
 *
 * Without JavaScript the first `count` cards of the server's shuffle show,
 * which is still a random selection — just one that changes every five
 * minutes rather than on every visit.
 */
export function RandomPick({
  id,
  count,
  className,
  style,
  children,
}: {
  /** Unique on the page. Used as a CSS selector, so it is cleaned here. */
  id: string;
  count: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const items = Children.toArray(children);
  const pool = items.length;
  const show = Math.max(1, Math.min(count, pool));
  const safe = 'rp-' + String(id).replace(/[^A-Za-z0-9_-]/g, '');

  // `display: contents` makes each wrapper vanish from layout, so the card
  // inside is still the grid item and rows keep their equal heights. The
  // fallback then hides all but the first `show` of the server's shuffle.
  const fallback =
    `#${safe}>.rp-item{display:contents}` +
    `#${safe}>.rp-item:nth-child(n+${show + 1}){display:none}`;

  // Fisher–Yates over 1..pool, then one rule that hides every card and shows
  // the chosen ones. `!important` because it has to beat the fallback above.
  const pick =
    `(function(){try{` +
    `var n=${pool},k=${show},a=[],i,j,t;` +
    `for(i=1;i<=n;i++)a.push(i);` +
    `for(i=n-1;i>0;i--){j=Math.floor(Math.random()*(i+1));t=a[i];a[i]=a[j];a[j]=t}` +
    `var s='#${safe}>.rp-item{display:none!important}';` +
    `for(i=0;i<k;i++)s+='#${safe}>.rp-item:nth-child('+a[i]+'){display:contents!important}';` +
    `var e=document.getElementById('${safe}-pick');` +
    `if(!e){e=document.createElement('style');e.id='${safe}-pick';document.head.appendChild(e)}` +
    `e.textContent=s` +
    `}catch(x){}})();`;

  return (
    <>
      {pool > show && <script dangerouslySetInnerHTML={{ __html: pick }} />}
      <style dangerouslySetInnerHTML={{ __html: fallback }} />
      <div id={safe} className={className} style={style}>
        {items.map((child, i) => (
          // A plain wrapper so hiding and showing never has to know whether
          // the card inside is laid out as a block or a flex column.
          <div key={i} className="rp-item">
            {child}
          </div>
        ))}
      </div>
    </>
  );
}
