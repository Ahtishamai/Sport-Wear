'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MediaPicker } from '@/components/admin/MediaPicker';
import { Icon } from './Icon';

type Pending = Map<string, unknown>;

/**
 * Live front-end editing.
 *
 * Every editable element on the site carries `data-edit="block:<id>:<path>"` or
 * `data-edit="setting:<key>"`. Switching this on makes text elements
 * contenteditable and puts a "replace" affordance over images; Save posts the
 * collected changes to /api/admin/inline, which resolves each target back to
 * the page, collection or settings record that owns it.
 */
export function InlineEditor({ onExit }: { onExit: () => void }) {
  const router = useRouter();
  const pending = useRef<Pending>(new Map());
  const originals = useRef(new Map<string, string>());
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [picker, setPicker] = useState<{ target: string; el: HTMLElement } | null>(null);
  const [hint, setHint] = useState(true);

  const bump = () => setCount(pending.current.size);

  // ---------------------------------------------------------------- setup
  useEffect(() => {
    document.body.dataset.inlineEditing = 'true';

    const textEls = Array.from(
      document.querySelectorAll<HTMLElement>('[data-edit][data-edit-kind="text"]')
    );
    const imageEls = Array.from(
      document.querySelectorAll<HTMLElement>('[data-edit][data-edit-kind="image"]')
    );

    for (const el of textEls) {
      const target = el.dataset.edit;
      if (!target) continue;
      originals.current.set(target, el.innerText);
      el.contentEditable = 'plaintext-only';
      // Safari and Firefox ignore plaintext-only; fall back to true.
      if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
      el.spellcheck = true;
      el.dataset.inlineEditable = 'true';
    }

    // Some editable images sit behind scrims and copy — the hero and the CTA
    // band both do — so a click can never reach them. Every image therefore gets
    // a floating control that nothing in the page can cover.
    const overlays: { el: HTMLElement; btn: HTMLButtonElement }[] = [];
    for (const el of imageEls) {
      el.dataset.inlineEditable = 'image';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('data-inline-ui', '');
      btn.className = 'ds-replace';
      btn.textContent = 'Replace image';
      btn.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const target = el.dataset.edit;
        if (target) setPicker({ target, el });
      });
      document.body.appendChild(btn);
      overlays.push({ el, btn });
    }

    const placeOverlays = () => {
      for (const { el, btn } of overlays) {
        const r = el.getBoundingClientRect();
        const onScreen = r.bottom > 48 && r.top < window.innerHeight - 8 && r.width > 40;
        if (!onScreen) {
          btn.style.display = 'none';
          continue;
        }
        btn.style.display = 'block';

        // Sit inside the top-right of the slot. Small slots — a logo, a
        // thumbnail — are narrower than the control itself, so it tucks
        // underneath them instead of covering the artwork.
        const w = btn.offsetWidth;
        let left = w > r.width - 12 ? r.left : r.right - w - 10;
        left = Math.max(8, Math.min(left, window.innerWidth - w - 8));

        let top = r.height < 72 ? r.bottom + 6 : r.top + 10;
        top = Math.max(8, Math.min(top, window.innerHeight - 48));

        btn.style.top = `${top}px`;
        btn.style.left = `${left}px`;
      }
    };

    const onInput = (e: Event) => {
      const el = (e.target as HTMLElement)?.closest?.<HTMLElement>('[data-inline-editable="true"]');
      if (!el) return;
      const target = el.dataset.edit;
      if (!target) return;
      const value = el.innerText.replace(/ /g, ' ');
      if (value === originals.current.get(target)) pending.current.delete(target);
      else pending.current.set(target, value);
      bump();
    };

    // Keep links and buttons inert while editing so a click never navigates.
    const onClick = (e: MouseEvent) => {
      const node = e.target as HTMLElement;

      // The media dialog renders inside this component, so its own buttons must
      // stay live — without this the close, upload and pick actions are all inert.
      if (node.closest?.('[data-inline-ui], [role="dialog"]')) return;

      // A photo tile puts its caption inside the image container, so clicking
      // the caption used to open the picker instead of placing a caret. Text
      // always wins; the Replace control is the only way to swap an image.
      if (node.closest?.('[data-inline-editable="true"]')) {
        e.preventDefault(); // a wrapping link must not navigate
        return;
      }

      if (node.closest?.('a, button')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Enter should not inject block elements into a heading.
    const onKeyDown = (e: KeyboardEvent) => {
      const el = (e.target as HTMLElement)?.closest?.<HTMLElement>('[data-inline-editable="true"]');
      if (!el) return;
      if (e.key === 'Enter' && !e.shiftKey && el.dataset.editMultiline !== 'true') {
        e.preventDefault();
        el.blur();
      }
    };

    // Strip formatting from pasted content.
    const onPaste = (e: ClipboardEvent) => {
      const el = (e.target as HTMLElement)?.closest?.<HTMLElement>('[data-inline-editable="true"]');
      if (!el) return;
      e.preventDefault();
      const text = e.clipboardData?.getData('text/plain') ?? '';
      document.execCommand('insertText', false, text);
    };

    document.addEventListener('input', onInput, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('paste', onPaste, true);

    let raf: number | null = null;
    const reposition = () => {
      if (raf === null) {
        raf = requestAnimationFrame(() => {
          raf = null;
          placeOverlays();
        });
      }
    };
    window.addEventListener('scroll', reposition, { passive: true });
    window.addEventListener('resize', reposition, { passive: true });
    placeOverlays();
    // images and fonts settle a beat after mount
    const settle = setTimeout(placeOverlays, 700);

    const t = setTimeout(() => setHint(false), 5000);

    return () => {
      document.removeEventListener('input', onInput, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('paste', onPaste, true);
      window.removeEventListener('scroll', reposition);
      window.removeEventListener('resize', reposition);
      if (raf !== null) cancelAnimationFrame(raf);
      clearTimeout(settle);
      clearTimeout(t);
      overlays.forEach(({ btn }) => btn.remove());
      delete document.body.dataset.inlineEditing;
      for (const el of textEls) {
        el.removeAttribute('contenteditable');
        delete el.dataset.inlineEditable;
      }
      for (const el of imageEls) delete el.dataset.inlineEditable;
    };
  }, []);

  // ---------------------------------------------------------------- warn on leave
  useEffect(() => {
    if (!count) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [count]);

  // ---------------------------------------------------------------- actions
  const applyImage = useCallback((url: string) => {
    if (!picker) return;
    pending.current.set(picker.target, url);
    const img = picker.el.querySelector('img');
    if (img) {
      img.removeAttribute('srcset');
      img.src = url;
    } else {
      picker.el.style.backgroundImage = `url(${url})`;
      picker.el.style.backgroundSize = 'cover';
    }
    bump();
    setPicker(null);
  }, [picker]);

  async function save() {
    if (!count || busy) return;
    setBusy(true);
    setError('');
    try {
      const changes = Array.from(pending.current.entries()).map(([target, value]) => ({
        target,
        value,
      }));
      const res = await fetch('/api/admin/inline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Save failed');

      pending.current.clear();
      setCount(0);
      onExit();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  function discard() {
    if (count && !window.confirm(`Discard ${count} unsaved change${count === 1 ? '' : 's'}?`)) {
      return;
    }
    pending.current.clear();
    setCount(0);
    onExit();
    router.refresh();
  }

  return (
    <>
      <style>{`
        [data-inline-editable="true"] {
          outline: 1px dashed rgba(255,209,0,.85);
          outline-offset: 3px;
          cursor: text;
          transition: outline-color .15s, background-color .15s;
          min-width: 1ch;
          min-height: 1em;
        }
        [data-inline-editable="true"]:hover { outline-color: #101114; background: rgba(255,209,0,.10); }
        [data-inline-editable="true"]:focus {
          outline: 2px solid #101114; outline-offset: 3px;
          background: rgba(255,209,0,.16);
        }
        [data-inline-editable="image"] { cursor: pointer; outline: 2px dashed rgba(255,209,0,.85); outline-offset: -2px; }
        [data-inline-editable="image"]:hover { outline-color: #101114; }
        .ds-replace {
          position: fixed; z-index: 180; display: none;
          background: #FFD100; color: #101114; border: 1px solid #101114;
          font: 700 11px/1 Poppins, system-ui, sans-serif;
          letter-spacing: .1em; text-transform: uppercase;
          padding: 9px 13px; border-radius: 2px; cursor: pointer;
          box-shadow: 0 4px 16px rgba(16,17,20,.4);
        }
        .ds-replace:hover { background: #fff; }
        .ds-replace:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
        body[data-inline-editing] { padding-bottom: 84px; }
      `}</style>

      {picker && (
        <div data-inline-ui>
          <MediaPicker
            open
            folder="content"
            onClose={() => setPicker(null)}
            onPick={(m) => applyImage(m.url)}
          />
        </div>
      )}

      <div
        data-inline-ui
        className="fixed inset-x-0 bottom-0 z-[190] border-t border-white/15 bg-ink text-white print:hidden"
      >
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-3 px-5 py-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-ink">
            <Icon name="pencil" size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold">
              Editing this page
              {count > 0 && (
                <span className="ml-2 rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-ink">
                  {count} change{count === 1 ? '' : 's'}
                </span>
              )}
            </div>
            <div className="text-[12px] text-white/55">
              {error ? (
                <span className="text-[#FF8A8F]">{error}</span>
              ) : hint ? (
                'Click any highlighted text to type over it. Use Replace image to swap a photo.'
              ) : (
                'Outlined text is editable. Images have a Replace control.'
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={discard}
            className="rounded-[2px] border border-white/25 px-3.5 py-2 text-[12px] font-semibold transition-colors hover:border-white"
          >
            {count ? 'Discard' : 'Done'}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!count || busy}
            className="rounded-[2px] border border-brand bg-brand px-4 py-2 text-[12px] font-bold uppercase tracking-[.08em] text-ink transition-opacity disabled:opacity-40"
          >
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </>
  );
}
