'use client';

/* The settlement viewport. Slice 1 placeholder: the real canvas world arrives in Slice 2. */
export function CivWorldPane({ visible }: { visible: boolean }) {
  return (
    <div className="cw-root" data-visible={visible ? '1' : '0'}>
      <div className="cw-placeholder">
        <h2>Settlement</h2>
        <p>The living world is being built. Merging stays one tab away and keeps your craft while you look around.</p>
      </div>
    </div>
  );
}
