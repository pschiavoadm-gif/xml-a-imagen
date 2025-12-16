import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Download, Play, Layers, Image as ImageIcon, RefreshCw, Settings, Search, AlertCircle, AlertTriangle, CreditCard, ShoppingBag, Link as LinkIcon } from 'lucide-react';

// --- Types ---

interface Product {
  id: string;
  name: string;
  price: number;
  listPrice: number;
  imageUrl: string;
  installments: number; // e.g., 12, 6, 3
  freeShipping: boolean;
  sku: string;
  // New fields for specific badges seen in image
  bankPromo?: string; // e.g. "10% OFF 1 PAGO"
  pickup?: boolean;   // e.g. "RETIRO GRATIS"
}

// --- Constants & Styles ---

const COLORS = {
  pardoBlue: '#0033A0',
  orangeBadge: '#FF6600',
  debitBadge: '#0055FF',
  pickupBadge: '#B3D4FC', // Light blue
  priceColor: '#FF6600',
  frameText: '#FFFF00'
};

const DEMO_PRODUCT: Product = {
  id: 'demo-lg-86',
  name: 'Smart TV 86” UHD 4K Qned LG 86QNED85SQA',
  price: 6199999,
  listPrice: 0,
  imageUrl: 'https://images.fravega.com/f500/1d04400f0896024927500589d8544d65.jpg', // High quality TV image
  installments: 12,
  freeShipping: false,
  pickup: true,
  sku: '86QNED85SQA',
  bankPromo: '10% OFF 1 PAGO DÉBITO'
};

const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    overflow: 'hidden',
    fontFamily: 'Roboto, sans-serif'
  },
  sidebar: {
    width: '350px',
    backgroundColor: '#fff',
    borderRight: '1px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column' as const,
    zIndex: 10,
  },
  main: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    padding: '2rem',
    overflowY: 'auto' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
  },
  header: {
    padding: '1.5rem',
    borderBottom: '1px solid #e0e0e0',
    backgroundColor: COLORS.pardoBlue,
    color: 'white',
  },
  productList: {
    flex: 1,
    overflowY: 'auto' as const,
  },
  productItem: {
    padding: '1rem',
    borderBottom: '1px solid #f0f0f0',
    cursor: 'pointer',
    transition: 'background 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  activeItem: {
    backgroundColor: '#e6f0ff',
    borderLeft: `4px solid ${COLORS.pardoBlue}`,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    padding: '2rem',
    marginBottom: '2rem',
    maxWidth: '1100px',
    width: '100%',
    display: 'flex',
    gap: '2rem',
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
  },
  canvasContainer: {
    width: '500px',
    height: '500px',
    border: '1px solid #ccc',
    backgroundColor: '#fff',
    position: 'relative' as const,
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  },
  controls: {
    flex: 1,
    minWidth: '300px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },
  button: {
    padding: '0.75rem 1.5rem',
    backgroundColor: COLORS.pardoBlue,
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    fontWeight: 'bold' as const,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    transition: 'background 0.2s',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    border: `1px solid ${COLORS.pardoBlue}`,
    color: COLORS.pardoBlue,
  },
  input: {
    padding: '0.5rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
    width: '100%',
    marginBottom: '0.5rem'
  },
  label: {
    fontWeight: 'bold' as const,
    marginBottom: '0.5rem',
    display: 'block',
    fontSize: '0.9rem',
    color: '#555',
  },
  badgeOption: {
    display: 'flex', 
    alignItems: 'center', 
    gap: '10px', 
    padding: '8px', 
    backgroundColor: '#f8f9fa', 
    borderRadius: '4px',
    marginBottom: '5px'
  }
};

// --- Helper Functions ---

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(price);
};

// Helper to determine XML URL
const getXmlUrl = (input: string) => {
    const trimmed = input.trim();
    // If user enters just numbers (e.g. 1629), construct the Pardo URL
    if (/^\d+$/.test(trimmed)) {
        return `https://www.pardo.com.ar/XMLData/cluster${trimmed}.xml`;
    }
    // Otherwise assume it is a full URL
    return trimmed;
};

// --- Main Application ---

function App() {
  const [products, setProducts] = useState<Product[]>([DEMO_PRODUCT]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(DEMO_PRODUCT);
  const [processing, setProcessing] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Data Fetching State
  const [clusterInput, setClusterInput] = useState('https://www.pardo.com.ar/XMLData/cluster1629.xml');
  const [loadingData, setLoadingData] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Configuration State
  const [frameColor, setFrameColor] = useState(COLORS.pardoBlue);
  const [showPrice, setShowPrice] = useState(true);
  const [showBadges, setShowBadges] = useState(true);
  const [customBankText, setCustomBankText] = useState('10% OFF 1 PAGO Débito');

  // --- Data Fetching Logic (XML) ---
  
  const fetchClusterData = async () => {
    const targetUrl = getXmlUrl(clusterInput);
    if (!targetUrl) return;
    
    setLoadingData(true);
    setErrorMsg(null);
    setProducts([]); 
    setSelectedProduct(null);

    try {
      let xmlText = null;
      let lastError = null;
      let successSource = '';

      // Strategies: AllOrigins Raw -> CORSProxy -> AllOrigins Wrapped
      // For XML, Raw is best. Wrapped requires unpacking 'contents'.
      const strategies = [
        { name: 'AllOrigins Raw', url: `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}` },
        { name: 'CORSProxy', url: `https://corsproxy.io/?${encodeURIComponent(targetUrl)}` },
        { name: 'AllOrigins Wrapped', url: `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`, isWrapped: true }
      ];

      for (const strat of strategies) {
        if (xmlText) break;
        try {
            console.log(`Intentando XML vía ${strat.name}...`);
            const res = await fetch(strat.url);
            if (res.ok) {
                if (strat.isWrapped) {
                    const json = await res.json();
                    xmlText = json.contents;
                } else {
                    xmlText = await res.text();
                }
                successSource = strat.name;
            }
        } catch (e) {
            console.warn(`${strat.name} failed:`, e);
            lastError = e;
        }
      }

      if (!xmlText) {
        throw new Error("No se pudo obtener el XML. Verifique la URL o intente más tarde.");
      }

      // 1. Check for Proxy HTML Errors (Common issue)
      if (xmlText.trim().toLowerCase().startsWith('<!doctype html') || xmlText.includes('<html')) {
          console.warn("Proxy returned HTML instead of XML:", xmlText.substring(0, 100));
          throw new Error(`El proxy (${successSource}) devolvió una página HTML en vez de XML. Puede que la URL esté bloqueada o sea inválida.`);
      }
      
      console.log(`XML obtenido exitosamente vía ${successSource}`);

      // Parse XML
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      
      // Handle parsing errors
      const parseError = xmlDoc.getElementsByTagName("parsererror");
      if (parseError.length > 0) {
          throw new Error("Error al procesar el formato XML. El archivo podría estar corrupto.");
      }

      // Find items - Expanded Tag Search
      let items = Array.from(xmlDoc.getElementsByTagName('item'));
      if (items.length === 0) items = Array.from(xmlDoc.getElementsByTagName('entry'));
      if (items.length === 0) items = Array.from(xmlDoc.getElementsByTagName('product'));
      
      if (items.length === 0) {
          console.warn("XML Content Preview:", xmlText.substring(0, 300));
          throw new Error("El XML no contiene productos (se buscaron etiquetas <item>, <entry>, <product>).");
      }

      // Map XML Data
      const mappedProducts: Product[] = items.map((item) => {
        
        // Helper to get element text safely, trying multiple variants
        const getText = (tags: string[]) => {
            for (const t of tags) {
                // Try direct child
                let el = item.getElementsByTagName(t)[0];
                if (el && el.textContent) return el.textContent.trim();
                
                // Try namespaced child (g:tag)
                el = item.getElementsByTagName(`g:${t}`)[0];
                if (el && el.textContent) return el.textContent.trim();

                // Try common namespace variants if browser parser struggles
                el = item.getElementsByTagName(`ns:${t}`)[0];
                if (el && el.textContent) return el.textContent.trim();
            }
            return '';
        };

        const title = getText(['title', 'name']);
        const id = getText(['id', 'sku', 'g:id']);
        const rawPrice = getText(['price', 'g:price']); // e.g. "6199999 ARS"
        const rawSalePrice = getText(['sale_price', 'g:sale_price']);
        const rawImage = getText(['image_link', 'g:image_link']);
        
        // Installments parsing
        let installments = 1;
        // Try standard Google Shopping nested <g:installment>
        const installmentNode = item.getElementsByTagName('g:installment')[0] || item.getElementsByTagName('installment')[0];
        if (installmentNode) {
            const months = installmentNode.getElementsByTagName('g:months')[0]?.textContent || installmentNode.getElementsByTagName('months')[0]?.textContent;
            if (months) installments = parseInt(months, 10);
        } else {
             // Sometimes strictly in attributes or other fields?
             // Fallback: check "installment" text field if flat structure
             const instText = getText(['installment', 'installments']);
             if(instText) {
                 const match = instText.match(/(\d+)/);
                 if (match) installments = parseInt(match[1], 10);
             }
        }

        // Clean Price
        const parsePrice = (p: string) => {
            if (!p) return 0;
            // Remove 'ARS', '$', spaces
            const clean = p.replace(/[^\d.,]/g, '').replace(',', '.'); 
            return parseFloat(clean);
        };

        const price = rawSalePrice ? parsePrice(rawSalePrice) : parsePrice(rawPrice);
        const listPrice = rawSalePrice && rawPrice ? parsePrice(rawPrice) : 0;

        // Image Proxy
        const cleanImage = rawImage.split('?')[0]; 
        const proxyImage = cleanImage ? `https://wsrv.nl/?url=${encodeURIComponent(cleanImage)}&output=jpg&w=1000&h=1000` : '';

        return {
            id: id || Math.random().toString(36),
            name: title || "Sin Nombre",
            price: price,
            listPrice: listPrice,
            imageUrl: proxyImage,
            installments: installments,
            freeShipping: price > 100000, 
            sku: id || 'N/A',
            pickup: true, // Default
            bankPromo: '' 
        };
      });

      // Filter empty products if any
      const validProducts = mappedProducts.filter(p => p.price > 0 || p.name !== "Sin Nombre");
      
      setProducts(validProducts);
      if (validProducts.length > 0) {
        setSelectedProduct(validProducts[0]);
      } else {
         throw new Error("Se encontraron items pero no se pudo extraer información válida (precios/nombres).");
      }

    } catch (e: any) {
      console.error("XML Fetch Error:", e);
      setErrorMsg(e.message || "Error desconocido");
    } finally {
      setLoadingData(false);
    }
  };

  // --- Image Generation Logic ---

  const drawProduct = async (product: Product, canvas: HTMLCanvasElement, download = false) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas Setup
    const WIDTH = 1000;
    const HEIGHT = 1000;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    // 1. Background (White)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Frame Config
    const frameTop = 130;
    const frameBottom = 130;
    const frameSide = 0; // The screenshot shows the product full width sometimes, but let's keep it clean
    const safeAreaTop = frameTop;
    const safeAreaHeight = HEIGHT - frameTop - frameBottom;

    // 2. Product Image
    try {
      const img = new Image();
      img.crossOrigin = "Anonymous"; 
      img.src = product.imageUrl;
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Load failed'));
      });

      // Calculate fit
      const padding = 20; 
      const maxImgH = safeAreaHeight - 140; // Leave room for price at bottom
      const maxImgW = WIDTH - (padding * 2);

      const scale = Math.min(maxImgW / img.width, maxImgH / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      
      // Center vertically in the top portion of safe area
      const x = (WIDTH - drawW) / 2;
      const y = safeAreaTop + 40; // Small top padding inside safe area

      ctx.drawImage(img, x, y, drawW, drawH);

    } catch (e) {
      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(100, safeAreaTop, 800, safeAreaHeight);
      ctx.fillStyle = '#ccc';
      ctx.font = '30px Roboto';
      ctx.textAlign = 'center';
      ctx.fillText("Sin Imagen", 500, 500);
    }

    // 3. Badges (Cucardas) - Drawing strictly OVER image but UNDER frame (logically)
    // Actually, visually they should be on top of everything inside the hole.
    if (showBadges) {
        const badgeY = safeAreaTop + 20;
        let leftBadgeY = badgeY;
        let rightBadgeY = badgeY;

        // --- Bank / Promo Badge (Left) ---
        // Style: Dark Blue box "10% OFF" + Light Blue "1 PAGO Débito"
        const promoText = product.bankPromo || customBankText;
        if (promoText) {
            ctx.fillStyle = COLORS.debitBadge;
            // Rounded rect for badge
            roundRect(ctx, 30, leftBadgeY, 280, 80, 10);
            ctx.fill();
            
            // Text logic to split "10% OFF" and "1 PAGO..."
            ctx.fillStyle = 'white';
            ctx.font = '900 36px Roboto'; // Extra Bold
            ctx.textAlign = 'center';
            ctx.fillText("10% OFF", 30 + 140, leftBadgeY + 40);
            
            ctx.font = '400 18px Roboto';
            ctx.fillText("1 PAGO Débito", 30 + 140, leftBadgeY + 65);
            
            leftBadgeY += 90;
        }

        // --- Installments Badge (Right) ---
        // Style: Orange box. "12" Big, "SIN INTERÉS" small side.
        if (product.installments > 1) {
             const badgeW = 260;
             const badgeH = 70;
             const badgeX = WIDTH - badgeW - 30;
             
             ctx.fillStyle = COLORS.orangeBadge;
             roundRect(ctx, badgeX, rightBadgeY, badgeW, badgeH, 10);
             ctx.fill();

             // "12"
             ctx.fillStyle = 'white';
             ctx.font = '900 50px Roboto';
             ctx.textAlign = 'left';
             ctx.textBaseline = 'middle';
             ctx.fillText(product.installments.toString(), badgeX + 15, rightBadgeY + (badgeH/2) + 2);
             
             // "SIN INTERÉS" (Stacked)
             ctx.font = '700 20px Roboto';
             ctx.fillText("SIN", badgeX + 80, rightBadgeY + 25);
             ctx.fillText("INTERÉS", badgeX + 80, rightBadgeY + 48);
             
             rightBadgeY += 80;
        }

        // --- Free Pickup Badge (Right, below installments) ---
        // Style: Light blue pill
        if (product.pickup) {
            const badgeW = 260;
            const badgeH = 40;
            const badgeX = WIDTH - badgeW - 30;
            
            ctx.fillStyle = COLORS.pickupBadge;
            roundRect(ctx, badgeX, rightBadgeY, badgeW, badgeH, 20); // More rounded
            ctx.fill();
            
            ctx.fillStyle = '#004488'; // Dark blue text
            ctx.font = '700 20px Roboto';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText("¡RETIRO GRATIS!", badgeX + (badgeW/2), rightBadgeY + (badgeH/2) + 2);
        }
    }

    // 4. Price (Orange, Centered at bottom of Safe Area)
    if (showPrice) {
        const priceY = HEIGHT - frameBottom - 30;
        
        // Main Price
        ctx.fillStyle = COLORS.priceColor;
        ctx.font = '900 110px Roboto';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        // Add Tracking/Kerning tight
        ctx.fillText(formatPrice(product.price), WIDTH / 2, priceY);
        
        // "Precio sin impuestos" small below? Or "Hasta 12x..."
        // The image shows installments text ABOVE price sometimes or large price then details.
        // Let's add the Installment text calculation above the price like the web.
        if (product.installments > 1) {
            const installmentVal = product.price / product.installments;
            const instText = `Hasta ${product.installments}x ${formatPrice(installmentVal)} cuotas sin interés`;
            
            ctx.fillStyle = COLORS.orangeBadge;
            ctx.font = '700 32px Roboto';
            ctx.textBaseline = 'bottom';
            ctx.fillText(instText, WIDTH / 2, priceY - 110);
        }
    }

    // 5. Frame (Overlay)
    // "Sumar un marco... dejando un hueco en el medio"
    // We draw the Blue bars over everything at the edges.
    ctx.fillStyle = frameColor;
    ctx.fillRect(0, 0, WIDTH, frameTop); // Top Bar
    ctx.fillRect(0, HEIGHT - frameBottom, WIDTH, frameBottom); // Bottom Bar
    // Optional side bars if "Frame" implies 4 sides. The image implies top/bottom heavy.
    // Let's add thin side bars to complete "Marco" feel.
    ctx.fillRect(0, 0, 30, HEIGHT); // Left
    ctx.fillRect(WIDTH - 30, 0, 30, HEIGHT); // Right

    // Logo Text in Top Frame
    ctx.fillStyle = COLORS.frameText;
    ctx.font = '900 80px Roboto';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText("PARDO", WIDTH / 2, frameTop / 2);
    
    // Bottom Bar Text (Optional, usually URL or slogan)
    ctx.font = '700 30px Roboto';
    ctx.fillText("WWW.PARDO.COM.AR", WIDTH / 2, HEIGHT - (frameBottom / 2));


    // 6. Download Trigger
    if (download) {
      const link = document.createElement('a');
      link.download = `pardo_${product.sku}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
    }
  };

  // Helper for rounded rects
  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  // Re-draw on changes
  useEffect(() => {
    if (canvasRef.current && selectedProduct) {
      drawProduct(selectedProduct, canvasRef.current);
    }
  }, [selectedProduct, frameColor, showPrice, showBadges, customBankText]);

  // --- Batch Processing ---

  const runBatchProcess = async () => {
    if (!canvasRef.current) return;
    setProcessing(true);
    setGeneratedCount(0);

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      setSelectedProduct(p);
      await new Promise(r => setTimeout(r, 600));
      await drawProduct(p, canvasRef.current, true);
      setGeneratedCount(prev => prev + 1);
      await new Promise(r => setTimeout(r, 500));
    }
    setProcessing(false);
    alert("Proceso finalizado.");
  };

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers size={24} />
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Generador Pardo</h2>
          </div>
          <p style={{ margin: '5px 0 0 0', opacity: 0.8, fontSize: '0.8rem' }}>Automatización v2.0</p>
        </div>

        {/* Cluster Input Section */}
        <div style={{ padding: '1rem', borderBottom: '1px solid #e0e0e0', backgroundColor: '#f9fafb' }}>
            <label style={styles.label}>URL XML o ID Cluster</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                    type="text" 
                    placeholder="Ej: 1629 o https://..."
                    value={clusterInput}
                    onChange={(e) => setClusterInput(e.target.value)}
                    style={styles.input}
                    onKeyDown={(e) => e.key === 'Enter' && fetchClusterData()}
                />
                <button 
                    style={{...styles.button, padding: '0 1rem', marginBottom: '0.5rem'}}
                    onClick={fetchClusterData}
                    disabled={loadingData}
                >
                    {loadingData ? <RefreshCw className="spin" size={16} /> : <Search size={16} />}
                </button>
            </div>
            {errorMsg && (
                 <div style={{ fontSize: '0.8rem', color: '#d32f2f', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px' }}>
                    <AlertTriangle size={14} /> {errorMsg}
                 </div>
            )}
            <div style={{display:'flex', gap:'5px', marginTop: '10px'}}>
                 <button 
                  onClick={() => { setSelectedProduct(DEMO_PRODUCT); setProducts([DEMO_PRODUCT]); }}
                  style={{...styles.secondaryButton, fontSize: '0.75rem', padding: '5px', width:'100%'}}
                 >
                   Cargar Demo (Imagen Referencia)
                 </button>
            </div>
             <div style={{ fontSize: '0.7rem', color: '#666', lineHeight: '1.3', marginTop: '10px', display:'flex', alignItems:'center', gap:'4px' }}>
                <LinkIcon size={12}/> Fuente: XML de Pardo (Google Shopping fmt)
            </div>
        </div>
        
        <div style={styles.productList}>
           {products.length === 0 && !loadingData && (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
                  Sin productos. Ingrese una URL de XML válida.
              </div>
          )}
          {loadingData && (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                  <RefreshCw className="spin" size={24} style={{ marginBottom: '10px' }}/>
                  <div>Procesando XML...</div>
              </div>
          )}
          {products.map(p => (
            <div 
              key={p.id}
              style={{
                ...styles.productItem,
                ...(selectedProduct?.id === p.id ? styles.activeItem : {})
              }}
              onClick={() => setSelectedProduct(p)}
            >
              <img src={p.imageUrl} alt="" style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '4px', backgroundColor: '#fff', border:'1px solid #eee' }} />
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                <div style={{ fontSize: '0.8rem', color: '#666' }}>{p.sku} | ${p.price.toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
        
        <div style={{ padding: '1rem', borderTop: '1px solid #e0e0e0' }}>
          <button 
            style={{...styles.button, width: '100%', backgroundColor: processing ? '#ccc' : COLORS.pardoBlue}} 
            onClick={runBatchProcess}
            disabled={processing || products.length === 0}
          >
            {processing ? <RefreshCw className="spin" size={20} /> : <Play size={20} />}
            {processing ? `Generando ${generatedCount}/${products.length}...` : 'Procesar Todo Auto'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.main}>
        <div style={{ width: '100%', maxWidth: '1100px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ImageIcon /> Vista Previa
          </h1>
          <div style={{ display: 'flex', gap: '1rem' }}>
             {selectedProduct && (
                <button 
                style={{...styles.button, ...styles.secondaryButton}} 
                onClick={() => drawProduct(selectedProduct, canvasRef.current!, true)}
                >
                <Download size={18} /> Descargar Actual
                </button>
             )}
          </div>
        </div>

        <div style={styles.card}>
          {/* Canvas Preview */}
          <div>
            <div style={{ marginBottom: '0.5rem', fontWeight: 'bold', color: '#666' }}>Canvas 1000x1000px Output</div>
            <div style={styles.canvasContainer}>
              <canvas 
                ref={canvasRef} 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
          </div>

          {/* Controls */}
          <div style={styles.controls}>
            <div style={{ borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
              <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={18} /> Personalización
              </h3>
              
              <div style={styles.badgeOption}>
                   <input type="checkbox" checked={showBadges} onChange={e => setShowBadges(e.target.checked)} />
                   <div style={{flex:1}}>
                      <strong>Mostrar Cucardas</strong>
                      <div style={{fontSize:'0.8rem', color:'#666'}}>Cuotas, Envío, Banco</div>
                   </div>
                   <CreditCard size={18} color="#666" />
              </div>

              <div style={styles.badgeOption}>
                   <input type="checkbox" checked={showPrice} onChange={e => setShowPrice(e.target.checked)} />
                   <div style={{flex:1}}>
                      <strong>Sobreimprimir Precio</strong>
                      <div style={{fontSize:'0.8rem', color:'#666'}}>Estilo Naranja Pardo</div>
                   </div>
                   <ShoppingBag size={18} color="#666" />
              </div>

              <div style={{ marginTop: '1rem' }}>
                 <label style={styles.label}>Texto Promoción Banco</label>
                 <input 
                    type="text" 
                    value={customBankText} 
                    onChange={e => setCustomBankText(e.target.value)}
                    style={styles.input}
                    placeholder="Ej: 10% OFF 1 PAGO"
                 />
                 <div style={{fontSize:'0.75rem', color:'#888'}}>
                   Aparece en la cucarda azul superior izquierda.
                 </div>
              </div>
            </div>

            {selectedProduct ? (
                <>
                <div style={{ backgroundColor: '#eef2ff', padding: '1rem', borderRadius: '4px', marginTop: '1rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: COLORS.pardoBlue }}>Datos del Producto (XML)</h4>
                <div style={{ fontSize: '0.9rem', display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                    <div style={{display:'flex', justifyContent:'space-between'}}><strong>SKU:</strong> <span>{selectedProduct.sku}</span></div>
                    <div style={{display:'flex', justifyContent:'space-between'}}><strong>Precio:</strong> <span>{formatPrice(selectedProduct.price)}</span></div>
                    <div style={{display:'flex', justifyContent:'space-between'}}><strong>Cuotas:</strong> <span>{selectedProduct.installments} sin interés</span></div>
                    <div style={{display:'flex', justifyContent:'space-between'}}><strong>Envío:</strong> <span>{selectedProduct.pickup ? 'Retiro Gratis' : 'Normal'}</span></div>
                </div>
                </div>
                </>
            ) : (
                <div style={{ fontStyle: 'italic', color: '#888', marginTop:'1rem' }}>Seleccione un producto.</div>
            )}
          </div>
        </div>
      </div>
      
      {/* CSS for Spinner */}
      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);