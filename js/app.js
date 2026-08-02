import { init } from './init.js';
import { bindStaticHandlers } from './bindings.js';

bindStaticHandlers();
init().catch(error => {
  console.error('App initialization failed', error);
  document.body.insertAdjacentHTML('afterbegin', '<div style="padding:16px;color:#c00;font-family:sans-serif">Nepodarilo sa načítať appku. Skús obnoviť stránku.</div>');
});
