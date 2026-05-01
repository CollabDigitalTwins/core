export function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.async = false; s.onload = () => resolve(); s.onerror = reject;
    document.head.appendChild(s);
  });
}

export function loadCss(href: string) {
  const l = document.createElement('link');
  l.rel = 'stylesheet'; l.href = href;
  document.head.appendChild(l);
}


export async function loadAllAssets() {
    const LIB_PATH = "/vendors/potree"

    //load CSS in parralel
    loadCss(`${LIB_PATH}/jquery-ui/jquery-ui.min.css`);
    loadCss(`${LIB_PATH}/openlayers3/ol.css`);
    loadCss(`${LIB_PATH}/spectrum/spectrum.css`);
    loadCss(`${LIB_PATH}/jstree/themes/mixed/style.css`);

    //load scripts in order to avoid error
    await loadScript(`${LIB_PATH}/jquery/jquery-3.1.1.min.js`);
    await loadScript(`${LIB_PATH}/spectrum/spectrum.js`);
    await loadScript(`${LIB_PATH}/jquery-ui/jquery-ui.min.js`);
    await loadScript(`${LIB_PATH}/other/BinaryHeap.js`);
    await loadScript(`${LIB_PATH}/tween/tween.min.js`);
    await loadScript(`${LIB_PATH}/d3/d3.js`);
    await loadScript(`${LIB_PATH}/proj4/proj4.js`);
    await loadScript(`${LIB_PATH}/openlayers3/ol.js`);
    await loadScript(`${LIB_PATH}/i18next/i18next.js`);
    await loadScript(`${LIB_PATH}/jstree/jstree.js`);
    await loadScript(`${LIB_PATH}/potree/potree.js`);
    await loadScript(`${LIB_PATH}/plasio/js/laslaz.js`);

    const Potree = (window as any).Potree;
    if (!Potree) throw new Error('Potree failed to initialize');
}