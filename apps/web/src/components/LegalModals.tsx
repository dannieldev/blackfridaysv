import { useId, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { Dialog } from './Dialog';

export type LegalModalType = 'terminos' | 'metodologia' | 'privacidad' | null;

interface LegalModalsProps {
  type: LegalModalType;
  onClose: () => void;
  onSelectTab: (tab: Exclude<LegalModalType, null>) => void;
}

const tabs = [
  { id: 'metodologia', label: 'Cómo comparamos' },
  { id: 'terminos', label: 'Información legal' },
  { id: 'privacidad', label: 'Privacidad' },
] as const;

export function LegalModals({ type, onClose, onSelectTab }: LegalModalsProps) {
  const id = useId();
  if (!type) return null;

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex = index;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index + tabs.length - 1) % tabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabs.length - 1;
    else return;
    event.preventDefault();
    onSelectTab(tabs[nextIndex].id);
    document.getElementById(`${id}-tab-${tabs[nextIndex].id}`)?.focus();
  }

  return (
    <Dialog onClose={onClose} labelledBy={`${id}-title`} className="legal-modal">
      <header className="modal-header">
        <div>
          <h2 id={`${id}-title`} tabIndex={-1} autoFocus>La información detrás del precio</h2>
        </div>
        <button type="button" className="icon-button modal-close" onClick={onClose} aria-label="Cerrar información">
          <X size={20} aria-hidden="true" />
        </button>
      </header>

      <div className="legal-tabs" role="tablist" aria-label="Información del sitio">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            type="button"
            id={`${id}-tab-${tab.id}`}
            role="tab"
            aria-selected={type === tab.id}
            aria-controls={`${id}-panel`}
            tabIndex={type === tab.id ? 0 : -1}
            onClick={() => onSelectTab(tab.id)}
            onKeyDown={(event) => handleTabKey(event, index)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="modal-body legal-content" id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${type}`} tabIndex={0}>
        {type === 'metodologia' && (
          <>
            <section>
              <h3>Precio de tienda y precio observado</h3>
              <p>Recopilamos precios publicados por las tiendas. El precio actual es el de la última consulta disponible; puede cambiar antes de tu compra. Un precio tachado es una referencia anunciada por la tienda, no una prueba de lo que costaba antes.</p>
            </section>
            <section>
              <h3>El historial necesita registros</h3>
              <p>Mostramos una gráfica con capturas de al menos dos días distintos, dentro de los últimos 90 días. Si faltan registros, lo indicamos. El mínimo se limita al periodo observado y a esa tienda. No completamos las curvas con precios estimados ni usamos un descuento anunciado como prueba de un mínimo histórico.</p>
            </section>
            <section>
              <h3>Comparamos el mismo modelo</h3>
              <p>La comparación entre tiendas utiliza el código de modelo del fabricante cuando está disponible. Antes de comprar, confirma capacidad, tamaño, color, accesorios y garantía: dos títulos parecidos pueden corresponder a versiones diferentes.</p>
            </section>
            <section>
              <h3>Las señales orientan tu decisión</h3>
              <p>Verde: el precio bajó al menos 10% frente a uno registrado en dos días anteriores de los últimos 30 y es el mínimo del periodo observado. Amarillo: hay historial suficiente, pero no una diferencia destacada. Rojo: cuesta al menos 10% más que un precio anterior repetido, o hay una alternativa reciente del mismo modelo al menos 10% más barata.</p>
              <p>Para asignar color necesitamos una captura de las últimas 24 horas. Usamos gris si faltan datos suficientes o el producto está agotado. En moda y calzado seguimos la talla y el vendedor indicados; no comparamos prendas de tallas diferentes como si fueran el mismo producto.</p>
              <p>Las etiquetas resumen la comparación con los datos disponibles. Una diferencia entre precios es una señal para revisar, no una resolución sobre la conducta de una tienda. El envío, las condiciones de pago y la disponibilidad también pueden cambiar el costo final.</p>
            </section>
          </>
        )}

        {type === 'terminos' && (
          <>
            <section>
              <h3>Un comparador independiente</h3>
              <p>Black Friday SV te ayuda a consultar y comparar ofertas en El Salvador. No es una tienda ni una entidad pública. Los nombres e imágenes de productos identifican las ofertas de sus respectivos comercios.</p>
            </section>
            <section>
              <h3>Antes de comprar</h3>
              <p>Revisa el precio final, las existencias, el costo de envío, la garantía y las condiciones de la promoción en el sitio de la tienda. La compra y el pago se realizan directamente con ese comercio.</p>
            </section>
            <section>
              <h3>Tus derechos como consumidor</h3>
              <p>La Ley de Protección al Consumidor regula la información de promociones y la publicidad engañosa. Puedes consultar el texto y sus reformas en la Defensoría del Consumidor.</p>
              <p>El artículo 31 aborda la publicidad ilícita, engañosa o falsa. El artículo 32 trata la información sobre bienes con deficiencias, usados o reconstruidos; no establece una regla de comparación de precios a 30 días.</p>
              <a href="https://www.defensoria.gob.sv/servicios/ley-de-proteccion-al-consumidor/" target="_blank" rel="noopener noreferrer">Consultar la Ley de Protección al Consumidor (abre otra pestaña)</a>
            </section>
            <section>
              <h3>Si una promoción no se cumple</h3>
              <p>Guarda la publicidad, la fecha y el comprobante de compra. El Observatorio de la Defensoría explica cómo presentar un aviso o una denuncia según tu situación.</p>
              <a href="https://www.defensoria.gob.sv/servicios/observatorio-publicidad/" target="_blank" rel="noopener noreferrer">Ir al Observatorio de Publicidad (abre otra pestaña)</a>
            </section>
          </>
        )}

        {type === 'privacidad' && (
          <>
            <section>
              <h3>Suscripción y alertas por correo</h3>
              <p>Si solicitas avisos, guardamos tu correo, las categorías y el presupuesto que elijas, los productos y precios objetivo, y la fecha y versión de tu consentimiento. Sólo activamos los avisos después de que confirmas el correo. Una alerta de producto no te suscribe al resumen general salvo que selecciones esa opción.</p>
              <p>Los datos se almacenan en Supabase con acceso privado del servidor. Resend procesa tu dirección y el contenido de los mensajes para enviarlos. La lista de suscriptores no forma parte del catálogo público.</p>
              <p>Cada resumen incluye la baja de todos tus avisos, sin iniciar sesión. Conservamos el registro de baja para respetar tu elección. La limpieza del sistema elimina las solicitudes de confirmación con más de siete días y los registros de envío con más de noventa días. Para solicitar la eliminación de tu correo, escribe a <a href="mailto:Danielcrespin.dev@gmail.com">Danielcrespin.dev@gmail.com</a>.</p>
            </section>
            <section>
              <h3>Tus guardados, en este navegador</h3>
              <p>Usamos el almacenamiento local del navegador (localStorage) para recordar los productos que guardas. No necesitas crear una cuenta. La lista no se sincroniza automáticamente entre dispositivos y se pierde si borras los datos del sitio.</p>
            </section>
            <section>
              <h3>Las conexiones del sitio</h3>
              <p>Tu navegador solicita el catálogo y las imágenes necesarias para mostrar las ofertas. Algunas imágenes proceden de los servidores de las tiendas. Esos servicios reciben los datos técnicos habituales de una conexión, como la dirección IP; por eso no prometemos anonimato absoluto.</p>
            </section>
            <section>
              <h3>Al visitar una tienda</h3>
              <p>Los enlaces de productos abren el sitio del comercio. Allí se aplican sus propias políticas de privacidad y de cookies. Black Friday SV no recibe los datos de pago que introduzcas en esas tiendas.</p>
            </section>
            <section>
              <h3>Cómo borrar tus guardados</h3>
              <p>Puedes retirar cada producto desde Guardados o borrar los datos de Black Friday SV en la configuración de tu navegador.</p>
            </section>
          </>
        )}
      </div>
    </Dialog>
  );
}
