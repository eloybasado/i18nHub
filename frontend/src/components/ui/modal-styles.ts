export const MODAL_OVERLAY_CLASS =
  'fixed inset-0 z-50 bg-zinc-950/70 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0';

export const MODAL_CONTENT_CLASS =
  'fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-white p-5 shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95';

export const MODAL_HEADER_CLASS = 'flex flex-col gap-2 text-left';

export const MODAL_FOOTER_CLASS = 'mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end';
